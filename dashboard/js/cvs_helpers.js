/* global Drupal, jQuery, google, chart_type, TopologyGraph */
'use strict';


/*******************************************************************************************************
 * General helpers (Javascript)
 *******************************************************************************************************/
var $jq = jQuery.noConflict();

var mobile_os = ['Android', 'iPad', 'iPhone', 'iPod',
    'SymbianOS', 'BlackBerry', 'Windows Mobile', 'Unknown',
    'bada'
];

var has_monitoring_access = false;
var images_path;
var nagios_auth = '';
var nagios_host = '';
google.load('visualization', '1.0', {'packages': ['annotatedtimeline', 'corechart', 'gauge', 'table']});

Drupal.behaviors.cern_vidyo_statistics_config = {
    attach: function (context, settings) {
        has_monitoring_access= Drupal.settings.cern_vidyo_statistics_config.has_monitoring_access;
        images_path =  Drupal.settings.cern_vidyo_statistics_config.images_path;
        nagios_auth = Drupal.settings.cern_vidyo_statistics_config.nagios_auth;
        nagios_host = Drupal.settings.cern_vidyo_statistics_config.nagios_host;
    }
};

var refresh_interval_tab0;
var refresh_interval_tab1_subtab0;
var refresh_interval_tab1_subtab1;
var refresh_interval_tab1_subtab2;
var refresh_interval_tab1_subtab3;
var refresh_interval_tab2_subtab0;
var minutes_in_conf_interval;
var strippedTopologyGraph;


function cvs_load_tab(tab_number) {
    stopUpdate();
    switch (tab_number) {
        case 1:
            // Refresh data every minute on the client side
            cvs_load_tab1_subtab_0();
            break;
        case 2:
            // Refresh data every minute on the client side
            $jq("#cvs_tab2_subtabs").tabs("option", "selected", 1);
            cvs_load_tab2_data('year');
            break;
        case 3:
            cvs_load_tab3();
            break;
        default:
            // Refresh data every minute on the client side
            cvs_load_tab_0()
            break;
    }
}

function cvs_load_tab2_subtabs(tab_number) {
    switch (tab_number) {
        case 1:
            // Refresh data every minute on the client side
            cvs_load_tab2_data('year');
            break;
        case 2:
            // Refresh data every minute on the client side
            cvs_load_tab2_data('month');
            break;
        case 3:
            // Refresh data every minute on the client side
            cvs_load_tab2_data('day');
            break;
        default:
            // Refresh data every minute on the client side
            cvs_load_tab2_data('last_year');
            break;
    }
}
function cvs_load_tab1_subtabs(tab_number) {
    switch (tab_number) {
        case 1:
            // Refresh data every minute on the client side
            cvs_load_tab1_subtab_1();
            break;
        case 2:
            // Refresh data every minute on the client side
            cvs_load_tab1_subtab_2();
            break;
        case 3:
            // Refresh data every minute on the client side
            cvs_load_tab1_subtab_3();
            break;
        default:
            // Refresh data every minute on the client side
            cvs_load_tab1_subtab_0();
            break;
    }
}

function cvs_load_tab2_data(period) {
    var background_worker = function() {
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=' + period + '&method=UserSettings.getBrowser'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=' + period + '&method=UserSettings.getOS'
        });
        if (period == 'day') {
            var method = 'VisitTime.getVisitInformationPerLocalTime';
        } else {
            var method = 'VisitsSummary.get';
        }
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_evolution_graph,
            data: 'graphic=pwiki&period=' + period + '&method=' + method
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drow_piwki_map,
            data: 'graphic=pwiki&period=' + period
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drow_piwki_overall,
            data: 'graphic=pwiki&period=' + period
        });

        var d = new Date().toString();
        $jq(".last_update_piwki").text(d);
    };

    refresh_interval_tab2_subtab0 = setInterval(background_worker, 5 * 60 * 1000);
    //first display
    background_worker();
}

function cvs_load_tab1_subtab_1() {
    var background_worker = function() {
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_installations,
            data: 'graphic=cvs_installations'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_registrations,
            data: 'graphic=cvs_registrations'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_device_users,
            data: 'graphic=cvs_users_devices'
        });
    };
    refresh_interval_tab1_subtab1 = setInterval(background_worker, 60 * 1000);
    //first display
    background_worker();
}

function cvs_load_tab1_subtab_2() {
    var background_worker = function() {
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_groups,
            data: 'graphic=cvs_groups'
        });
    };
    refresh_interval_tab1_subtab2 = setInterval(background_worker, 60 * 1000);
    //first display
    background_worker();
}

