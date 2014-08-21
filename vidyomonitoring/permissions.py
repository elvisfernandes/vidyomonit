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
