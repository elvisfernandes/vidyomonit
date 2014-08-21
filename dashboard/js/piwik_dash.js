
// Piwik tracking code

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

// End of Piwik tracking code

