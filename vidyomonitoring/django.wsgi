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
