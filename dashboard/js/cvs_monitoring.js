/*
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

# Build monitoring page.
*/

/* global jQuery, google, TopologyGraph, nagios_auth */
'use strict';

/*******************************************************************************************************
 * MONITORING(Javascript)
 *******************************************************************************************************/
var $jq = jQuery.noConflict();



//global array having informations about the hosts
var nagios_hosts = [];
var map;

//static variables
var device_types = ['router','portal','gateway'];
var states = ['green', 'yellow', 'red'];
var location_manager_server = 'http://vidyoloc.cern.ch/json/';
var icons = {};
var markersCount = 0;
var markerCluster;
var map_center;
var interval = null;
var portals = [];
var gateways = [];
var routers = [];
var topologyGraph;
var selected_host;

var show_routers = true;
var show_gateways = true;
var show_portals = true;

var total_voip = 0;
var total_h323 = 0;


function cvs_reload_position() {
    if (map_center) {
        map.panTo(map_center);
        map.setZoom(2);
    }
}

function cvs_load_tab3() {
    markersCount = 0;
    markerCluster = null;
    //Default CERN position
    var lgn = 46.235784;
    var lat = 6.04454;
    //Get user current location (HTML5 ready) with fallback on the default values
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            lgn = position.coords.longitude;
            lat = position.coords.latitude;
        });
    }
    map_center = new google.maps.LatLng(lgn, lat);
    _cvs_create_icons();
    var myOptions = {
        center: map_center,
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        streetViewControl: false,
        mapTypeComarkersCountntrol: false,
        overviewMapControl: true,
        overviewMapControlOptions: {
            opened: false
        }
    };

    map = new google.maps.Map(document.getElementById("cvs_map_canvas"), myOptions);
    google.maps.event.trigger(map, 'resize');
    $jq('#cvs_map_loading').hide();
    $jq('#cvs_map_container').show();

    //getting data about equipments
    var background_worker = function() {
        markersCount = 0;
        markerCluster = null;
        jQuery.ajax({
            crossDomain: true,
            type: 'POST',
            url: nagios_host + 'hosts/',
            async: true,
            cache: false,
            timeout: 10000,
            data: 'token=' + nagios_auth,
            success: cvs_get_monitoring_map,
            error: function(a, b, c) {
                if (c === '') {
                    show_block_offline();
                } else {
                    cvs_XDomaninRequest('hosts/', 'token=' + nagios_auth, cvs_get_monitoring_map);
                }
            },
            dataType: 'json'
        });
    };

    if (interval === null)
        interval = setInterval(background_worker, 60 * 1000);
    if (nagios_hosts.length === 0)
        background_worker();
    else
        cvs_build_data();

    $jq('#cvs_toggle_topology_graph').unbind('click').click(_cvs_toggle_topology_graph);
}

function _cvs_toggle_topology_graph(e) {
    if ($jq('#cvs_map_upper_container').is(':visible')) {
        $jq('#cvs_map_upper_container, #show_all').hide();
        $jq('#cvs_topology_container').show();
        topologyGraph = topologyGraph || TopologyGraph('#cvs_topology_container', nagios_auth);
        topologyGraph.start();
        $jq(e.target).text('Show map');
    }
    else {
        $jq('#cvs_map_upper_container, #show_all').show();
        $jq('#cvs_topology_container').hide();
        topologyGraph.stop();
        $jq(e.target).text('Show topology');
        google.maps.event.trigger(map, 'resize');
    }
}

function show_block_offline() {
    $jq("#dialog-no-data").dialog('open');
}

function cvs_XDomaninRequest(url, data, callback) {
    jQuery.ajax({
        type: 'POST',
        url: 'Vidyo/cross',
        data: data + '&url=' + nagios_host + url,
        success: callback,
        error: function(a, b, c) {
            show_block_offline();
        }
    });
}

var cvs_get_nagios_host_only = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        if (markerCluster)
            markerCluster.removeMarkers(nagios_hosts);
        nagios_hosts = [];
        markersCount = 0;
        markerCluster = null;
        for (var index in data) {
            nagios_hosts.push(data[index]);
        }
    }
};

