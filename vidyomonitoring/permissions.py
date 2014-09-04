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

# User auth helpers.

from django.http import HttpResponseForbidden
from django.contrib.auth import authenticate
from django.shortcuts import render_to_response
from application import models
import datetime


def is_logged_in(func):
    def decorator(request, *args, **kwargs):
        if has_valid_auth_params(request):
            return func(request, *args, **kwargs)
        else:
            response = HttpResponseForbidden()
            response["Access-Control-Allow-Origin"] = "*"
            return response

    return decorator


def is_logged_in_html(func):
    def decorator(request, *args, **kwargs):
        id = request.session.get('member_id')
        if id:
            return func(request, *args, **kwargs)
        else:
            response = render_to_response('login.html', {'not_logged_in': True, 'url_redirect': request.get_full_path()})
        return response
    return decorator


def has_valid_auth_params(request):
    """
    Check whether request contains a valid auth parameters.
    """
    username = request.POST.get('username', None)
    password = request.POST.get('password', None)
    token = request.POST.get('token', request.GET.get('token', None))

    if ((username and password) or token):
        if token:
            is_auth = models.auth_token.objects.filter(token=token)
            if is_auth.count:
                t = is_auth.get()
                now = datetime.datetime.now()
                return t.validity > now
        else:
            user = authenticate(username=username, password=password)
            return user and user.is_active

    return False
