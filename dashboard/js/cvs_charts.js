/*
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

# Chart definitions.
*/

/* global jQuery, google */
'use strict';

/*******************************************************************************************************
 * Chart helpers (Javascript)
 *******************************************************************************************************/
var $jq = jQuery.noConflict();
//----------------------------------------------------------------------------------------------------------------------------
// Google Charts
//----------------------------------------------------------------------------------------------------------------------------
function displayChart(chart_name){
    $jq("#"+chart_name+"_loading").hide();
    $jq("#"+chart_name+"_chart").show();
    var d = new Date().toString();
    $jq("#"+chart_name+"_lastupdate").text(d);

}

function hideChart(chart_name){
    $jq("#"+chart_name+"_loading").show();
    $jq("#"+chart_name+"_chart").hide();
}

/*******************************************************************************************************
* CHART HELPERS
******************************************************************************************************/
// display the annotated timeline chart in the web page
function cvs_displayChart_annotated(elementId, dataChart, optionsChart) {
    if (isMobile()) {
        optionsChart.chartArea = {top: 10, bottom: 10, height: 400};
        optionsChart.hAxis = { gridlines: { count: 10 }, textStyle: { fontSize: 10 }  };
        optionsChart.vAxis = {  viewWindowMode: "explicit", viewWindow:{ min: 0 } };
        optionsChart.legend = {position: 'none', textStyle: {fontSize:10}};


        return cvs_displayChart_lineChart(elementId, dataChart, optionsChart)
    }

    displayChart(elementId);
    var chart = new google.visualization.AnnotatedTimeLine(document.getElementById(elementId + "_chart_container"));
    chart.draw(dataChart, optionsChart);
    return chart;
}

function cvs_displayChart_annotated_combo(elementId, dataChart, optionsChart) {
    if (isMobile()) {
        optionsChart.chartArea = {top: 10, bottom: 10, height: 400};
        optionsChart.hAxis = { gridlines: { count: 10 }, textStyle: { fontSize: 10 }  };
        optionsChart.vAxis = {  viewWindowMode: "explicit", viewWindow:{ min: 0 } };
        optionsChart.legend = {position: 'none', textStyle: {fontSize:10}};
        return cvs_displayChart_lineChart(elementId, dataChart, optionsChart);
    }

    displayChart(elementId);

    // Create a DataView that adds another column which is all the same (empty-string) to be able to aggregate on.
    var viewWithKey = new google.visualization.DataView(dataChart);
    viewWithKey.setColumns([0, 1, {
        type: 'string',
        label: '',
        calc: function(d, r) {
            return '';
        }
    }]);

    // Aggregate the previous view to calculate the average. This table should be a single table that looks like:
    // [['', AVERAGE]], so you can get the Average with .getValue(0,1)
    var group = google.visualization.data.group(viewWithKey, [2], [{
        column: 1,
        id: 'avg',
        label: 'average',
        aggregation: google.visualization.data.avg,
        'type': 'number'
    }]);

    // Create a DataView where the third column is the average.
    var dv = new google.visualization.DataView(dataChart);
    dv.setColumns([0, 1, {
        type: 'number',
        label: 'average',
        calc: function(dt, row) {
            return group.getValue(0, 1);
        }
    }]);
    var chart = new google.visualization.ComboChart(document.getElementById(elementId + "_chart_container"));
    chart.draw(dv, optionsChart);
    return chart;
}

function cvs_displayChart_buble(elementId, dataChart, optionsChart) {
    displayChart(elementId);
    var chart = new google.visualization.ScatterChart(document.getElementById(elementId + "_chart_container"));
    chart.draw(dataChart, optionsChart);
}

// display the piepChart timeline chart in the web page
function cvs_displayChart_pie(elementId, dataChart, optionsChart) {
    displayChart(elementId);
    var chart = new google.visualization.PieChart(document.getElementById(elementId + "_chart_container"));
    chart.draw(dataChart, optionsChart);
    return chart;
}

function cvs_displayChart_lineChart(elementId, dataChart, optionsChart) {
    displayChart(elementId);
    var chart = new google.visualization.LineChart(document.getElementById(elementId + "_chart_container"));
    chart.draw(dataChart, optionsChart);
    return chart;

}

// display the column chart in the web page
function cvs_displayChart_column(elementId, dataChart, optionsChart) {
    displayChart(elementId);
    var chart = new google.visualization.ColumnChart(document.getElementById(elementId + "_chart_container"));
    chart.draw(dataChart, optionsChart);
    return chart;
}

// display the bar chart in the web page
function cvs_displayChart_bar(elementId, dataChart, optionsChart) {
    displayChart(elementId);
    var chart = new google.visualization.BarChart(document.getElementById(elementId + "_chart_container"));
    chart.draw(dataChart, optionsChart);
    return chart;
}

// display the table in the web page
function cvs_displayTable(elementId, dataChart, optionsChart) {
    $jq("#" + elementId + "_table").show();
    var chart = new google.visualization.Table(document.getElementById(elementId + "_table"));
    chart.draw(dataChart, optionsChart);
    return chart;
}