function _cvs_hide_elements_name(vector) {
    if (vector == 'routers') {
        if (!show_routers) {
            $jq('#cvs_filter_routers').show();
        }
        $jq('#cvs_filter_routers').toggle();
    }
    if (vector == 'gateways') {
        if (!show_gateways)
            $jq('#cvs_filter_gateways').show();
        $jq('#cvs_filter_gateways').toggle();

    }
    if (vector == 'portals') {
        if (!show_portals) {
            $jq('#cvs_filter_portals').show();
        }
        $jq('#cvs_filter_portals').toggle();
    }
}

function _cvs_hide_elements(vector) {
    if (vector == 'routers') {
        show_routers = !show_routers;
        if (!show_routers) {
            $jq('#cvs_filter_routers').hide();
        }
    }
    if (vector == 'gateways') {
        show_gateways = !show_gateways;
        if (!show_gateways) {
            $jq('#cvs_filter_gateways').hide();
        }
    }
    if (vector == 'portals') {
        show_portals = !show_portals;
        if (!show_portals) {
            $jq('#cvs_filter_portals').hide();
        }
    }
    cvs_makeMarkers();
}

var cvs_get_monitoring_map = function(data, textStatus, xhr) {
    if (textStatus == 'error') {
        show_block_offline();
        return;
    }
    if (textStatus == 'success') {
        google.maps.event.trigger(map, 'resize');
        if (markerCluster)
            markerCluster.removeMarkers(nagios_hosts);
        nagios_hosts = [];
        for (var index in data) {
            data[index].isVisible = true;
            nagios_hosts.push(data[index]);
        }
        cvs_build_data();
    }
};

function _cvs_build_filters() {
    var html2 = '<ul class="filter_ul">';
    for (var index in routers) {
        var o = routers[index];
        var name = o.label;
        if (name === "")
            name = o.hostname;
        html2 += '<li><a href="#" onclick="gotoNetworkElement(\'' + o.ip_address + '\')">' + name + '</a></li>';
    }

    html2 += '</ul>';
    $jq('#cvs_filter_routers').html(html2);
    html2 = '<ul class="filter_ul">';
    for (index in gateways) {
        var o = gateways[index];
        var name = o.label;
        if (name === "")
            name = o.hostname;
        html2 += '<li><a href="#" onclick="gotoNetworkElement(\'' + o.ip_address + '\')">' + name + '</a></li>';
    }

    html2 += '</ul>';
    $jq('#cvs_filter_gateways').html(html2);
    html2 = '<ul class="filter_ul">';
    for (index in portals) {
        var o = portals[index];
        var name = o.label;
        if (name === "")
            name = o.hostname;
        html2 += '<li><a href="#" onclick="gotoNetworkElement(\'' + o.ip_address + '\')">' + name + '</a></li>';
    }

    html2 += '</ul>';
    $jq('#cvs_filter_portals').html(html2);
}

function gotoNetworkElement(ip) {
    for (var index in nagios_hosts) {
        var host = nagios_hosts[index];
        if (host.ip_address != ip)
            continue;
        if (host.marker) {
            var point = host.marker.getPosition();
            map.panTo(point);
            map.setZoom(16);
            _cvs_open_pop_up(host);
        }
    }
}

function build_top5(vector, div_element, sort_function, count_function) {
    vector.sort(sort_function);
    var html2 = '<ul class="filter_ul">';
    for (var index in vector) {
        if (index >= 5)
            break;
        var o = vector[index];
        var name = o.label;
        if (name === "")
            name = o.hostname;
        var count = count_function(o);
        if (count === 0)
            break;
        html2 += '<li><a href="#" onclick="gotoNetworkElement(\'' + o.ip_address + '\')">' + name + '</a> : <b>' + count + ' </b></li>';
    }
    html2 += '</ul>';
    $jq('#' + div_element).html(html2);
}

