from django.http import HttpResponse
from django.template import loader, Context
from django.utils import simplejson

import urllib2
import smtplib
import MySQLdb
import string
import random
import time
import datetime
import socket
import re
from xml.dom import minidom
from collections import defaultdict

import gevent
from gevent import monkey
monkey.patch_socket()

from application import api
from application import models
import settings

import logging
logger = logging.getLogger('django')


#=======================================General helpers===================================


def get_nagios_json(url, paramteres=None, row_output=False):
    data = []
    for a in api.services:
        matches = re.search('^'+a[0], url)
        if matches:
            try:
                p1 = matches.group('p1')
            except:
                p1 = None
            try:
                p2 = matches.group('p2')
            except:
                p2 = None
            try:
                p3 = matches.group('p3')
            except:
                p3 = None
            if p3:
                data = a[1](p1, p2, p3)
            elif p2:
                data = a[1](p1, p2)
            elif p1:
                data = a[1](p1)
            else:
                data = a[1]()
    return data


def revers_ip(hostname):
    try:
        hostname = hostname.strip()
        results = socket.getaddrinfo(hostname, 443)
    except:
        return None
    for r in results:
        if len(r[4]) == 2:
            return r[4][0]
    return results


def perform_select_mysql(sql_request, args=(), use_dict_cursor=False, charset=None):
    portal = models.main_portal.objects.all()[0]
    db = MySQLdb.connect(
        host=portal.host,
        user=portal.username,
        passwd=portal.password,
        db=portal.database
    )

    if charset:
        db.set_character_set(charset)

    cursor = db.cursor() if not use_dict_cursor else db.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(sql_request, args)
    return cursor.fetchall()


def tokenGenerator(size=16, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))


