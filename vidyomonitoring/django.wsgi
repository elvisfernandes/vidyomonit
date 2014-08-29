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

# Application WSGI script

import os
import sys

path = '/var/proxy/vidyomonitoring'
path2 = '/var/proxy/vidyomonitoring/application'
if path not in sys.path:
    sys.path.append(path)
    sys.path.append(path2)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "application.settings")

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()