function cvs_build_data() {
    portals = [];
    gateways = [];
    routers = [];
    total_voip = 0;
    total_h323 = 0;
    for (var index in nagios_hosts) {
        var o = nagios_hosts[index];
        if (o.location.lat !== "") {
            if (o.device_type == 'router')
                routers.push(o);
            if (o.device_type == 'gateway') {
                gateways.push(o);
                total_h323 += o.specific_services.h323.description;
                total_voip += o.specific_services.phone_connections.description;
            }
            if (o.device_type == 'portal')
                portals.push(o);
        }
    }

    var sort_function = function(a, b) {
        var u1 = a.specific_services.Users.description;
        var u2 = b.specific_services.Users.description;
        if (u1 < u2) { return 1; }
        else if (u1 > u2) { return -1; }
        return 0;
    };

    var count_function = function(a) {
        return a.specific_services.Users.description;
    };

    build_top5(routers, 'cvs_mitoring_summery_routers', sort_function, count_function);

    sort_function = function(a, b) {
        var u1 = a.specific_services.h323.description + a.specific_services.phone_connections.description;
        var u2 = b.specific_services.h323.description + b.specific_services.phone_connections.description;
        if (u1 < u2) { return 1; }
        else if (u1 > u2) { return -1; }
        return 0;
    };

    count_function = function(a){
        var count = a.specific_services.h323.description + a.specific_services.phone_connections.description;
        return count;
    };

    build_top5(gateways, 'cvs_mitoring_summery_gateways', sort_function, count_function);
    var host = portals[0];
    $jq("#cvs_monitoring_portal_summary_conferances_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host.specific_services.number_of_conferences) + '"  />');
    $jq("#cvs_monitoring_portal_summary_conferances").text(host.specific_services.number_of_conferences.description);

    $jq(".cvs_monitoring_portal_summary_users_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host.specific_services.number_of_users) + '"  />');
    $jq("#cvs_monitoring_portal_summary_users").text(host.specific_services.number_of_users.description);
    $jq("#cvs_monitoring_portal_summary_users_h323").text(total_h323);
    $jq("#cvs_monitoring_portal_summary_users_voip").text(total_voip);

    var total_software = host.specific_services.number_of_users.description - total_voip - total_h323;
    $jq("#cvs_monitoring_portal_summary_users_soft").text(total_software);

    $jq("#cvs_monitoring_portal_summary_pools_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host.specific_services.number_of_pools) + '"  />');
    $jq("#cvs_monitoring_portal_summary_pools").text(host.specific_services.number_of_pools.description);

    $jq("#cvs_summary_more_link").html("<a href=\"#\" onclick=\"_cvs_open_pop_up_summary(\'" + host.ip_address + "\')\">Show more</a>");

    _cvs_build_filters();

    for (var index in nagios_hosts) {
        var o = nagios_hosts[index];
        if (o.location.lat === "") {
            //get the geoloc of the ip
            jQuery.ajax({
                type: 'GET',
                url: location_manager_server + o.ip_address,
                crossDomain: true,
                dataType: 'json',
                success: cvs_convert_ip_to_location
            });
        } else {
            markersCount++;
            cvs_makeMarkers();
        }
    }
}

function _cvs_mapDistance(x1, y1, x2, y2) {
    return google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(x1, y1),
        new google.maps.LatLng(x2, y2)
    );
}

function _cvs_mapOffset(x, y, distance, heading) {
    return google.maps.geometry.spherical.computeOffset(
        new google.maps.LatLng(x, y),
        distance,
        heading
    );
}

function _cvs_mapDrawLine(x1, y1, x2, y2) {
    var coords = [
        new google.maps.LatLng(x1, y1),
        new google.maps.LatLng(x2, y2)
    ];

    var flightPath = new google.maps.Polyline({
        path: coords,
        strokeColor: '#FFF',
        strokeWeight: 1,
        map: map
    });
}

function cvs_makeMarkers() {
    if (nagios_hosts.length !== markersCount) return;

    google.maps.event.trigger(map, 'resize');

    if (markerCluster) {
        markerCluster.removeMarkers(nagios_hosts);
    }

    var clusters = _cvs_makeClusters(nagios_hosts, 1000);
    var radius = 300;

    nagios_hosts = [];

    for (var i in clusters) {
        var cluster = clusters[i];
        var step = cluster.hosts.length > 1 ? 360 / cluster.hosts.length : null;

        for (var j in cluster.hosts) {
            var host = cluster.hosts[j];
            if (step) {
                var heading = j * step;
                var newPos = _cvs_mapOffset(cluster.lat, cluster.lng, radius, heading);
                host.location.lat = newPos.lat();
                host.location.lgn = newPos.lng();

                _cvs_mapDrawLine(newPos.lat(), newPos.lng(), cluster.lat, cluster.lng);
            }

            nagios_hosts.push(host);
            cvs_makeMarker(host);
        }
    }

    var options = {
        maxZoom: 10,
        imagePath: images_path + '/m'
    };

    markerCluster = new MarkerClusterer(map, nagios_hosts, options, images_path);
}

/* Group adjacent hosts into clusters. */
function _cvs_makeClusters(hosts, alpha) {
    var clusters = [];
    for (var i in hosts) {
        var host = hosts[i];
        var clusterFound = false;

        for (var j in clusters) {
            var cluster = clusters[j];
            var lat = parseFloat(host.location.lat);
            var lng = parseFloat(host.location.lgn);

            var dist = _cvs_mapDistance(lat, lng, cluster.lat, cluster.lng);
            if (dist <= alpha) {
                clusters[j].lat = (cluster.hosts.length * cluster.lat + lat) / (cluster.hosts.length + 1);
                clusters[j].lng = (cluster.hosts.length * cluster.lng + lng) / (cluster.hosts.length + 1);
                clusters[j].hosts.push(host);

                clusterFound = true;
                break;
            }
        }

        if (!clusterFound) {
            clusters.push({
                lat: lat,
                lng: lng,
                hosts: [host]
            });
        }
    }

    return clusters;
}


function cvs_makeMarker(host) {
    if (host.marker) {
        host.marker.setMap(null);
        host.marker = null;
    }

    var device = host['device_type'];
    if (device == 'router' && !show_routers)
        return;
    if (device == 'gateway' && !show_gateways)
        return;
    if (device == 'portal' && !show_portals)
        return;

    var status2 = host['status'];
    var icon = icons[device][status2];

    if (device == 'router' && status2 == 'green') {
        var users = host['specific_services']['Users']['description'];
        if (users < 30)
            icon = icons['special'][1];
        if (users >= 30 && users < 70)
            icon = icons['special'][2];
        if (users >= 70)
            icon = icons['special'][3];
    }

    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(host['location']['lat'], host['location']['lgn']),
        map: map,
        title: _cvs_create_label(host),
        icon: icon
    });

    google.maps.event.addListener(marker, 'click', function() {
        _cvs_open_pop_up(host);
    });

    host['marker'] = marker;
}