function cvs_load_tab1_subtab_3() {
    var background_worker = function() {
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_legacies,
            data: 'graphic=cvs_legacies'
        });
    };
    refresh_interval_tab1_subtab3 = setInterval(background_worker, 60 * 1000);
    //first display
    background_worker();
}

function cvs_load_tab1_subtab_0() {
    // max sim callers last 24 hours
    var background_worker = function() {
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_maxSimCallers,
            data: 'graphic=cvs_maxSimCallers'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_usersInConferenceCalls,
            data: 'graphic=cvs_usersInConferenceCalls'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_uniqueUsersPerMonth,
            data: 'graphic=cvs_uniqueUsersPerMonth'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_meetings,
            data: 'graphic=cvs_meetings'
        });

        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_top10meeting_yearly,
            data: 'graphic=cvs_top_connection_meetings_yearly'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_callersPerMeeting,
            data: 'graphic=cvs_callersPerMeeting'
        });


    };
    refresh_interval_tab1_subtab0 = setInterval(background_worker, 60 * 1000);
    //first display
    cvs_minutes_in_conf_builder(1);
    background_worker();
}

function cvs_load_tab_0() {
    strippedTopologyGraph = strippedTopologyGraph || TopologyGraph('#cvs_stripped_topology_container');
    strippedTopologyGraph.start();

    // max sim callers last 24 hours
    var background_worker = function() {
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_maxSimCallersLast24,
            data: 'graphic=cvs_maxSimCallersLast24'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_top10meeting_dayly,
            data: 'graphic=cvs_top_connection_meetings_day'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_usersInConferenceCallsLast24,
            data: 'graphic=cvs_usersInConferenceCallsLast24'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_meetingsLastWeek,
            data: 'graphic=cvs_meetingsLastWeek'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_callersPerMeeting,
            data: 'graphic=cvs_callersPerMeeting'
        });
    };

    refresh_interval_tab0 = setInterval(background_worker, 60 * 1000);
    //first display
    background_worker();
}

function stopUpdate(){
    clearInterval(refresh_interval_tab0);
    clearInterval(refresh_interval_tab1_subtab0);
    clearInterval(refresh_interval_tab2_subtab0);
    clearInterval(refresh_interval_tab1_subtab1);
    clearInterval(refresh_interval_tab1_subtab2);
    clearInterval(refresh_interval_tab2_subtab0);
}

function cvs_minutes_in_conf_builder(step) {
    clearInterval(minutes_in_conf_interval);
    var background_worker = function() {
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_minutesInConference,
            data: 'graphic=cvs_minutesInConf&step=' + step
        });
    };

    minutes_in_conf_interval = setInterval(background_worker, 60 * 1000);
    background_worker();
}

var cvs_drow_piwki_map = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var period = data.period;
        if (period != 'day') {
            period = 'range';
        }
        var o = data.data;
        var url = o.piwik_portal + 'index.php?module=Widgetize&action=iframe&moduleToWidgetize=UserCountryMap&actionToWidgetize=visitorMap&idSite=' + o.piwik_site + '&period=' + period + '&date=' + o.date + '&disableLink=1&widget=1&token_auth=' + o.auth_token;
        var map = '<h3 style="text-align: center">Countries</h3><div id="widgetIframe"><iframe width="100%" height="520" src="' + url + '" scrolling="no" frameborder="0" marginheight="1" marginwidth="0"></iframe></div>';
        $jq("#cvs_map_" + data.period).html(map);
    }
};

var cvs_drow_piwki_overall = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var period = data.period;
        if (period != 'day') {
            period = 'range';
        }
        var o = data.data;
        var url = o.piwik_portal + 'index.php?module=Widgetize&action=iframe&moduleToWidgetize=VisitsSummary&actionToWidgetize=getSparklines&idSite=' + o.piwik_site + '&period=' + period + '&date=' + o.date + '&disableLink=1&widget=1&token_auth=' + o.auth_token;
        var map = '<iframe width="400" height="450" src="' + url + '" scrolling="no" frameborder="0" marginheight="1" marginwidth="0"></iframe>';
        $jq("#cvs_overall_" + data.period).html(map);
    }
};

//get the transpous matrix
function _cvs_convert_matrix(matrix) {
    var columns_array = [''];
    var values_array = [''];
    for (var i = 0; i < matrix.length; i++) {
        if (matrix[i][0]) {
            columns_array.push(matrix[i][0]);
            values_array.push(matrix[i][1]);
        }

    }
    return [columns_array, values_array];
}



//----------------------------------------------------------------------------------------------------------------------------

