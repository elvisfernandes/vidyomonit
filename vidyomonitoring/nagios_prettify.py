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

# Prettify Nagios socket data.

import re
from datetime import datetime, timedelta
import ujson
import itertools

excludedservices = [
    'Check_MK',
    'Interface eth1',
    'Interface virbr0',
    'Current Load',
    'Current Users',
    'PING',
    'Root Partition',
    'SSH',
    'Swap Usage',
    'Total Processes']

excludedhosts = ['localhost']

def secsToDHMS(secs):
    sectd = timedelta(seconds = secs)
    d = datetime(1, 1, 1) + sectd
    return '%d days %dh:%dm:%ds' % (d.day - 1, d.hour, d.minute, d.second)


def getPerformanceValue(sought, datastring):
    prefixpattern = re.compile(sought)
    matchprefixobj = prefixpattern.search(datastring)
    matchedprefix = ''
    if matchprefixobj != None:
        matchedprefix = matchprefixobj.group()

    regex = sought + '\d+(\.(\d{1,2})){0,1}'
    pattern = re.compile(regex)
    matchobj = pattern.search(datastring)
    matched = 'not found'
    if matchobj != None:
        matched = matchobj.group().replace(matchedprefix, '')

    return matched


def createText(service, datastring):
    cases = {
        'CPU load': handle_cpuload,
        'Interface eth0': handle_interface,
        'Interface eth1': handle_interface,
        'Interface virbr0': handle_interface,
        'Disk IO SUMMARY': handle_diskio,
        'Memory used': handle_memused,
        'TCP Connections': handle_tcpconns,
        'Uptime': handle_uptime,
        'HTTP': handle_http,
        'HTTPS': handle_https,
        'UDP': handle_udp,
        'Number of threads': handle_threadcount,
        'Tomcat': handle_tomcat }

    handler = cases.get(service, handle_default)
    return handler(datastring)


def handle_cpuload(performancestring):
    results = []
    try:
        value1 = str(int(float(getPerformanceValue('load1=', performancestring))))
        value5 = str(int(float(getPerformanceValue('load5=', performancestring))))
        results.append(value1 + '% avg per 1 min')
    except:
        return ['Unknown']
    return results


def handle_interface(performancestring):
    results = []
    try:
        ins = str('%.2f' % ( float(getPerformanceValue('in=', performancestring)) / 1024) )
        outs = str('%.2f' % ( float(getPerformanceValue('out=', performancestring)) / 1024) )
        #results.append('In: ' + ins + ', Out: ' + outs + ' KB/sec')
        results.append(ins + ' (in), ' + outs + ' (out) KB/sec')
    except:
        return ['Unknown']
    return results


def handle_diskio(performancestring):
    results = []
    try:
        reads = str('%.2f' % ( float(getPerformanceValue('read=', performancestring) ) / 1024) )
        writes = str('%.2f' % ( float(getPerformanceValue('write=', performancestring)) / 1024) )
        #results.append('Read: ' + reads + ', Write: ' + writes + ' KB/sec')
        results.append(reads + ' (read), ' + writes + ' (write) KB/sec')
    except:
        return ['Unknown']
    return results


def handle_memused(performancestring):
    results = []
    try:
        memused = getPerformanceValue('memused=', performancestring).split('.')[0]
        totalmem = getPerformanceValue('memused=(\d*(\.\d*)?(MB)?;){4}', performancestring).split('.')[0]
        results.append(memused + ' of ' + totalmem + ' MB')
    except:
        return ['Unknown']
    return results


def handle_tcpconns(performancestring):
    results = []
    try:
        est = getPerformanceValue('ESTABLISHED=', performancestring)
        results.append(est)
    except:
        return ['Unknown']
    return results


def handle_uptime(performancestring):
    results = []
    try:
        value = secsToDHMS(int(getPerformanceValue('uptime=', performancestring).split('.')[0]))
        results.append(value)
    except:
        return ['Unknown']
    return results


def handle_http(performancestring):
    results = []
    try:
        rsptime = getPerformanceValue('time=', performancestring)
        #results.append('Response time: ' + rsptime + 's')
        results.append(rsptime + 's (rsp time)')
    except:
        return ['Unknown']
    return results


def handle_https(performancestring):
    results = []
    try:
        count = getPerformanceValue('count=', performancestring)
        results.append(count)
    except:
        return ['Unknown']
    return results


def handle_udp(performancestring):
    results = []
    try:
        count = getPerformanceValue('count=', performancestring)
        results.append(count)
    except:
        return ['Unknown']
    return results


def handle_threadcount(performancestring):
    results = []
    try:
        value = getPerformanceValue('threads=', performancestring)
        results.append('Threads: ' + value)
    except:
        return ['Unknown']
    return results


def handle_tomcat(performancestring):
    results = []
    try:
        used = str(int(getPerformanceValue('used=', performancestring)) / (1024 * 1024))
        free = getPerformanceValue('free=', performancestring)
        max = str(int(getPerformanceValue('max=', performancestring)) / (1024 * 1024))
        currentThreadCount = getPerformanceValue('currentThreadCount=', performancestring)
        currentThreadBusy = getPerformanceValue('currentThreadBusy=', performancestring)
        maxthreads = getPerformanceValue('maxThreads=', performancestring)
        results.append('Threads: ' + currentThreadCount + ' MaxThreads: ' + maxthreads + ' MemUsed: ' + used + 'MB' + ' (' + max + 'MB' + ')')
    except:
        return ['Unknown']
    return results


def handle_default(performancestring):
    results = [performancestring]
    return results


def removeDups(l):
    k = ujson.loads(l)
    k.sort()
    l = list(k for k, _ in itertools.groupby(k))
    return ujson.dumps(l)


def removeExcluded(result):
    temp = []
    for item in result:
        for x in item:
            if x in excludedhosts or x in excludedservices:
                temp.append(item)
                continue
    return filter(lambda result: result not in temp, result)


def setCateg(c):
    if c == 'HW' or c == 'HWN':
        categ = 'HW'
    elif c == 'SW' or c == 'SWN':
        categ = 'SW'
    else:
        categ = 'OT'
    return categ


def prettify(answer):
    result = removeExcluded(eval(answer))
    for item in result:
        if len(item) > 3:
            item[3] = createText(item[1], item[3])
            for c in item[4]:
                item[4] = setCateg(c)

    return result
