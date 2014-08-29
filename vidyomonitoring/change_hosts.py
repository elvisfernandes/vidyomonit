# -*- coding: utf-8 -*-
##
##
## This file is part of the CERN Dashboards and Monitoring for Vidyo
## Copyright (C) 2014 European Organization for Nuclear Research (CERN)
##
## CERN Dashboards and Monitoring for Vidyo is free software: you can redistribute it and/or
## modify it under the terms of the GNU General Public License as
## published by the Free Software Foundation, either version 3 of the
## License, or (at your option) any later version.
##
## CERN Dashboards and Monitoring for Vidyo is distributed in the hope that it will be useful, but
## WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
## GNU General Public License for more details.
##
## You should have received a copy of the GNU General Public License
## along with the CERN Dashboards and Monitoring for Vidyo software.  If not, see <http://www.gnu.org/licenses/>.

# Run a host update.

import socket
import re
import logging


logger = logging.getLogger('django')


all_hosts = []
path = '/etc/check_mk/conf.d/hosts.mk'


def isValidHostname(v):
    try:
        ValidHostnameRegex = "^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$"
        return re.match(ValidHostnameRegex, v).group(0)
    except:
        return False


def hostname_resolves(hostname):
    try:
        socket.gethostbyname(hostname)
        return True
    except socket.error:
        return False


def changeHosts(option, hostname, type='routers', ssh='no', restart_cmk=True):
    optionL = ['add', 'remove']
    typeL = ['routers', 'gws', 'portals']
    sshL = ['yes', 'no']

    message = ''

    if option not in optionL:
        message = "Option not valid - ['add', 'remove']"
    elif not isValidHostname(hostname):
        message = "Hostname not valid"
    elif not hostname_resolves(hostname):
        message = "Hostname does not resolve"
    elif type not in typeL:
        message = "Type not valid - ['routers','gws','portals'])"
    elif ssh not in sshL:
        message = "SSH option not valid - ['yes', 'no']"
    else:
        # Open file and execute code
        with open(path, 'r') as f:
            code = f.read()
            exec(code)

        # Create string to be added
        string = hostname + '|' + type
        if ssh == 'yes':
            string += '|ssh'

        all_hosts = set(all_hosts)

        # Add or remove entry from set
        if 'add' in option:
            copy = all_hosts.copy()
            for result in copy:
                splitted = result.split('|')
                if hostname == splitted[0] or socket.gethostbyname(hostname) == splitted[0]:
                    all_hosts.discard(result)
            all_hosts.add(string)
        else:
            copy = all_hosts.copy()
            for result in copy:
                splitted = result.split('|')
                if hostname == splitted[0] or socket.gethostbyname(hostname) == splitted[0]:
                    all_hosts.discard(result)

        all_hosts = list(all_hosts)
        s = str(all_hosts)
        s = 'all_hosts = ' + s

        # Write file
        with open(path, 'w') as f:
            f.write(s)

        if restart_cmk:
            import os
            ret = os.system("sudo /usr/bin/cmk -R")
            if ret != 0:
                logger.error('Reloading check_mk (cmk -R) failed with error: %s' % ret)

        message = "OK"

    return message