function _cvs_create_label(host) {
    var text = host.hostname;
    if (host.label)
        text = host.label;
    if (host.device_type == 'router') {
        text += "\r\nUsers: " + host.specific_services.Users.description;
    }
    if (host.device_type == 'gateway') {
        text += "\r\nH323 connections: " + host.specific_services.h323.description;
        text += "\r\nVoIP connections: " + host.specific_services.phone_connections.description;
    }
    if (host.device_type == 'portal') {
        text += "\r\nConferences: " + host.specific_services.number_of_conferences.description;
        text += "\r\nUsers: " + host.specific_services.number_of_users.description;
    }
    return text;
}

var cvs_convert_ip_to_location = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        for (var index in nagios_hosts) {
            if (data.ip == nagios_hosts[index].ip_address) {
                if (nagios_hosts[index].location.lat === "") {
                    nagios_hosts[index].location = {
                        lat: data.latitude + Math.random() / 10,
                        lgn: data.longitude + Math.random() / 10
                    };
                }
                markersCount++;
                cvs_makeMarkers();
                return;
            }
        }
    }
};

var _cvs_open_pop_up_summary = function(ip) {
    var host;
    for (var index in nagios_hosts) {
        if (ip === nagios_hosts[index]['ip_address']) {
            host = nagios_hosts[index];
            break;
        }
    }
    selected_host = host;

    $jq('.zoom_link a').text('Zoom out');
    _cvs_show_license_data();


    $jq("#dialog-modal-summary").dialog('option', 'title', "Overall system status");
    $jq("#cvs_summary_portal_conferances_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['number_of_conferences']) + '"  />');
    $jq("#cvs_summary_portal_conferances").text(host['specific_services']['number_of_conferences']['description']);
    cvs_build_history_graph('conferances', 'hour', 'cvs_summary_conferances_history');
    $jq('#cvs_summary_portal_conferances_history').show();
    $jq("#cvs_summary_portal_users_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['number_of_users']) + '"  />');
    $jq("#cvs_summary_portal_users").text(host['specific_services']['number_of_users']['description']);
    cvs_build_history_graph('users', 'hour', 'cvs_summary_users_history');
    $jq('#cvs_summary_portal_users_history').show();

    $jq("#cvs_summary_portal_pools_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['number_of_pools']) + '"  />');
    $jq("#cvs_summary_portal_pools").text(host['specific_services']['number_of_pools']['description']);
    cvs_build_history_graph('pools', 'hour', 'cvs_summary_pools_history');
    $jq('#cvs_summary_portal_pools_history').show();

    var routers_array = [];
    for (var index in host['specific_services']['routeres_involves']) {
        var ip2 = host['specific_services']['routeres_involves'][index][1];
        var label = host['specific_services']['routeres_involves'][index][0];
        if (!label) {
            for (var i in nagios_hosts) {
                if (nagios_hosts[i]['ip_address'] == ip2) {
                    label = nagios_hosts[i]['hostname'];
                    break;
                }
            }
            label = label || ip2;
        }

        routers_array.push({
            ip: ip2,
            label: label,
            users: _cvs_get_number_of_users(ip2)
        });
    }

    _cvs_build_active(host, 'cvs_summary_routers_active', routers_array, 'cvs_routers', 'users');
    var gateways_array = [];
    for (var index in gateways) {
        var gw_host = gateways[index];
        var label = gw_host['label'];
        if (label == undefined)
            label = gw_host['hostname'];
        var users = gw_host['specific_services']['h323']['description'] + gw_host['specific_services']['phone_connections']['description']
        if (users == 0)
            continue;
        gateways_array.push({
            ip: gw_host['ip_address'],
            label: label,
            users: users
        });
    }

    _cvs_build_active(host, 'cvs_summary_gateways_active', gateways_array, 'cvs_gateways', 'endpoints');
    if (!$jq("#dialog-modal-summary").dialog("isOpen")) {
        $jq("#dialog-modal-summary").dialog('open');
        if (refresh_interval_for_popup != null) {
            clearInterval(refresh_interval_for_popup);
        }
        refresh_interval_for_popup = setInterval(_cvs_open_pop_up_summary(ip), 60 * 1000);
    }
}

var refresh_interval_for_popup = null;
var _cvs_open_pop_up = function(host,ip){
        if (ip){
            for (var index in nagios_hosts){
                if (ip == nagios_hosts[index]['ip_address']){
                    host = nagios_hosts[index];
                    break;
                }
            }
        }

        selected_host = host;
        if(host['label'])
            $jq("#dialog-modal").dialog('option', 'title',host['label']);
        else
            $jq("#dialog-modal").dialog('option', 'title',host['hostname']);
        $jq("#cvs_monitoring_si_hostname").text(host['hostname']);
        $jq("#cvs_monitoring_si_ip").text(host['ip_address']);

        $jq("#cvs_monitoring_si_status").html('<img src="'+images_path+'/'+_cvs_get_icon(host)+'" />');
        $jq("#cvs_monitoring_si_type").text(host['device_type'].capitalize());
        $jq('.cvs_chart_wrapper_mini').hide();
        $jq('.cvs_hidden').hide();

        $jq('.cvs_history_link').text('Show history');
        $jq('.zoom_link a').text('Zoom out');

        $jq("#cvs_monitoring_cs_cpu_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['CPU load'])+'"  />');
        $jq("#cvs_monitoring_cs_cpu").text(host['basic_services']['CPU load']['description']);

        $jq("#cvs_monitoring_cs_hdd_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['Disk IO SUMMARY'])+'"  />');
        $jq("#cvs_monitoring_cs_hdd").text(host['basic_services']['Disk IO SUMMARY']['description']);

        $jq("#cvs_monitoring_cs_eth_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['Interface eth0'])+'"  />');
        $jq("#cvs_monitoring_cs_eth").text(host['basic_services']['Interface eth0']['description']);

        $jq("#cvs_monitoring_cs_ddr_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['Memory used'])+'"  />');
        $jq("#cvs_monitoring_cs_ddr").text(host['basic_services']['Memory used']['description']);

        $jq("#cvs_monitoring_cs_tcp_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['TCP Connections'])+'"  />');
        $jq("#cvs_monitoring_cs_tcp").text(host['basic_services']['TCP Connections']['description']);

        if(host['device_type'] == 'router'){
            $jq('#cvs_udp_div').show();

            $jq("#cvs_monitoring_cs_udp_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['UDP'])+'"  />');
            $jq("#cvs_monitoring_cs_udp").text(host['basic_services']['UDP']['description']);
        }

        if(host['device_type'] == 'portal') {
            $jq('#cvs_http_response_div').show();
            $jq("#cvs_monitoring_cs_http_response_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['HTTP'])+'"  />');
            $jq("#cvs_monitoring_cs_http_response").text(host['basic_services']['HTTP']['description']);

            $jq('#cvs_https_div').show();
            $jq("#cvs_monitoring_cs_https_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['HTTPS'])+'"  />');
            $jq("#cvs_monitoring_cs_https").text(host['basic_services']['HTTPS']['description']);

            $jq('#cvs_vp_div').show();
            $jq("#cvs_monitoring_cs_vp_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['proc_VPServer'])+'"  />');
            $jq('#cvs_vr2_div').show();
            $jq("#cvs_monitoring_cs_vr2_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['proc_VR2'])+'"  />');
            $jq('#cvs_vidyo_div').show();
            $jq("#cvs_monitoring_cs_vidyo_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['proc_VidyoManager'])+'"  />');
        }

        $jq("#cvs_monitoring_cs_uptime_img").html('<img src="'+images_path+'/'+_cvs_get_icon(host['basic_services']['Uptime'])+'"  />');
        $jq("#cvs_monitoring_cs_uptime").text(host['basic_services']['Uptime']['description']);

        if (host['device_type'] == "router") {
            $jq('#cvs_router_specific').show();
            $jq("#cvs_monitoring_router_users_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['Users']) + '"  />');
            $jq("#cvs_monitoring_router_users").text(host['specific_services']['Users']['description']);
            cvs_build_history_graph('Users', 'hour', 'cvs_router_users_history');
            $jq('#cvs_monitoring_router_users_history').show();
        }

        if (host['device_type'] == "gateway") {
            $jq('#cvs_gateway_specific').show();

            $jq("#cvs_monitoring_gateway_h323_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['h323']) + '"  />');
            var users = host['specific_services']['h323']['description'];
            if (users < 0)
                users = 'N/A'
            $jq("#cvs_monitoring_gateway_h323").text(users);
            cvs_build_history_graph('h323', 'hour', 'cvs_gateway_h323_history');
            $jq('#cvs_monitoring_gateway_h323_history').show();

            $jq("#cvs_monitoring_gateway_phone_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['phone_connections']) + '"  />');
            var users = host['specific_services']['phone_connections']['description'];
            if (users < 0)
                users = 'N/A'
            $jq("#cvs_monitoring_gateway_phone").text(users);
            cvs_build_history_graph('phone_connections', 'hour', 'cvs_gateway_phone_history');
            $jq('#cvs_monitoring_gateway_phone_history').show();
        }

        if (host['device_type'] == "portal") {
            $jq('#cvs_portal_specific').show();
            $jq('#cvs_portal_specific2').show();
            $jq("#cvs_monitoring_portal_conferances_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['number_of_conferences']) + '"  />');
            $jq("#cvs_monitoring_portal_conferances").text(host['specific_services']['number_of_conferences']['description']);
            cvs_build_history_graph('conferances', 'hour', 'cvs_portal_conferences_history');
            $jq('#cvs_monitoring_portal_conferences_history').show();

            $jq("#cvs_monitoring_portal_users_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['number_of_users']) + '"  />');
            $jq("#cvs_monitoring_portal_users").text(host['specific_services']['number_of_users']['description']);

            cvs_build_history_graph('users', 'hour', 'cvs_portal_users_history');
            $jq('#cvs_monitoring_portal_users_history').show();

            $jq("#cvs_monitoring_portal_pools_img").html('<img src="' + images_path + '/' + _cvs_get_icon(host['specific_services']['number_of_pools']) + '"  />');
            $jq("#cvs_monitoring_portal_pools").text(host['specific_services']['number_of_pools']['description']);
            cvs_build_history_graph('pools', 'hour', 'cvs_portal_pools_history');
            $jq('#cvs_monitoring_portal_pools_history').show();
            var routers_array = [];
            for (var index in host['specific_services']['routeres_involves']) {
                var ip2 = host['specific_services']['routeres_involves'][index][1];
                routers_array.push({
                    ip: ip2,
                    label: host['specific_services']['routeres_involves'][index][0],
                    users: _cvs_get_number_of_users(ip2)
                });
            }
            _cvs_build_active(host, 'cvs_routers_active', routers_array, 'cvs_routers', 'users');
        }
        if (!$jq("#dialog-modal").dialog("isOpen")) {
            if ($jq("#dialog-modal-summary").dialog("isOpen")) {
                $jq("#dialog-modal-summary").dialog('close');
                clearInterval(refresh_interval_for_popup);
            }
            $jq("#dialog-modal").dialog('open');
            if (refresh_interval_for_popup != null) {
                clearInterval(refresh_interval_for_popup);
            }
            refresh_interval_for_popup = setInterval(_cvs_open_pop_up(host, ip), 60 * 1000);
        }
}


function _cvs_build_active(host, view, elements_array,style_class, label){
     var htmls = "<ul class=\""+ style_class+"\">";
    elements_array.sort(function(a, b) {
                  if(a.users == undefined) return 1;
                  if (a.users < b.users) { return 1; }
                  if (a.users > b.users) { return  -1; }
                  return 0;
        });
        for(var i =0;i<elements_array.length;i++){
            var e = elements_array[i];
            if(e.users <= 0)
                continue;
            htmls += '<li><a href="#" onClick="_cvs_open_pop_up(null,\''+e.ip+'\')">'+e.label +'</a> : ';
            htmls += '<strong>' + e.users +'</strong></li>';
        }

        htmls += "</ul>";
        $jq('#'+view).html(htmls);

}

function _cvs_get_number_of_users(ip){
    for (var index in nagios_hosts){
        if (nagios_hosts[index]['ip_address'] == ip) {
            return nagios_hosts[index]['specific_services']['Users']['description'];
        }
    }
}

function _cvs_get_host_from_ip(ip) {
    for (var index in nagios_hosts) {
        if (nagios_hosts[index]['ip_address'] == ip)
            return nagios_hosts[index];
    }
}

// HISTORY GRAPHS

function cvs_build_history_graph(service, period, chart) {
    var path = _cvs_build_history_url(selected_host, service, period);
    var cols = _cvs_get_service_columns(service);

    _cvs_build_history_graph(path, chart, cols, 'HH:mm', 'datetime');
}

function cvs_zoom_history_graph(elem, service, chart){
    var text = $jq(elem).text();

    if (text == 'Zoom out') {
        var newText = 'Zoom in';
        var period = 'day';
    }
    else if (text == 'Zoom in') {
        var newText = 'Zoom out';
        var period = 'hour';
    }

    $jq(elem).text(newText);
    cvs_build_history_graph(service, period, chart);
}

function cvs_toggle_history_graph(elem, service, containerId, chart) {
    var text = $jq(elem).text();

    if (text == 'Show history') {
        var newText = 'Hide history';
        $jq('#' + containerId).show();
    }
    else if (text == 'Hide history') {
        var newText = 'Show history';
        $jq('#' + containerId).hide();
    }

    $jq(elem).text(newText);
    cvs_build_history_graph(service, 'hour', chart);
}

function _cvs_get_service_columns(service) {
    var cols = {
        users: ['Number of users'],
        pools: ['Number of pools'],
        cpu: ['CPU usage'],
        disk: ['Read', 'Write'],
        interface: ['Input', 'Output'],
        memory: ['Used', 'Total'],
        tcp: ['TCP connections'],
        uptime: ['Uptime'],
        udp: ['UDP connections'],
        http: ['Response time'],
        https: ['Number of connections'],
        h323: ['H323 connections'],
        phone_connections: ['VoIP connections'],
        conferances: ['Number of conferences']
    };

    return cols[service.toLowerCase()] || [''];
}

function _cvs_build_history_url(host, service, period) {
    period = period || 'hour';
    var specific_services = ['h323', 'phone_connections', 'users', 'conferances', 'pools'];
    var type = specific_services.indexOf(service.toLowerCase())  > -1 ? host.device_type : 'basic';
    return [type, host.hostname, service, period, ''].join('/');
}

function _cvs_build_history_graph(path, chartName, columns, dateFormat, dateType) {
    var callback = function(data, status) {
        _cvs_build_monitoring_history_graph(data, status, columns, chartName, dateFormat, dateType);
    }

    hideChart(chartName);
    _cvs_history_ajax(path, callback);
}

function _cvs_history_ajax(url,callback){
    jQuery.ajax({
        type: 'POST',
        url:  nagios_host +'history/'+url,
        async: true,
        crossDomain: true,
        data: {token: nagios_auth},
        success: callback,
        error: function(a,b,c){
            cvs_XDomaninRequest('history/'+url, 'token='+nagios_auth, callback);
        }
    });
}

function _cvs_build_monitoring_history_graph(data, textStatus, columnNames, chart, dateFormat, dateType){
    if (textStatus == 'success') {
        dateFormat = dateFormat || 'dd MMM yyyy';
        dateType = dateType || 'date';
        var dataChart = new google.visualization.DataTable();

        dataChart.addColumn(dateType, 'Months');
        for (var i = 0; i < columnNames.length; i++) {
            dataChart.addColumn('number', columnNames[i]);
            dataChart.addColumn({
                type: 'boolean',
                role: 'certainty'
            });
        }

        for (var index in data) {
            var o = data[index];
            var dates = new Date(o['data'] * 1000);
            var value = parseInt(o['value']);
            var certainty = value != -1;
            var row = [dates, value, certainty];

            if (columnNames.length == 2) {
                var second_value = parseInt(o['second_value']);
                var second_certainty = second_value !== -1;
                row = row.concat(second_value, second_certainty)
            }

            dataChart.addRow(row);
        }

        var optionsChart = {
            curveType: 'function',
            hAxis: {title: 'Time', format: dateFormat, gridlines: { count: 6 }, textStyle: { fontSize: 10 }},
            vAxis: {viewWindowMode: "explicit", viewWindow:{ min: 0 }},
            legend: {position:'top'}
        };

        var dateFormatter = new google.visualization.DateFormat({
            pattern: "MMM dd, HH:mm"
        });
        dateFormatter.format(dataChart, 0);

        cvs_displayChart_lineChart(chart, dataChart, optionsChart);
    }
    else
    {
        hideChart(chart);
    }
}

// end HISTORY GRAPHS

function _cvs_show_license_data() {
    $jq('#cvs_license_data_loading').show();
    $jq('#cvs_license_data').hide();

    $jq.ajax({
        type: 'GET',
        url: '/Vidyo/ajax',
        dataType: 'json',
        data: 'graphic=cvs_registrations',
        success: function(data) {
            var d = data.data;
            var content = [
                'Installs: <strong>' + d.Installs.value + '</strong>/' + d.Installs.max,
                'Seats: <strong>' + d.Seats.value + '</strong>/' + d.Seats.max,
                'Ports: <strong>' + d.Ports.value + '</strong>/' + d.Ports.max
            ].join('<br>');

            $jq('#cvs_license_data_loading').hide();
            $jq('#cvs_license_data').html(content).show();
        }
    });
}


function _cvs_make_base_auth(user, password) {
    var tok = user + ':' + password;
    var hash = btoa(tok);
    return "Basic " + hash;
}

function _cvs_create_icons(){
    icons = {};
    for (var index in device_types){
        for (var index2 in states){
            var path = images_path + '/' + device_types[index] + '_' + states[index2] +'.png';
            var myIcon = new google.maps.MarkerImage(
                path,
                null,
                null,
                null,
                new google.maps.Size(40,40));
            var device = device_types[index];
            var color = states[index2];
            if(!icons[device]){
                 icons[device] = {};
            }
            icons[device][color] = myIcon;
        }
    }
    icons['special'] = {}
    for (var i=1;i<4;i++){
        var path = images_path + '/router_green' + i +'.png';
            var myIcon = new google.maps.MarkerImage(
                path,
                null,
                null,
                null,
                new google.maps.Size(40,40));
        icons['special'][i] = myIcon;
    }
}

function _cvs_get_icon(service){
    var img = '';
    if(service['status'] == 0 || service['status'] == 'green')
        img = 'check_icon.png';
    if(service['status'] == 1 || service['status'] == 'yellow')
        img = 'warning_icon.png';
    if(service['status'] > 1 || service['status'] == 'red')
        img = 'error_icon.png';
    return img;
}
