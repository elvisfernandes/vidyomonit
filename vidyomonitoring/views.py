# -*- coding: utf-8 -*-
##
##
## This file is part of the CERN Dashboards and Monitoring for Vidyo
## Copyright (C) 2014 European Organization for Nuclear Research (CERN)
##
## CERN Dashboards and Monitoring for Vidyo is free software: you can redistribute it and/or
## modify it under the terms of the GNU Affero General Public License as
## published by the Free Software Foundation, either version 3 of the
## License, or (at your option) any later version.
##
## CERN Dashboards and Monitoring for Vidyo is distributed in the hope that it will be useful, but
## WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
## GNU General Public License for more details.
##
## You should have received a copy of the GNU Affero General Public License
## along with the CERN Dashboards and Monitoring for Vidyo software.  If not, see <http://www.gnu.org/licenses/>.

# View functions.

from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden, HttpResponseBadRequest
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.exceptions import ObjectDoesNotExist
from django.utils import simplejson
from django.shortcuts import render_to_response
from django.shortcuts import redirect
from django.template import loader, Context
from django.db.models import Q

from application import models
from application import utils
from application import settings
from application import permissions
from application import conf
from application.utils import json_response
from application.change_hosts import changeHosts

import datetime
from dateutil.relativedelta import relativedelta
import operator
import logging
logger = logging.getLogger('django')


def index(request):
    error = None
    try:
        portal = models.main_portal.objects.all()[0]
    except:
        error = "Set main portal on Configuration tab to get all monitoring data."
    context = {'error': error}
    return render_to_response("index.html", context)


@csrf_exempt
def token_generate(request):
    username = request.POST.get('username', None)
    password = request.POST.get('password', None)
    if not username or not password:
        response = HttpResponseForbidden()
    user = authenticate(username=username, password=password)
    if user is not None:
        # the password verified for the user
        if user.is_active:
            token_text = utils.tokenGenerator(size=100)
            validity = datetime.datetime.now() + datetime.timedelta(minutes=30)
            token = models.auth_token(token=token_text, validity=validity)
            token.save()
            tokens = models.auth_token.objects.all()
            toDelete = []
            for t in tokens:
                now = datetime.datetime.now()
                if t.validity < now:
                    toDelete.append(t)
            for t in toDelete:
                t.delete()
            return HttpResponse(token_text)
        else:
            response = HttpResponseForbidden()
    else:
        response = HttpResponseForbidden()
    response['Access-Control-Allow-Origin'] = '*'
    return response


@csrf_exempt
@permissions.is_logged_in
def vidyoRooms(request):
    sql = "SELECT username FROM Member, MemberRole WHERE Member.roleID = MemberRole.roleID AND roleName in ('VidyoRoom', 'VidyoPanorama')"
    results = utils.perform_select_mysql(sql)
    response = []
    for row in results:
        response.append("'"+row[0]+"'")
    response_req = HttpResponse(','.join(response))
    response_req["Access-Control-Allow-Origin"] = "*"
    return response_req


@csrf_exempt
@permissions.is_logged_in
def mintesInCoferences(request):
    start_date = request.POST.get('start_date', None)
    end_date = request.POST.get('end_date', None)
    if not start_date or not end_date:
        return HttpResponseForbidden()

    start_dt = datetime.datetime.strptime(start_date[:10], '%Y-%m-%d')
    end_dt = datetime.datetime.strptime(end_date[:10], '%Y-%m-%d')

    response = []

    # Fetch calls with more than one participant
    prelim_query = 'SELECT UniqueCallID FROM ConferenceCall2 GROUP BY UniqueCallID HAVING count(*) > 1'
    prelim_result = utils.perform_select_mysql(prelim_query)
    call_ids = set(r[0] for r in prelim_result)

    query = """SELECT UniqueCallID, CallerName, JoinTime, LeaveTime
        FROM ConferenceCall2
        WHERE CallState='COMPLETED'
        AND LeaveTime > %s
        AND JoinTime < %s
        ORDER BY JoinTime ASC;
    """

    results = utils.perform_select_mysql(query, (start_dt, end_dt))

    calls = dict()
    for call_id, caller_name, join_time, leave_time in results:
        if not call_id in calls:
            calls[call_id] = {'participants': set(), 'seconds': 0, 'date': join_time}

        try:
            leave_time = leave_time or end_dt
            duration = min(leave_time, end_dt) - max(join_time, start_dt)
        except TypeError:
            continue  # dates can sometimes be null

        calls[call_id]['seconds'] += duration.seconds + duration.days * 24 * 3600
        calls[call_id]['participants'].add(caller_name)
        calls[call_id]['date'] = min(calls[call_id]['date'], join_time)

    filtered_calls = dict([(k, v) for k, v in calls.iteritems() if k in call_ids])

    response = []
    for call_id, stats in filtered_calls.iteritems():
        response.append({
            'conference': call_id,
            'minutes': stats['seconds'] / 60,
            'date': str(stats['date'])
        })

    response_req = HttpResponse(simplejson.dumps(sorted(response, key=operator.itemgetter('date'))), content_type="application/json")
    response_req["Access-Control-Allow-Origin"] = "*"
    return response_req


