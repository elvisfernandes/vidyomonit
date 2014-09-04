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

# API to Nagios socket.

import socket
import conf

from application.nagios_prettify import prettify, removeDups
from application.change_hosts import changeHosts


# Try to update this to open a socket only once
def cmd2nagios(cmd="GET hosts\nColumns: host_name\nOutputFormat: json\n", sock=conf.SOCKET_PATH):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect(sock)

    # Write command to socket
    s.send(cmd)

    # Important: Close sending direction. That way
    # the other side knows, we are finished.
    s.shutdown(socket.SHUT_WR)

    # Now read the answer
    answer = s.recv(100000000)

    return prettify(answer)


def hosts_list():
    return cmd2nagios("GET hosts\nColumns: host_name address state\nOutputFormat: json\n")


def hosts_list2():
    return cmd2nagios("GET hosts\nColumns: host_name\nOutputFormat: json\n")


def host_show(host):
    return cmd2nagios("GET hosts\nColumns: host_name address state\nFilter: host_name ~~ %s\nOutputFormat: json\n" % host)


def host_service_list(host):
    return cmd2nagios("GET services\nColumns: host_name description state perf_data groups\nFilter: host_name ~~ %s\nOutputFormat: json\n" % host)


def services_list():
    return cmd2nagios("GET services\nColumns: host_name description state perf_data groups\nOutputFormat: json\n")


def services_list2():
    return removeDups(cmd2nagios("GET services\nColumns: description\nOutputFormat: json\n"))


def service_show(service):
    return cmd2nagios("GET services\nColumns: host_name description state perf_data groups\nFilter: description ~~ %s\nOutputFormat: json\n" % service)


def service_hosts_list(service):
  # Needs to be fixed. Doesnt filter by service. Gives all hosts.
    return cmd2nagios("GET hosts\nColumns: host_name services_with_info\nFilter: services_with_info ~~ %s\nOutputFormat: json\n" % service)


def service_hosts_show(service, host):
    return cmd2nagios("GET services\nColumns: host_name description state perf_data groups\nFilter: description ~~ %s\nFilter: host_name ~~ %s\nOutputFormat: json\n" % (service, host))


def add_host(host):
    return changeHosts('add', host)


def add_host_type(host, type):
    return changeHosts('add', host, type)


def add_host_type_ssh(host, type, ssh):
    return changeHosts('add', host, type, ssh)


def remove_host(host):
    return changeHosts('remove', host)

services = [
    ['hosts', hosts_list],
    ['hosts/list', hosts_list2],
    ['hosts/(?P<p1>.*)', host_show],
    ['hosts/(?P<p1>.*)/services', host_service_list],
    ['services', services_list],
    ['services/list', services_list2],
    ['services/(?P<p1>.*)', service_show],
    ['services/(?P<p1>.*)/hosts', service_hosts_list],
    ['services/(?P<p1>.*)/hosts/(?P<p2>.*)', service_hosts_show],
    ['add/(?P<p1>.*)', add_host],
    ['add/(?P<p1>.*)/type/(?P<p2>.*)', add_host_type],
    ['add/(?P<p1>.*)/type/(?P<p2>.*)/ssh/(?P<p3>.*)', add_host_type_ssh],
    ['remove/(?P<p1>.*)', remove_host]
]