// On document load, execute this: this is done after the loading of the DOM
$jq(document).ready(function() {
    $jq("#cvs_tabs").tabs();

    if (!has_monitoring_access) {
        $jq("#cvs_tabs").tabs("remove", 3);
    }
    _cvs_create_icons();

    jQuery.ajax({
        type: 'POST',
        url: nagios_host + 'hosts/',
        async: true,
        crossDomain: true,
        data: 'token=' + nagios_auth,
        success: cvs_get_nagios_host_only,
        error: function(a, b, c) {
            if (b == "timeout") {
                show_block_offline();
            } else {
                cvs_XDomaninRequest('hosts/', 'token=' + nagios_auth, cvs_get_nagios_host_only);
            }
        },
    });
    // to avoid to render charts in the second page when it is hidden, load it only when clicked
    $jq("#cvs_tabs").tabs({
        show: function(event, ui, xhr, status, index, anchor) {
            // generate the other tabs ONLY when they are showed
            cvs_load_tab($jq("#cvs_tabs").tabs("option", "selected"));
        },
        selected: 0
    });

    // render subtabs of the tab1
    $jq("#cvs_tab1_subtabs").tabs({
        show: function(event, ui, xhr, status, index, anchor) {
            // generate the other subtabs ONLY when they are clicked
            if ($jq("#cvs_tabs").tabs("option", "selected") == 1)
                cvs_load_tab1_subtabs($jq("#cvs_tab1_subtabs").tabs("option", "selected"));
        },
        selected: 0
    });

    // render subtabs of the tab2
    $jq("#cvs_tab2_subtabs").tabs({
        show: function(event, ui, xhr, status, index, anchor) {
            // generate the other subtabs ONLY when they are clicked
            if ($jq("#cvs_tabs").tabs("option", "selected") == 2)
                cvs_load_tab2_subtabs($jq("#cvs_tab2_subtabs").tabs("option", "selected"));
        },
        selected: 0
    });
    cvs_load_tab_0();
    //$jq("#cvs_callersPerMeeting_toggleLogScale").button().click(function(){
    $jq("#cvs_callersPerMeeting_toggleLogScale").button().click(function() {
        cvs_callersPerMeeting_logScale = !cvs_callersPerMeeting_logScale;
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_drawChart_callersPerMeeting,
            data: 'graphic=cvs_callersPerMeeting'
        });
        return false;
    });
    $jq("#cvs_toggleBarChartDay").button().click(function() {
        chart_type['day'] = !chart_type['day'];
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=day&method=UserSettings.getBrowser'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=day&method=UserSettings.getOS'
        });
        return false;
    });

    $jq("#cvs_toggleBarChartMonth").button().click(function() {
        chart_type.month = !chart_type.month;
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=month&method=UserSettings.getBrowser'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=month&method=UserSettings.getOS'
        });
        return false;
    });
    $jq("#radio").buttonset();
    $jq("#r_ev").buttonset();


    $jq("#cvs_toggleBarChartYear").button().click(function() {
        chart_type.year = !chart_type.year;
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=year&method=UserSettings.getBrowser'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=year&method=UserSettings.getOS'
        });
        return false;
    });

    $jq("#cvs_toggleBarChartLastYear").button().click(function() {
        chart_type.last_year = !chart_type.last_year;
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=last_year&method=UserSettings.getBrowser'
        });
        jQuery.ajax({
            type: 'GET',
            url: '/Vidyo/ajax',
            dataType: 'json',
            success: cvs_draw_piwki_bar_graph,
            data: 'graphic=pwiki&period=last_year&method=UserSettings.getOS'
        });
        return false;
    });

    $jq("#dialog-no-data").dialog({
        width: 950,
        modal: true,
        autoOpen: false
    });
    $jq("#dialog-modal").dialog({
        width: 950,
        modal: true,
        autoOpen: false
    });
    $jq("#dialog-modal-summary").dialog({
        width: 950,
        modal: true,
        autoOpen: false
    });
});

// Used to detect whether the users browser is an mobile browser
function isMobile() {
    if (sessionStorage.desktop) // desktop storage
        return false;
    else if (localStorage.mobile) // mobile storage
        return true;

    // alternative
    var mobile = ['iphone', 'ipad', 'android', 'blackberry', 'nokia', 'opera mini', 'windows mobile', 'windows phone', 'iemobile'];
    for (var i in mobile)
        if (navigator.userAgent.toLowerCase().indexOf(mobile[i].toLowerCase()) > 0)
            return true;

        // nothing found.. assume desktop
    return false;
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
