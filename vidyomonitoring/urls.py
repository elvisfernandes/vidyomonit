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

# URL & routing definitions.

from django.conf.urls.defaults import *
# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns(
    '',
    # Example:
    # (r'^application/', include('application.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # (r'^admin/', include(admin.site.urls)),
    url(r'^hosts/$', 'views.get_all_hosts'),
    url(r'^hosts/delete$', 'views.delete_all_hosts'),
    url(r'^login/$', 'views.token_generate'),
    url(r'^history/(?P<device_type>\w+)/(?P<hostname>[\w.-]+)/(?P<service>\w+)/?$', 'views.get_device_history'),
    url(r'^history/(?P<device_type>\w+)/(?P<hostname>[\w.-]+)/(?P<service>\w+)/(?P<period>\w+)/?$', 'views.get_device_history'),
    url(r'^locations/$', 'views.admin_location'),
    url(r'^loggin/$', 'views.loggin'),
    url(r'^logout/$', 'views.logout'),
    url(r'^alert/users/$', 'views.alert_users'),
    url(r'^alert/history/$', 'views.alert_history'),
    url(r'^ajax/updateposition/$', 'views.updateposition'),
    url(r'^ajax/check_ip/$', 'views.check_ip'),
    url(r'^ajax/add_host/$', 'views.add_host'),
    url(r'^ajax/minutes_in_conferences/$', 'views.mintesInCoferences'),
    url(r'^ajax/active_conferences/$', 'views.active_conferences'),
    url(r'^ajax/vidyorooms/$', 'views.vidyoRooms'),
    url(r'^$', 'views.admin'),
)