@csrf_exempt
@permissions.is_logged_in
def get_device_history(request, device_type, hostname, service, period='hour'):
    try:
        db_host = models.Hosts.objects.get(hostname=hostname)
    except models.Hosts.DoesNotExist:
        return HttpResponseNotFound("Host not found")

    period = period.lower() if period else 'hour'

    query_filter = Q(host=db_host)
    objs = dict(
        basic=models.BasicStatus.objects.filter(query_filter),
        router=models.RouterSpecific.objects.filter(query_filter),
        gateway=models.GatewaySpecific.objects.filter(query_filter),
        portal=models.PortalSpecific.objects
    )[device_type.lower()]
    data = objs.order_by('-id')

    try:
        fields = utils.get_fields_by_service(service)
        if period == 'hour':
            to_return = utils.get_specific_fields_from_statuses(data[:12], fields)
        else:
            now = datetime.datetime.now()
            if period == 'day':
                end_date = datetime.datetime(now.year, now.month, now.day, now.hour)
                period_delta, interval = relativedelta(days=1), relativedelta(hours=1)
            elif period == 'month':
                end_date = datetime.datetime(now.year, now.month, now.day)
                period_delta, interval = relativedelta(months=1), relativedelta(days=1)
            elif period == 'year':
                end_date = datetime.datetime(now.year, now.month)
                period_delta, interval = relativedelta(years=1), relativedelta(months=1)
            else:
                return HttpResponseBadRequest('invalid period: ' + period)

            start_date = end_date - period_delta
            to_return = utils.get_field_avgs_from_statuses(data, fields, interval, start_date, end_date)

    except (KeyError, AttributeError):
        return HttpResponseNotFound('Service not found: ' + service)

    return json_response(to_return)


@csrf_exempt
@permissions.is_logged_in
def get_all_hosts(request):
    return get_all_hosts_internal(request)


