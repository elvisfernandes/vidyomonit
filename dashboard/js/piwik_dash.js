/*
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

# Piwik tracking code.
*/

var pkBaseURL = (("https:" == document.location.protocol) ? "https://piwik.web.cern.ch/" : "http://piwik.web.cern.ch/");

var piwik_js = document.createElement('script');
    piwik_js.setAttribute("type","text/javascript");
    piwik_js.setAttribute("src", pkBaseURL + "piwik.js");
    var executor = function ()
    {
       try {
      var piwikTracker = Piwik.getTracker(pkBaseURL + "piwik.php", 162);
      piwikTracker.trackPageView();
      piwikTracker.enableLinkTracking();
      } catch( err ) {
	}

    }

    piwik_js.onreadystatechange= function ()
    {
       if (this.readyState == 'complete')
       executor();
    }
    piwik_js.onload = executor;

    document.getElementsByTagName('head')[0].insertBefore(piwik_js, document.getElementsByTagName('head')[0].firstChild);