def nagios_port_is_open(hostname):
    """
    Return True if host is accessible by the Nagios agent.
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3)
        is_open = s.connect_ex((hostname, 2222)) == 0
        s.close()
        return is_open
    except Exception as e:
        logger.error('Failed to check Nagios agent port for host "%s": %s' % (hostname, e))
        return False


# TODO: cache result
def get_device_mapping():
    """
    Return a dictionary that maps device IDs into IPs, hostnames, display names etc.
    """
    query = 'SELECT Identifier, IpAddress FROM portal2.NetworkElementConfiguration'
    devices = perform_select_mysql(query)
    hosts = list(models.Hosts.objects.all())
    result = {}

    for device_id, device_ip in devices:
        try:
            host = filter(lambda x: x.ip_address == device_ip, hosts)[0]
        except IndexError:
            continue

        result[device_id] = dict(
            ip_address=device_ip,
            hostname=host.hostname,
            label=host.label
        )

    return result


def get_location(hostname):
    """
    Fetch device location from the location server.
    """
    try:
        loc_url = 'http://vidyoloc.cern.ch/json/' + hostname.strip()
        resp = simplejson.loads(urllib2.urlopen(loc_url).read())
        lat, lgn = str(resp['latitude']), str(resp['longitude'])
        return lat, lgn
    except Exception as e:
        logger.error('Failed to fetch location from %s: %s' % (loc_url, e))
        return None


def get_specific_fields_from_statuses(all_statuses, fields):
    """
    Parse specific fields from a list of status objects.
    """
    if 'status' in fields[0]:
        keys = ('data', 'status', 'value', 'second_value')
    else:
        keys = ('data', 'value', 'second_value')

    statuses = []
    for status in all_statuses:
        timestamp = int(time.mktime(status.datetime.timetuple()))
        statuses.append(dict(zip(keys, [timestamp] + [getattr(status, f) for f in fields])))
    return statuses


def get_field_avgs_from_statuses(all_statuses, fields, interval, start_date, end_date):
    """
    Calculate averages from status objects.
    """
    keys = ('value', 'second_value')
    if 'status' in fields[0]:
        keys = ('status',) + keys

    fields_keys = zip(fields, keys)
    lower_limit = end_date - interval
    totals, count = defaultdict(int), 0
    to_return = []

    for status in all_statuses:
        if lower_limit <= start_date:
            break

        count += 1
        for field in fields:
            totals[field] += max(getattr(status, field), 0)

        if status.datetime <= lower_limit:
            interval_data = dict(data=int(time.mktime(lower_limit.timetuple())))

            for field, key in fields_keys:
                interval_data[key] = 1.0 * totals[field] / count if count else 0

            to_return.append(interval_data)
            totals, count = defaultdict(int), 0
            lower_limit -= interval

    return to_return


def get_fields_by_service(service):
    """
    Return model fields (in a status object) that correspond to given service.
    """
    mapping = dict(
        # Basic services
        cpu=('cpu_status', 'cpu_persentage'),
        disk=('disc_status', 'disc_read', 'disc_write'),
        interface=('eth_status', 'eth_in', 'eth_out'),
        memory=('memory_status', 'memory_used', 'memory_total'),
        tcp=('tcp_status', 'tcp_est', 'tcp_closed'),
        uptime=('uptime_status', 'uptime'),
        udp=('udp_status', 'udp_est'),
        http=('response_status', 'response_time'),
        https=('https_status', 'https_con'),
        vp=('vp_server_status', 'vp_server_value'),
        vr2=('vr2_server_status', 'vr2_server_value'),
        vidyo=('vidyo_manager_status', 'vidyo_manager_value'),

        # Gateway specific
        h323=('h323',),
        phone_connections=('phone_connections',),

        # Portal specific
        conferances=('number_of_conferences',),
        pools=('number_of_pools',),

        # Both portals and routers
        users=('number_of_users',)
    )

    return mapping[service.lower()]


def json_response(data):
    """
    Build a JSON HTTP response out of input data.
    """
    response = HttpResponse(simplejson.dumps(data), content_type="application/json")
    response["Access-Control-Allow-Origin"] = "*"
    return response


def get_active_conferences(show_user_info=False):
    """
    Fetch a list of active conference calls.
    """
    query = """SELECT CallID, UniqueCallID, ConferenceName, EndpointType, JoinTime, RouterID, GWID %s
        FROM ConferenceCall2
        WHERE CallState='IN PROGRESS'
        AND JoinTime > date_sub(now(), INTERVAL 1 DAY );
    """ % (', CallerID, CallerName' if show_user_info else '')

    result = perform_select_mysql(query, (), True, 'utf8')

    # Map router & gateway IDs into names:
    device_mapping = get_device_mapping()
    for r in result:
        r['JoinTime'] = str(r['JoinTime'])

        try:
            router = device_mapping[r['RouterID']]
            r['RouterHostname'] = router['hostname']
            r['RouterLabel'] = router['label']
            r['RouterIP'] = router['ip_address']

            gateway = device_mapping[r['GWID']]
            r['GatewayHostname'] = gateway['hostname']
            r['GatewayLabel'] = gateway['label']
            r['GatewayIP'] = gateway['ip_address']
        except KeyError:
            pass

    return result


#======================================Router specific===================================


def get_users_number(host):
    # To avoid monifing the schema due to
    #       Illegal mix of collations (utf8_unicode_ci,IMPLICIT) and (utf8_general_ci,IMPLICIT)
    sql = 'SELECT DisplayName FROM NetworkElementConfiguration WHERE IpAddress = \'%s\' LIMIT 0,1'
    sql %= host
    result = perform_select_mysql(sql)
    if not result:
        return -1
    else:
        routerId = result[0][0].replace('Proxy', '')
    sql = 'SELECT count(*) FROM Conferences WHERE %s'
    sql %= 'VRName = \'%s\''
    sql %= routerId
    result = perform_select_mysql(sql)
    if not result:
        return -1
    return result[0][0]


#=====================================Gateway specific====================================

def _fetch_gateway_status(gw):
    """
    Thread body; fetch the status of a single gateway device by HTTP.
    """
    url = 'http://%s/cgi-bin/call-list.cgi?uid=%s/' % (gw, time.time())
    request = urllib2.Request(url)
    try:
        result = urllib2.urlopen(request, None, 3).read()
    except Exception:
        result = None

    return gw, result, url


def getGWStatus():
    sql = 'SELECT IpAddress FROM NetworkElementConfiguration WHERE ComponentType = \'VidyoGateway\''
    gateways = perform_select_mysql(sql)
    errors = []
    all_gateways = {}

    jobs = [gevent.spawn(_fetch_gateway_status, gw[0]) for gw in gateways]
    gevent.joinall(jobs)

    for gw, data, url in [job.value for job in jobs]:
        if data is None:
            errors.append("Error for %s" % url)
            continue
        if data == "":
            all_gateways[gw[0]] = {'h323_calls': -1, 'voip_calls': -1}
            continue
        parsed = minidom.parseString(data)
        clauster_elements = parsed.getElementsByTagName('node')
        for elm in clauster_elements:
            ip_address = ''
            for (name, value) in elm.attributes.items():
                if name == 'address':
                    ip_address = str(value)
            calls = elm.getElementsByTagName('call')
            h323_calls = 0
            voip_calls = 0
            for call in calls:
                call_type = getElement(call.getElementsByTagName('resolution')[0])
                if call_type == '0x0':
                    voip_calls += 1
                else:
                    h323_calls += 1
            all_gateways[ip_address] = {'h323_calls': h323_calls, 'voip_calls': voip_calls}
    return all_gateways


#=====================================Portal specific====================================


def getConferanceNumber():
    sql = 'SELECT count(DISTINCT conferenceName) FROM Conferences'
    result = perform_select_mysql(sql)
    if not result:
        return -1
    return result[0][0]


def getUsersNumber():
    sql = 'SELECT count(*) FROM Conferences'
    result = perform_select_mysql(sql)
    if not result:
        return -1
    return result[0][0]


def getPoolsNumber():
    sql = 'SELECT count(DISTINCT GroupName) FROM Conferences'
    result = perform_select_mysql(sql)
    if not result:
        return 0
    return result[0][0]


def getInvolvedRouters():
    sql = 'SELECT DISTINCT IpAddress FROM Conferences,NetworkElementConfiguration WHERE %s'
    sql %= 'DisplayName = VRName'
    result = perform_select_mysql(sql)
    if not result:
        return -1
    to_return = []
    for r in result:
        try:
            tmp = models.Hosts.objects.filter(ip_address=r[0]).get()
            to_return.append([tmp.label, r[0]])
        except:
            continue
    return to_return


#======================================NAGIOS specific===================================


def init_basic_services():
    to_return = {}
    for service in settings.BASIC_SERVICES:
        empty_dict = {'status': 1, 'description': 'Unknown', 'comment': 'Nagios alert'}
        to_return[service] = empty_dict
    return to_return


def update_host_status(basic_services):
    status = 0
    for service in basic_services.keys():
        if basic_services[service]['status'] > 1:
            return 2
        if basic_services[service]['status'] == 1:
            status = 1
    return status


def parse_basic_service_for_db(services, host):
    basic_services = models.BasicStatus(host=host)
    for service in services.keys():
        if service == 'CPU load':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.cpu_persentage = -1
            else:
                basic_services.cpu_persentage = (int)(services[service]['description'].split('%')[0])
            basic_services.cpu_status = services[service]['status']
        if service == 'TCP Connections':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.tcp_est = -1
                basic_services.tcp_closed = -1
            else:
                #first_split = services[service]['description'].split(': ')
                basic_services.tcp_closed = 0
                basic_services.tcp_est = (int)(services[service]['description'])
            basic_services.tcp_status = services[service]['status']
        if service == 'Disk IO SUMMARY':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.disc_write = -1
                basic_services.disc_read = -1
            else:
                first_split = services[service]['description'].split(', ')
                basic_services.disc_read = (float)(first_split[0].split(' (read)')[0])
                basic_services.disc_write = (float)(first_split[1].split(' (write)')[0])
            basic_services.disc_status = services[service]['status']
        if service == 'Interface eth0':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.eth_in = -1
                basic_services.eth_out = -1
            else:
                first_split = services[service]['description'].split(', ')
                basic_services.eth_in = (float)(first_split[0].split('(in)')[0])
                basic_services.eth_out = (float)(first_split[1].split('(out')[0])
            basic_services.eth_status = services[service]['status']
        if service == 'Memory used':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.memory_used = -1
                basic_services.memory_total = -1
            else:
                first_split = services[service]['description'].split(' of ')
                basic_services.memory_used = (int)(first_split[0])
                basic_services.memory_total = (int)(first_split[1].split(' MB')[0])
            basic_services.memory_status = services[service]['status']
        if service == 'HTTPS':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.https_con = -1
            else:
                try:
                    basic_services.https_con = (int)(services[service]['description'])
                except:
                    basic_services.https_con = 0
            basic_services.https_status = services[service]['status']
        if service == 'HTTP':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.response_time = -1
            else:
                try:
                    first_split = services[service]['description'].split('s')
                    basic_services.response_time = (int)(first_split[0])
                except:
                    basic_services.response_time = 0
            basic_services.response_status = services[service]['status']
        if service == 'proc_VPServer':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.vp_server_value = -1
            else:
                try:
                    basic_services.vp_server_value = (int)(services[service]['description'])
                except:
                    basic_services.vp_server_value = 0
            basic_services.vp_server_status = services[service]['status']
        if service == 'proc_VR2':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.vr2_server_value = -1
            else:
                try:
                    basic_services.vr2_server_value = (int)(services[service]['description'])
                except:
                    basic_services.vr2_server_value = 0
            basic_services.vr2_server_status = services[service]['status']
        if service == 'proc_VidyoManager':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.vidyo_manager_value = -1
            else:
                try:
                    basic_services.vidyo_manager_value = (int)(services[service]['description'])
                except:
                    basic_services.vidyo_manager_value = 0
            basic_services.vidyo_manager_status = services[service]['status']
        if service == 'UDP':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.udp_est = -1
            else:
                try:
                    basic_services.udp_est = (int)(services[service]['description'])
                except:
                    basic_services.udp_est = 0
            basic_services.udp_status = services[service]['status']
        if service == 'Uptime':
            if services[service]['description'] == 'Unknown' or services[service]['description'].find("not found") >= 0:
                basic_services.uptime = -1
            else:
                first_split = services[service]['description'].split(' days ')
                days = (int)(first_split[0])
                second_split = first_split[1].split(':')
                hours = (int)(second_split[0][:-1])
                minutes = (int)(second_split[1][:-1])
                seconds = (int)(second_split[2][:-1])
                basic_services.uptime = ((((days * 24) + hours) * 60) + minutes) * 60 + seconds
            basic_services.uptime_status = services[service]['status']
    basic_services.save()


def send_alert_email(body):
    recipients = [r.email for r in models.alert_users.objects.all()]
    sender = 'service-avc-operation@cern.ch'
    msg = """From: %s\nTo: %s\nSubject: Vidyo monitoring system alert\nContent-type: text/html\n\n%s"""
    msg %= (sender, ','.join(recipients), body)
    try:
        smtpObj = smtplib.SMTP('localhost')
        smtpObj.sendmail(sender, recipients, msg)
    except smtplib.SMTPException:
        print "Error: unable to send email"


def send_alert_sms(body):
    recipients = models.alert_users.objects.all()
    sender = 'service-avc-operation@cern.ch'
    for r in recipients:
        msg = """From: %s\nTo: %s\nSubject: Vidyo monitoring system alert\n\n%s"""
        msg %= (sender, '%s@mail2sms.cern.ch' % r.phone, body)
        try:
            smtpObj = smtplib.SMTP('localhost')
            smtpObj.sendmail(sender, '%s@mail2sms.cern.ch' % r.phone, msg)
        except smtplib.SMTPException:
            print "Error: unable to send email"


def getElement(element):
    return getText(element.childNodes)


def getText(nodelist):
    rc = ""
    for node in nodelist:
        if node.nodeType == node.TEXT_NODE:
            rc = rc + node.data
    return rc


def get_url(url):
    try:
        request = urllib2.Request(url)
        result = urllib2.urlopen(request)
        data = result.read()
        return simplejson.loads(data)
    except:
        return []


def send_montly_report(request):
    day = datetime.date.today().day
    month = datetime.date.today().month
    year = datetime.date.today().year
    if day != 1:
        return
    today = datetime.date.today()
    first = datetime.date(day=1, month=today.month, year=today.year)
    meetings_number_row = get_url('http://avc-dashboard.web.cern.ch/Vidyo/ajax?graphic=cvs_meetings')
    total_meetings = 0
    for r in meetings_number_row['data']:
        if r['date'] == first.strftime('%Y-%m-%d'):
            total_meetings = int(r['other']) + int(r['alice']) + int(r['atlas']) + int(r['cms']) + int(r['lhcb'])
    meetings_number_row = get_url('http://avc-dashboard.web.cern.ch/Vidyo/ajax?graphic=cvs_uniqueUsersPerMonth')
    total_h323 = 0
    total_software = 0
    total_voip = 0
    for r in meetings_number_row['data']:
        if r['year'] == first.strftime('%Y') and r['month'] == first.strftime('%m'):
            total_h323 = int(r['totalH323']) + int(r['totalVidyoRooms'])
            total_voip = int(r['totalTel'])
            total_software = int(r['totalOthers']) + int(r['totalGuests'])
    old_h323 = 0
    old_software = 0
    old_voip = 0
    old_meetings = 0
    try:
        last_report = models.report_monthly.objects.latest('datetime')
    except models.report_monthly.DoesNotExist:
        last_report = None
    if last_report:
        last_now = last_report.datetime
        if last_now.month == month and last_now.year == year:
            return
        old_h323 = last_report.connection_h323
        old_voip = last_report.connection_voip
        old_software = last_report.connection_soft
        old_meetings = last_report.meetings_nb
    old_h323_sign = 0
    old_software_sign = 0
    old_voip_sign = 0
    old_meetings_sign = 0
    if old_meetings > total_meetings:
        old_meetings_sign = -1
    elif old_meetings < total_meetings:
        old_meetings_sign = 1

    if old_software > total_software:
        old_software_sign = -1
    elif old_software < total_software:
        old_software_sign = 1

    if old_voip > total_voip:
        old_voip_sign = -1
    elif old_voip < total_voip:
        old_voip_sign = 1

    if old_h323 > total_h323:
        old_h323_sign = -1
    elif old_h323 < total_h323:
        old_h323_sign = 1
    top_10 = get_url('http://avc-dashboard.web.cern.ch/Vidyo/ajax?graphic=cvs_top_connection_meetings_monthly')

    #Save new report
    new_report = models.report_monthly(meetings_nb=total_meetings,
                                       connection_soft=total_software,
                                       connection_voip=total_voip,
                                       connection_h323=total_h323)
    new_report.save()
    current_site = request.get_host()
    t = loader.get_template('notificaiton_email_report.html')
    c = Context({'total_meetings': total_meetings, 'total_h323': total_h323,
                 'total_voip': total_voip, 'total_software': total_software,
                 'old_meetings': old_meetings, 'old_h323': old_h323,
                 'old_voip': old_voip, 'old_software': old_software,
                 'old_meetings_sign': old_meetings_sign, 'old_h323_sign': old_h323_sign,
                 'old_voip_sign': old_voip_sign, 'old_software_sign': old_software_sign,
                 'top_10':  top_10['data'],
                 'current_site': current_site,
                 'a': 0})
    rendered = t.render(c)
    send_alert_email(rendered)