@csrf_exempt
def get_all_hosts_internal(request, force_update=False):
    gateways_informations = None
    update = request.POST.get('update', False)
    if force_update:
        update = True
    try:
        gateways_informations = utils.getGWStatus()
    except:
        alert_body = "MySQL connection to the main portal failed."

    hosts_informations = utils.get_nagios_json('hosts')
    if hosts_informations == []:
        perform_alert = False
        alert_body = "Nagios proxy is down."
        try:
            last_alert = models.alert.objects.latest('datetime')
            now = datetime.datetime.now()
            diff = now - last_alert.datetime
            seconds = diff.days * 24 * 60 * 60 + diff.seconds
            if seconds > 15 * 60 and alert_body != last_alert.body:  # Every 15 minutes send an alert
                perform_alert = True
        except models.alert.DoesNotExist:
            perform_alert = True
        if perform_alert:
            # Save into alert
            alert = models.alert(body=alert_body)
            alert.save()
            utils.send_alert_email(alert_body)
        response = HttpResponse(status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return response
    hosts = []
    system_staus = 0
    for host in hosts_informations:
        label = ''
        sql_command = "SELECT ComponentType FROM NetworkElementConfiguration WHERE `IpAddress`=\'%s\'" % host[1]
        not_found = False
        try:
            db_host = models.Hosts.objects.filter(hostname=host[0]).get()
            if db_host.host_type:
                device_type_to_show = db_host.host_type
            else:
                not_found = True
            label = db_host.label
        except models.Hosts.DoesNotExist:
            not_found = True
        if not_found:
            device_type = utils.perform_select_mysql(sql_command)
            device_type_to_show = 'portal'
            for device in device_type:
                if device[0] == 'VidyoGateway':
                    device_type_to_show = 'gateway'
                    break
                elif device[0] == 'VidyoProxy' or device[0] == 'VidyoRouter':
                    device_type_to_show = 'router'
                else:
                    device_type_to_show = 'portal'
                    break
        row_services = utils.get_nagios_json('hosts/%s/services' % host[0])
        basic_services = utils.init_basic_services()
        for service in row_services:
            if service[1] not in settings.BASIC_SERVICES:
                continue
            if type(service[3]) == list and len(service[3]):
                service[3] = service[3][0]
            basic_services[service[1]] = {"status": service[2], "description": service[3]}
        if(device_type_to_show != 'router'):
            basic_services['UDP'] = {"status": 0, "description": ''}
        if(device_type_to_show != 'portal'):
            basic_services['HTTP'] = {"status": 0, "description": ''}
            basic_services['HTTPS'] = {"status": 0, "description": ''}
            basic_services['proc_VPServer'] = {"status": 0, "description": ''}
            basic_services['proc_VR2'] = {"status": 0, "description": ''}
            basic_services['proc_VidyoManager'] = {"status": 0, "description": ''}

        # update system status based on service status
        basic_status = utils.update_host_status(basic_services)
        if basic_status > host[2]:
            host[2] = basic_status
        specific_services = {}
        specific_status = 0
        if device_type_to_show == 'router':
            specific_services['Users'] = {}
            if gateways_informations is not None:
                specific_services['Users']['description'] = utils.get_users_number(host[1])
            else:
                specific_services['Users']['description'] = -1
            specific_services['Users']['status'] = 0
            specific_services['Users']['comment'] = ''
            if specific_services['Users']['description'] == -1 or specific_services['Users']['description'] > 100:
                specific_services['Users']['status'] = 1
                specific_services['Users']['comment'] = 'More than 100 users'
            if specific_status < specific_services['Users']['status']:
                specific_status = specific_services['Users']['status']
        if device_type_to_show == 'gateway':
            specific_services['h323'] = {}
            if gateways_informations is not None:
                specific_services['h323']['description'] = gateways_informations.get(host[1], -1)
            else:
                specific_services['h323']['description'] = -1
            specific_services['h323']['status'] = 0
            specific_services['h323']['comment'] = ''

            if specific_services['h323']['description'] == -1:
                specific_services['h323']['status'] = 1
                specific_services['h323']['comment'] = 'Cannot read cluster controller information'

            else:
                specific_services['h323']['description'] = specific_services['h323']['description']['h323_calls']
                if specific_services['h323']['description'] == -1:
                    specific_services['h323']['status'] = 1
                    specific_services['h323']['comment'] = 'Cannot read cluster controller information'
            if specific_status < specific_services['h323']['status']:
                specific_status = specific_services['h323']['status']

            specific_services['phone_connections'] = {}
            if gateways_informations is not None:
                specific_services['phone_connections']['description'] = gateways_informations.get(host[1], -1)
            else:
                specific_services['phone_connections']['description'] = -1
            specific_services['phone_connections']['status'] = 0
            if specific_services['phone_connections']['description'] == -1:
                specific_services['phone_connections']['status'] = 1
                specific_services['phone_connections']['comment'] = 'Cannot read cluster controller information'
            else:
                specific_services['phone_connections']['description'] = specific_services['phone_connections']['description']['voip_calls']
                if specific_services['phone_connections']['description'] == -1:
                    specific_services['phone_connections']['status'] = 1
                    specific_services['phone_connections']['comment'] = 'Cannot read cluster controller information'
            if specific_status < specific_services['phone_connections']['status']:
                specific_status = specific_services['phone_connections']['status']

        if device_type_to_show == 'portal':
            specific_services['number_of_users'] = {}
            if gateways_informations is not None:
                specific_services['number_of_users']['description'] = utils.getUsersNumber()
            else:
                specific_services['number_of_users']['description'] = -1
            specific_services['number_of_users']['status'] = 0
            if specific_services['number_of_users']['description'] == -1:
                specific_services['number_of_users']['status'] = 1
            if specific_status < specific_services['number_of_users']['status']:
                specific_status = specific_services['number_of_users']['status']
            specific_services['number_of_conferences'] = {}
            if gateways_informations is not None:
                specific_services['number_of_conferences']['description'] = utils.getConferanceNumber()
            else:
                specific_services['number_of_conferences']['description'] = -1
            specific_services['number_of_conferences']['status'] = 0
            if specific_services['number_of_conferences']['description'] == -1:
                specific_services['number_of_conferences']['status'] = 1
            if specific_status < specific_services['number_of_conferences']['status']:
                specific_status = specific_services['number_of_conferences']['status']
            specific_services['number_of_pools'] = {}
            if gateways_informations is not None:
                specific_services['number_of_pools']['description'] = utils.getPoolsNumber()
            else:
                specific_services['number_of_pools']['description'] = -1
            specific_services['number_of_pools']['status'] = 0
            if specific_services['number_of_pools']['description'] == -1:
                specific_services['number_of_pools']['status'] = 1
            if specific_status < specific_services['number_of_pools']['status']:
                specific_status = specific_services['number_of_pools']['status']
            if gateways_informations is not None:
                specific_services['routeres_involves'] = utils.getInvolvedRouters()
            else:
                specific_services['routeres_involves'] = -1

        if specific_status > host[2]:
            host[2] = specific_status
        status = 'green'
        if host[2] == 1:
            status = 'yellow'
        if host[2] > 1:
            status = 'red'
        if update:
            #UPDATE HOST INFORMATION IN LOCAL DB (if enough time has passed since last update)
            utils.send_montly_report(request)
            try:
                db_host = models.Hosts.objects.filter(hostname=host[0]).get()
                db_host.hostname = host[0]
                db_host.ip_address = host[1]
                db_host.host_type = device_type_to_show
                db_host.save()
            except models.Hosts.DoesNotExist:
                db_host = models.Hosts(hostname=host[0], ip_address=host[1], host_type=device_type_to_show)
                db_host.save()

            try:
                update_interval = getattr(conf, 'STATUS_MIN_UPDATE_INTERVAL', 5) * 60
                latest = models.BasicStatus.objects.filter(host=db_host).order_by('-id')[0]
                diff = datetime.datetime.now() - latest.datetime
                do_status_update = diff.days * 24 * 3600 + diff.seconds > update_interval
            except Exception as e:
                logger.error(e)
                do_status_update = True

            if do_status_update:
                utils.parse_basic_service_for_db(basic_services, db_host)
                if device_type_to_show == 'router':
                    specific_update = models.RouterSpecific(host=db_host,
                                                            number_of_users=specific_services['Users']['description'])
                    specific_update.save()
                if(device_type_to_show == 'gateway'):
                    specific_update = models.GatewaySpecific(host=db_host,
                                                             h323=specific_services['h323']['description'],
                                                             phone_connections=specific_services['phone_connections']['description'])
                    specific_update.save()
                if(device_type_to_show == 'portal'):
                    specific_update = models.PortalSpecific(number_of_users=specific_services['number_of_users']['description'],
                                                            number_of_pools=specific_services['number_of_pools']['description'],
                                                            number_of_conferences=specific_services['number_of_conferences']['description'])
                    specific_update.save()
        try:
            db_host = models.Hosts.objects.filter(hostname=host[0]).get()
            location_lgn = db_host.location_lgn
            location_lat = db_host.location_lat
        except models.Hosts.DoesNotExist:
            location_lat = None
            location_lgn = None
        hosts.append({
            'hostname': host[0],
            'ip_address': host[1],
            'label': label,
            'location':  {'lgn': location_lgn, 'lat': location_lat},
            'status': status,
            'row_status': host[2],
            'basic_services': basic_services,
            'specific_services': specific_services,
            'device_type': device_type_to_show,
            'update': update
        })
    portal_ok = False
    for host in hosts:
        if host['device_type'] == 'portal':
            if host['status'] == 'green':
                portal_ok = True
                break
    if portal_ok:
        for host in hosts:
            if host['device_type'] == 'portal':
                host['status'] = 'green'
                host['row_status'] = 0
                for key in host['basic_services'].keys():
                    host['basic_services'][key]['status'] = 0
    #check final system status
    for host in hosts:
        if host['row_status'] > system_staus:
            system_staus = host['row_status']
    if system_staus >= 1:
        alert_row_body = ''
        is_nagios_alert_only = True
        for host in hosts:
            if host['row_status'] > 0:
                alert_row_body += ' -' + host['hostname'] + ':'
                if host['row_status'] == 1:
                    alert_row_body += 'warning'
                else:
                    alert_row_body += 'danger'
                alert_row_body += '\r\n'
            host_affected_services = 0
            for key in host['basic_services'].keys():
                if host['basic_services'][key]['status'] > 0:
                    host_affected_services += 1
            for k in host['specific_services'].keys():
                if k != 'routeres_involves' and host['specific_services'][k]['status'] > 0:
                    host_affected_services += 1
            host['affected_services'] = host_affected_services
            if host_affected_services > 0:
                is_nagios_alert_only = False
        alert_body = "Network elements risk:\r\n"
        alert_body += alert_row_body
        perform_alert = False
        try:
            last_alert = models.alert.objects.latest('datetime')
            now = datetime.datetime.now()
            diff = now - last_alert.datetime
            seconds = diff.days * 24 * 60 * 60 + diff.seconds
            if seconds > 60 * 60 and alert_body != last_alert.body:  # Every 60 minutes send an alert
                perform_alert = True
        except models.alert.DoesNotExist:
            perform_alert = True
        if perform_alert and not is_nagios_alert_only:
            # Save into alert
            alert = models.alert(body=alert_body)
            alert.save()
            # Send sms and mail
            t = loader.get_template('notificaiton_email.html')
            c = Context({'hosts': hosts, 'a': 0})
            rendered = t.render(c)
            utils.send_alert_email(rendered)
            utils.send_alert_sms(alert_body)
    response = HttpResponse(simplejson.dumps(hosts), content_type="application/json")
    response["Access-Control-Allow-Origin"] = "*"
    return response


@csrf_exempt
@permissions.is_logged_in_html
def admin(request):
    if (models.main_portal.objects.count() == 0):
        return alert_users(request)
    get_all_hosts_internal(request, force_update=True)
    return admin_location(request)


@csrf_exempt
@permissions.is_logged_in_html
def admin_location(request):
    error = None
    try:
        portal = models.main_portal.objects.all()[0]
    except:
        error = "Set main portal on Configuration tab to get all monitoring data."

    label = request.POST.get('label', None)
    type_device = request.POST.get('type_device', None)
    ip = request.POST.get('ip', None)
    if label and type_device and ip:
        try:
            model = models.Hosts.objects.filter(ip_address=ip).get()
            model.host_type = type_device
            model.label = label
            model.save()
        except:
            ip = None
        return redirect(request.build_absolute_uri('/locations/').replace('http://', 'https://'))
    id = request.POST.get('id', None)
    if id:
        try:
            model = models.Hosts.objects.get(id=id)
            hostname = model.hostname
            model.delete()
            url = 'remove/%s' % hostname
            utils.get_nagios_json(url, row_output=True)
        except:
            id = -1
    gateways = models.Hosts.objects.filter(host_type='gateway')
    routers = models.Hosts.objects.filter(host_type='router')
    portals = models.Hosts.objects.filter(host_type='portal')
    context = {'gateways': gateways,
               'portals': portals,
               'routers': routers,
               'error': error}
    return render_to_response("admin_locations.html", context)


@csrf_exempt
@permissions.is_logged_in_html
def delete_all_hosts(request):
    for host in models.Hosts.objects.all():
        # Only restart cmk after last host
        restart_cmk = models.Hosts.objects.count() <= 1
        changeHosts('remove', host.hostname, restart_cmk=restart_cmk)
        host.delete()

    return redirect(request.build_absolute_uri('/locations/').replace('http://', 'https://'))


@csrf_exempt
@permissions.is_logged_in_html
def add_host(request):
    label = request.POST.get('label', None)
    type_device = request.POST.get('type', None)
    hostname = request.POST.get('hostname', '').strip()
    ssh = request.POST.get('ssh', 'no')

    if utils.nagios_port_is_open(hostname):
        url = 'add/%s/type/%s/ssh/%s' % (hostname, type_device, ssh)
        result = utils.get_nagios_json(url, row_output=True)
        if result == 'OK':
            try:
                get_all_hosts_internal(request, force_update=True)
                model = models.Hosts.objects.filter(hostname=hostname).get()
                if type_device == 'gws':
                    type_device = 'gateway'
                if type_device == 'portals':
                    type_device = 'portal'
                if type_device == 'routers':
                    type_device = 'router'
                model.host_type = type_device
                model.label = label

                # Try to fetch device location from vidyoloc.cern.ch
                location = utils.get_location(hostname)
                if (location is not None and len(location) == 2):
                    model.location_lat = location[0]
                    model.location_lgn = location[1]

                model.save()
                response = HttpResponse('ok')
            except ObjectDoesNotExist:
                response = HttpResponse("adding hostname %s failed" % hostname, status=404)

        else:
            response = HttpResponse(result, status=404)
    else:
        response = HttpResponse("Can't access Nagios agent port at %s" % hostname, status=400)

    response['Access-Control-Allow-Origin'] = '*'
    return response


@csrf_exempt
@permissions.is_logged_in_html
def check_ip(request):
    hostname = request.POST.get('hostname', None)
    response = HttpResponse(utils.revers_ip(hostname))
    response["Access-Control-Allow-Origin"] = "*"
    return response


@csrf_exempt
@permissions.is_logged_in_html
def alert_users(request):
    error = None
    context = {}
    try:
        portal = models.main_portal.objects.all()[0]
    except:
        error = "Set main portal on Configuration tab to get all monitoring data."

    id_user = (int)(request.POST.get('user_alert_id', -1))
    id_portal = (int)(request.POST.get('main_portal_id', -1))
    if id_user >= 0:
        name = request.POST.get('alert_name', None)
        phone = request.POST.get('alert_phone', None)
        email = request.POST.get('alert_email', None)
        toDelete = request.POST.get('toDelete', False)
        if name and email:
            if id_user == 0:
                new_user = models.alert_users(name=name, phone=phone, email=email)
                new_user.save()
            else:
                try:
                    user = models.alert_users.objects.filter(id=id_user).get()
                    user.name = name
                    user.email = email
                    user.phone = phone
                    user.save()
                except models.alert_users.DoesNotExist:
                    error = "Model user does not exist"
                if toDelete:
                    user.delete()

    if id_portal >= 0:
        host = request.POST.get('portal_host', None)
        username = request.POST.get('portal_username', None)
        password = request.POST.get('portal_password', None)
        database = request.POST.get('portal_database', None)
        toDelete = request.POST.get('toDelete', False)
        if host and username and password and database:
            new_portal = models.main_portal(id=id_portal, host=host, username=username, password=password, database=database)
            new_portal.save()
        if toDelete:
                        models.main_portal.objects.filter(id=id_portal).delete()

    users = models.alert_users.objects.all()
    portals = models.main_portal.objects.all()
    context = {'portals': portals, 'users': users, 'error': error}
    return render_to_response("alert_users.html", context)


@permissions.is_logged_in_html
def alert_history(request):
    error = None
    context = {}
    try:
        portal = models.main_portal.objects.all()[0]
    except:
        error = "Set main portal on Configuration tab to get all monitoring data."

    page = request.GET.get('page', 1)
    alerts_list = models.alert.objects.all().order_by('-datetime')
    paginator = Paginator(alerts_list, 10)
    try:
        alerts = paginator.page(page)
    except PageNotAnInteger:
        alerts = paginator.page(1)
    except EmptyPage:
        alerts = paginator.page(paginator.num_pages)
    context = {'alerts': alerts, 'error': error}
    return render_to_response("alert_history.html", context)


@csrf_exempt
def loggin(request):
    username = request.POST.get('username')
    password = request.POST.get('password')
    url = request.POST.get('redirect', '/')
    if not username or not password:
        return render_to_response('login.html', {'not_logged_in': True, 'url_redirect': url,
                                                 'error': 'Please fill all the fields!'})
    user = authenticate(username=username, password=password)
    if not user:
        return render_to_response('login.html', {'not_logged_in': True, 'url_redirect': url,
                                                 'error': 'User and/or password don\'t match!'})
    if not user.is_active:
        return render_to_response('login.html', {'not_logged_in': True, 'url_redirect': url,
                                                 'error': 'The user is not active!'})
    request.session['member_id'] = user.id
    return redirect(request.build_absolute_uri(url).replace('http://', 'https://'))


@csrf_exempt
@permissions.is_logged_in_html
def logout(request):
    del request.session['member_id']
    return redirect(request.build_absolute_uri('/').replace('http://', 'https://'))


@csrf_exempt
@permissions.is_logged_in_html
def updateposition(request):
    lgn = request.POST.get('lgn')
    lat = request.POST.get('lat')
    host = request.POST.get('host')
    model_host = models.Hosts.objects.filter(hostname=host).get()
    model_host.location_lgn = lgn
    model_host.location_lat = lat
    model_host.save()
    response = HttpResponse(simplejson.dumps(model_host.id), content_type="application/json")
    response["Access-Control-Allow-Origin"] = "*"
    return response


@csrf_exempt
def active_conferences(request):
    """
    Fetch a list of active conference calls.
    """
    show_user_info = permissions.has_valid_auth_params(request)
    result = utils.get_active_conferences(show_user_info)

    if 'callback' in request.REQUEST:  # send JSONP response
        data = '%s(%s)' % (request.REQUEST['callback'], simplejson.dumps(result))
        return HttpResponse(data, 'text/javascript')

    response = HttpResponse(simplejson.dumps(result), content_type="application/json")
    response["Access-Control-Allow-Origin"] = "*"
    return response
