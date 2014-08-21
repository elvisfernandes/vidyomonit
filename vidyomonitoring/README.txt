manage.py: Script for generating SQLite DB (./manage.py syncdb).
models.py: Definition of django models to create the SQLite db. Each class is a table and variables are rows with model types.
permissions.py: Authentication via token and fall back to username and password. Use django authentication to login on html.
settings.py: Define database path, nagios server, mysql server and basic services.
static: images, css, js, etc
templates: html files
templatetags: increment vars
urls.py: define the urls
utils.py: get json from nagios api and parse the values
views.py: define views and behavior when a page is selected
wsgi.wsgi: define wsgi for apache
logging: import logging; logging.error()
