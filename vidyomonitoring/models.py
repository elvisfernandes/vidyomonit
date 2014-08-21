from django.db import models


class report_monthly(models.Model):
    datetime = models.DateTimeField(auto_now_add=True)
    meetings_nb = models.IntegerField()
    connection_soft = models.IntegerField()
    connection_voip = models.IntegerField()
    connection_h323 = models.IntegerField()


class Hosts(models.Model):
    hostname = models.CharField(max_length=100)
    ip_address = models.CharField(max_length=50)
    host_type = models.CharField(max_length=50)
    label = models.CharField(max_length=50)
    location_lgn = models.CharField(max_length=50)
    location_lat = models.CharField(max_length=50)


class auth_token(models.Model):
    token = models.CharField(max_length=100)
    validity = models.DateTimeField()


class alert_users(models.Model):
    name = models.CharField(max_length=50)
    email = models.CharField(max_length=50)
    phone = models.CharField(max_length=50)


class main_portal(models.Model):
    host = models.CharField(max_length=50)
    username = models.CharField(max_length=50)
    password = models.CharField(max_length=50)
    database = models.CharField(max_length=50)


class alert(models.Model):
    datetime = models.DateTimeField(auto_now_add=True)
    body = models.CharField(max_length=2000)
    alert_type = models.CharField(max_length=50)


class BasicStatus(models.Model):
    host = models.ForeignKey('Hosts')
    datetime = models.DateTimeField(auto_now_add=True)
    cpu_persentage = models.IntegerField()
    cpu_status = models.IntegerField()
    disc_read = models.IntegerField()
    disc_write = models.IntegerField()
    disc_status = models.IntegerField()
    eth_in = models.IntegerField()
    eth_out = models.IntegerField()
    eth_status = models.IntegerField()
    memory_used = models.IntegerField()
    memory_total = models.IntegerField()
    memory_status = models.IntegerField()
    tcp_est = models.IntegerField()
    tcp_closed = models.IntegerField()
    tcp_status = models.IntegerField()
    udp_est = models.IntegerField()
    udp_status = models.IntegerField()
    response_time = models.IntegerField()
    response_status = models.IntegerField()
    https_con = models.IntegerField()
    https_status = models.IntegerField()
    vp_server_value = models.IntegerField()
    vp_server_status = models.IntegerField()
    vr2_server_value = models.IntegerField()
    vr2_server_status = models.IntegerField()
    vidyo_manager_value = models.IntegerField()
    vidyo_manager_status = models.IntegerField()
    uptime = models.IntegerField()
    uptime_status = models.IntegerField()


class RouterSpecific(models.Model):
    host = models.ForeignKey('Hosts')
    datetime = models.DateTimeField(auto_now_add=True)
    number_of_users = models.IntegerField()


class GatewaySpecific(models.Model):
    host = models.ForeignKey('Hosts')
    datetime = models.DateTimeField(auto_now_add=True)
    h323 = models.IntegerField()
    phone_connections = models.IntegerField()


class PortalSpecific(models.Model):
    datetime = models.DateTimeField(auto_now_add=True)
    number_of_users = models.IntegerField()
    number_of_conferences = models.IntegerField()
    number_of_pools = models.IntegerField()
