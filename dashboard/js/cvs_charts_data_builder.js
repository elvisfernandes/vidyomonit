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

# Chart builders.
*/

/* global jQuery, google */
'use strict';

//----------------------------------------------------------------------------------------------------------------------------
// Graphic builders functions
//----------------------------------------------------------------------------------------------------------------------------
var cvs_drawChart_maxSimCallersLast24 = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set chart options
        var optionsChart = {
            displayAnnotations: true,
            displayZoomButtons: false,
            annotationsWidth: 21,
            legendPosition: 'newRow',
            thickness: 2,
            fill: 10,
            colors: ['#51a351', '#C60240', '#4455BD'],
            displayRangeSelector: false
        };
        _cvs_drawChar_max_SimCallers_Worker("cvs_maxSimCallersLast24", data, optionsChart);
    } else {
        hideChart();
    }
};

var cvs_drawChart_maxSimCallers = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set chart options
        var optionsChart = {
            displayAnnotations: true,
            displayZoomButtons: true,
            annotationsWidth: 21,
            legendPosition: 'newRow',
            thickness: 2,
            fill: 10,
            colors: ['#C60240', '#4455BD', '#51a351'],
            displayRangeSelector: false
        };
        _cvs_drawChar_max_SimCallers_Worker("cvs_maxSimCallers", data, optionsChart);
    } else {
        hideChart();
    }
};

//Use one function to draw all the max Sim Callers
function _cvs_drawChar_max_SimCallers_Worker(elementId, data, optionsChart) {
    var dataChart = new google.visualization.DataTable();
    // set columns for the chart
    dataChart.addColumn('datetime', 'Time');
    dataChart.addColumn('number', 'Maximum Simultaneous Connections');
    //dataChart.addColumn('number', 'Average');
    data = data.data;

    // Code with average per month
    var avg = {};
    for (var index in data) {
        var i = parseInt(index, 10),
            users = parseInt(data[i].users, 10),
            d = new Date(data[i].timestamp * 1000);

        // update the average array for total sim callers only
        if (elementId == 'cvs_maxSimCallers') {

            // init the new year if not inserted yet
            if (!(d.getFullYear() in avg))
                avg[d.getFullYear()] = {};

            // init the new month if not inserted yet
            if (!(d.getMonth() in avg[d.getFullYear()]))
                avg[d.getFullYear()][d.getMonth()] = {
                    'first': i,
                    'last': i,
                    'days': 0,
                    'users': 0
                };

            // update the number of users for that month
            avg[d.getFullYear()][d.getMonth()].days += 1;
            avg[d.getFullYear()][d.getMonth()].users += users;
            avg[d.getFullYear()][d.getMonth()].last = i;
        }

        dataChart.addRow([d, users]);
    }

    if (elementId == 'cvs_maxSimCallers') {
        dataChart.addColumn('number', 'Average');
        for (var year in avg) {
            for (var month in avg[year]) {
                var days = (avg[year][month].days > 0) ? avg[year][month].days : 1;
                dataChart.setValue(avg[year][month].last, 2, Math.round(avg[year][month].users / days));
            }
        }
    }

    cvs_displayChart_annotated(elementId, dataChart, optionsChart);
}



var cvs_drawChart_usersInConferenceCallsLast24 = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set chart options
        var optionsChart = {
            displayAnnotations: true,
            displayZoomButtons: false,
            annotationsWidth: 21,
            legendPosition: 'newRow',
            thickness: 2,
            fill: 10,
            colors: ['#bd362f', '#f89406'],
            displayRangeSelector: false
        };

        _cvs_drawChar_usersInConferenceCalls_Worker('cvs_usersInConferenceCallsLast24',
            data,
            optionsChart);
    } else {
        hideChart();
    }
}

var cvs_drawChart_usersInConferenceCalls = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set chart options
        var optionsChart = {
            displayAnnotations: true,
            displayZoomButtons: true,
            annotationsWidth: 21,
            legendPosition: 'newRow',
            thickness: 2,
            fill: 10,
            colors: ['#f89406', '#51a351'],
            displayRangeSelector: false
        };
        _cvs_drawChar_usersInConferenceCalls_Worker('cvs_usersInConferenceCalls',
            data,
            optionsChart);
    } else {
        hideChart();
    }
}


//Use one function to draw all the max total Callers
function _cvs_drawChar_usersInConferenceCalls_Worker(elementId, data, optionsChart) {
    var dataChart = new google.visualization.DataTable();
    // set columns for the chart
    dataChart.addColumn('datetime', 'Time');
    dataChart.addColumn('number', 'PointToPoint Calls');
    dataChart.addColumn('number', 'Conference Calls');

    data = data.data;
    for (var index in data) {
        var o = data[index];
        dataChart.addRow([new Date(o.timestamp * 1000),
            parseInt(o.point_to_point),
            parseInt(o.conferance_calls)
        ]);
    }
    cvs_displayChart_annotated(elementId, dataChart, optionsChart);
}


var cvs_drawChart_minutesInConference = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set chart options
        var divisor, label, format, step = data.step;
        switch (step) {
            case 0: // daily
                divisor = 1000;
                label = 'Thousands of minutes';
                format = 'dd MMM yyyy';
                break;
            case 1: // monthly
                divisor = 1000000;
                label = 'Millions of minutes';
                format = 'MMM yyyy';
                break;
            case 2: // unused
                divisor = 1;
                label = 'Days';
                format = 'yyyy';
                break;
        }
        var dataChart = new google.visualization.DataTable();

        // set columns for the chart
        dataChart.addColumn('date', 'Date');
        dataChart.addColumn('number', label);
        dataChart.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.

        data = data.data;
        for (var index in data) {
            var o = data[index];
            var value = parseInt(o.minutes) / divisor;
            var date = new Date(o.timestamp);
            var certainty = true;
            if (index === 0) {
                if (step === 0 && date.toLocaleDateString() != new Date().toLocaleDateString())
                    certainty = true;
                else
                    certainty = false;
            }
            // foreach entry, add a new row with the timestamp, the total and number of installations on that day
            dataChart.addRow([date, value, certainty]);
        }
        var optionsChart = {
            curveType: 'function',
            hAxis: {
                title: 'Date',
                format: format
            },
            vAxis: {
                title: label,
                viewWindowMode: 'explicit',
                viewWindow: {
                    min: 0
                }
            },
            colors: ['#51a351', '#C60240', '#4455BD'],
            legend: {
                position: 'right'
            },
            pointSize: 5
        };

        cvs_displayChart_column('cvs_minutesInConf', dataChart, optionsChart);
    } else {
        hideChart();
    }
};


var cvs_drawChart_meetingsLastWeek = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set chart options
        var optionsChart = {
            curveType: 'function',
            chartArea: {
                top: 10,
                bottom: 10,
                height: 400
            },
            hAxis: {
                title: 'Days',
                format: 'dd/MM/yyyy',
                viewWindowMode: "pretty",
                gridlines: {
                    count: 10
                },
                textStyle: {
                    fontSize: 11
                }
            },
            vAxis: {
                title: 'Meetings',
                viewWindowMode: "explicit",
                viewWindow: {
                    min: 0
                }
            },
            pointSize: 5
        };
        _cvs_drawChart_meetings_Worker("cvs_meetingsLastWeek", data, optionsChart, false);
    } else {
        hideChart();
    }
};

var cvs_drawChart_meetings = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set chart options
        var optionsChart = {
            curveType: 'function',
            chartArea: {
                top: 10,
                bottom: 10,
                height: 400
            },
            hAxis: {
                title: 'Months',
                format: 'MMM yyyy',
                gridlines: {
                    count: 10
                },
                textStyle: {
                    fontSize: 10
                }
            },
            vAxis: {
                title: 'Meetings',
                viewWindowMode: "explicit",
                viewWindow: {
                    min: 0
                }
            },
            pointSize: 5
        };
        _cvs_drawChart_meetings_Worker("cvs_meetingsPerMonth", data, optionsChart, true);
    } else {
        hideChart();
    }

}

function _cvs_drawChart_meetings_Worker(elementId, data, optionsChart, dash_last_element) {
    var dataChart = new google.visualization.DataTable();
    // set columns for the chart

    dataChart.addColumn('date', 'Months');
    dataChart.addColumn('number', 'ALICE');
    dataChart.addColumn({
        type: 'boolean',
        role: 'certainty'
    }); // certainty col.
    dataChart.addColumn('number', 'ATLAS');
    dataChart.addColumn({
        type: 'boolean',
        role: 'certainty'
    }); // certainty col.
    dataChart.addColumn('number', 'CMS');
    dataChart.addColumn({
        type: 'boolean',
        role: 'certainty'
    }); // certainty col.
    dataChart.addColumn('number', 'LHCb');
    dataChart.addColumn({
        type: 'boolean',
        role: 'certainty'
    }); // certainty col.
    dataChart.addColumn('number', 'OTHER');
    dataChart.addColumn({
        type: 'boolean',
        role: 'certainty'
    }); // certainty col.

    data = data.data;
    var total = data.length;
    for (var index in data) {
        var o = data[index];
        var date = o.date.split("-");
        var certainty = true;
        if (dash_last_element && index == total - 1)
            certainty = false;
        // bug when using certainty, need to substract 1 from month
        dataChart.addRow([new Date(parseInt(date[0]), parseInt(date[1]) - 1, parseInt(date[2])),
            parseInt(o.alice),
            certainty,
            parseInt(o.atlas),
            certainty,
            parseInt(o.cms),
            certainty,
            parseInt(o.lhcb),
            certainty,
            parseInt(o.other),
            certainty
        ]);
    }

    cvs_displayChart_lineChart(elementId, dataChart, optionsChart);
}

var cvs_drawChart_uniqueUsersPerMonth = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var dataChart = new google.visualization.DataTable();

        // set columns for the chart
        dataChart.addColumn('date', 'Months');
        dataChart.addColumn('number', 'Unique Users');
        dataChart.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.
        dataChart.addColumn('number', 'Guests');
        dataChart.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.
        dataChart.addColumn('number', 'H.323/SIP');
        dataChart.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.
        dataChart.addColumn('number', 'Phone calls');
        dataChart.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.
        dataChart.addColumn('number', 'Vidyo Rooms');
        dataChart.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.

        data = data.data;
        var total = data.length;
        for (var index in data) {
            var certainty = true;
            if (index == total - 1)
                certainty = false;
            var o = data[index];
            dataChart.addRow([
                new Date(parseInt(o.year), parseInt(o.month) - 1, 1),
                parseInt(o.totalOthers),
                certainty,
                parseInt(o.totalGuests),
                certainty,
                parseInt(o.totalH323),
                certainty,
                parseInt(o.totalTel),
                certainty,
                parseInt(o.totalVidyoRooms),
                certainty,
            ]);
        }

        var formatter = new google.visualization.DateFormat({
            pattern: "MMM yyyy"
        });
        formatter.format(dataChart, 0);

        // set chart options
        var optionsChart = {
            chartArea: {
                top: 10,
                bottom: 10,
                height: 400
            },
            legend: {
                position: 'right'
            },
            isStacked: true

        };
        cvs_displayChart_column("cvs_uniqueUsersPerMonth", dataChart, optionsChart);
    } else {
        hideChart();
    }
};

var cvs_callersPerMeeting_logScale = false;

// ----------------------------------------------------------------------------------------
// --- Callers per Meeting
// ----------------------------------------------------------------------------------------
var cvs_drawChart_callersPerMeeting = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var dataChart = new google.visualization.DataTable();

        // set columns for the chart
        dataChart.addColumn('number', 'Participants');
        dataChart.addColumn('number', 'Meetings');

        data = data.data;
        for (var index in data) {
            var o = data[index];
            if (parseInt(o.callers) > 1) {
                var value = parseInt(o.meetings);
                dataChart.addRow([{
                        v: parseInt(o.callers),
                        f: "Participants: " + parseInt(o.callers)
                    },
                    value
                ]);
            }
        }

        dataChart.sort([{
            column: 0
        }, {
            column: 1
        }]);

        // set chart options
        var optionsChart = {
            chartArea: {
                top: 10,
                bottom: 10,
                height: 350
            },
            hAxis: {
                title: 'Participants',
                logScale: cvs_callersPerMeeting_logScale
            },
            vAxis: {
                title: 'Meetings',
                format: '0',
                logScale: false
            },
            legend: {
                position: 'none'
            },
            pointSize: 5,
        };

        cvs_displayChart_lineChart("cvs_callersPerMeeting", dataChart, optionsChart);

    } else {
        hideChart();
    }
};

var cvs_drawChart_installations = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var dataChart = new google.visualization.DataTable();

        // set columns for the chart
        dataChart.addColumn('date', 'Date');
        dataChart.addColumn('number', 'Total Installations');
        dataChart.addColumn('number', 'Daily Installations');

        var total = 0;
        data = data.data;
        for (var index in data) {
            var o = data[index];
            var value = parseInt(o.installed_V1) + parseInt(o.installed_V2);
            total += value;
            // foreach entry, add a new row with the timestamp, the total and number of installations on that day
            dataChart.addRow([new Date(parseInt(o.timestamp) * 1000), total, value]);
        }
        dataChart.sort([{
            column: 0
        }]);


        // set chart options
        var optionsChart = {
            displayAnnotations: true,
            displayZoomButtons: true,
            annotationsWidth: 21,
            legendPosition: 'newRow',
            thickness: 2,
            fill: 10,
            colors: ['#51a351', '#C60240', '#4455BD'],
            displayRangeSelector: false
        };
        cvs_displayChart_annotated("cvs_installations", dataChart, optionsChart);

    } else {
        hideChart();
    }
};

// ----------------------------------------------------------------------------------------
// --- Registratations
// ----------------------------------------------------------------------------------------
var cvs_drawChart_registrations = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var dataChart = new google.visualization.DataTable();

        // set columns for the chart
        dataChart.addColumn('string', 'Registration');
        dataChart.addColumn('number', 'Registered Users');
        dataChart.addColumn('number', 'Client Installations');
        data = data.data;
        dataChart.addRow(['Registered Users', parseInt(data.Seats.value), 0]);

        dataChart.addRow(['Client Installations', 0, parseInt(data.Installs.value)]);

        // set chart options
        var optionsChart = {
            chartArea: {
                top: 50,
                bottom: 50,
                height: 300
            },
            vAxis: {
                textStyle: {
                    fontSize: 10
                }
            },
            legend: {
                position: 'none'
            },
            colors: ['#bd362f', '#51a351', '#510151']
        };

        cvs_displayChart_bar('cvs_registrations', dataChart, optionsChart);
    } else {
        hideChart();
    }
};

// ----------------------------------------------------------------------------------------
// --- Devices_Userssr
// ----------------------------------------------------------------------------------------
var cvs_drawChart_device_users = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var dataChart = new google.visualization.DataTable();
        var dataChart2 = new google.visualization.DataTable();

        // set columns for the chart
        dataChart.addColumn('date', 'Date');
        dataChart.addColumn('number', 'Guests');
        dataChart.addColumn({
            type: 'string',
            role: 'tooltip'
        });
        dataChart.addColumn('number', 'New devices');
        dataChart.addColumn({
            type: 'string',
            role: 'tooltip'
        });
        dataChart.addColumn('number', 'New users');
        dataChart.addColumn({
            type: 'string',
            role: 'tooltip'
        });

        dataChart2.addColumn('date', 'Date');
        dataChart2.addColumn('number', 'Guests');
        dataChart2.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.
        dataChart2.addColumn('number', 'New devices');
        dataChart2.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.
        dataChart2.addColumn('number', 'New users');
        dataChart2.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.

        data = data.data;
        var previous = null;
        for (var index in data) {
            var o = data[index];
            var my_date = new Date(o.timestamp * 1000);
            dataChart.addRow([my_date, parseInt(o.new_guests),
                o.new_guests,
                parseInt(o.new_devices), o.new_devices, parseInt(o.new_users), o.new_users
            ]);
            if (my_date.getDate() == 1) {
                var certainty = true;
                if (my_date.getMonth() == new Date().getMonth() && my_date.getYear() == new Date().getYear())
                    certainty = false;
                if (previous) {
                    dataChart2.addRow([my_date,
                        parseInt(o.new_guests) - parseInt(previous.new_guests), certainty,
                        parseInt(o.new_devices) - parseInt(previous.new_devices), certainty,
                        parseInt(o.new_users) - parseInt(previous.new_users), certainty
                    ]);
                }
                previous = o;
            }
        }

        var optionsChart = {
            curveType: 'function',
            chartArea: {
                top: 10,
                bottom: 10,
                height: 400
            },
            hAxis: {
                title: 'Date',
                format: 'MMM yyyy',
                gridlines: {
                    count: 10
                },
                textStyle: {
                    fontSize: 10
                }
            },
            vAxis: {
                title: 'Total number',
                viewWindowMode: "explicit",
                viewWindow: {
                    min: 0
                }
            },
            pointSize: 1
        };

        var optionsChart2 = {
            curveType: 'function',
            chartArea: {
                top: 10,
                bottom: 10,
                height: 400
            },
            hAxis: {
                title: 'Date',
                format: 'MMM yyyy',
                gridlines: {
                    count: 10
                },
                textStyle: {
                    fontSize: 10
                }
            },
            vAxis: {
                title: 'Total number',
                viewWindowMode: "explicit",
                viewWindow: {
                    min: 0
                }
            },
            pointSize: 1,
            isStacked: true
        };

        cvs_displayChart_lineChart("cvs_users_devices", dataChart, optionsChart);
        cvs_displayChart_column("cvs_users_devices2", dataChart2, optionsChart2);
        $jq('#ev1').hide();

    } else {
        hideChart();
    }
};

// ----------------------------------------------------------------------------------------
// --- Devices_Userssr
// ----------------------------------------------------------------------------------------
var cvs_drawChart_top10meeting_dayly = function(data, textStatus, xhr) {
    if (textStatus == 'success') {

        var dataChart = new google.visualization.DataTable();

        // set columns for the chart
        dataChart.addColumn('datetime', 'Date');
        dataChart.addColumn('number', 'Users');
        dataChart.addColumn({
            type: 'string',
            role: 'tooltip',
            'p': {
                'html': true
            }
        });

        //dataChart.addRow([new Date((data['data'][0]['timestamp']- 60)*1000),100,0,0,0,0,0,0,0,0,0]);

        data = data.data;
        for (var index in data) {
            var o = data[index];
            dataChart.addRow([new Date(o.date), parseInt(o.users), createCustomHTMLContent(o)]);
        }

        var optionsChart = {
            chartArea: {
                height: 350
            },
            hAxis: {
                title: 'Date',
                textStyle: {
                    fontSize: 10
                }
            },
            vAxis: {
                title: 'Users',
                viewWindowMode: "explicit",
                viewWindow: {
                    min: 0
                }
            },
            pointSize: 10,
            legend: {
                position: 'none'
            },
            tooltip: {
                isHtml: true
            }
        };

        cvs_displayChart_buble("cvs_top10meeting_day", dataChart, optionsChart);

    } else {
        hideChart();
    }
};

// ----------------------------------------------------------------------------------------
// --- Devices_Userssr
// ----------------------------------------------------------------------------------------
var cvs_drawChart_top10meeting_yearly = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var dataChart = new google.visualization.DataTable();
            // set columns for the chart
        data = data.data;
        dataChart.addColumn('string', 'Meetings');
        var row_value = [' '];
        for (var index in data) {
            var o = data[index];
            var name = o.name;
            dataChart.addColumn('number', name);
            dataChart.addColumn({
                type: 'string',
                role: 'tooltip',
                'p': {
                    'html': true
                }
            });
        }
        for (var index in data) {
            var o = data[index];
            row_value.push(parseInt(o.users));
            row_value.push(createCustomHTMLContent(o));

        }
        dataChart.addRow(row_value);
        var optionsChart = {
            chartArea: {
                top: 50,
                bottom: 50,
                height: 350,
                width: 400
            },
            vAxis: {
                textStyle: {
                    fontSize: 10
                }
            },
            legend: {
                position: 'yes'
            },
            tooltip: {
                isHtml: true
            }
        };

        // display the chart
        var barchart = cvs_displayChart_column("cvs_top10meeting_year", dataChart, optionsChart);

    } else {
        hideChart();
    }
};

function createCustomHTMLContent(o) {
    return '<div style="padding:5px 5px 5px 5px; height:90px;">' +
        "<b>" + o.name + '</b><br/>Users: <b>' + o.users + '</b></br>Date: <b>' + o.date + "</b></div>";
}

// ----------------------------------------------------------------------------------------
// --- User Groups
// ----------------------------------------------------------------------------------------
var cvs_drawChart_groups = function(data, textStatus, xhr) {
    if (textStatus == 'success') {

        // set columns for the chart
        data = data.data;
        var column_value = [];
        var row_value = [];
        column_value.push('Group');
        row_value.push('');
        for (var index in data) {
            var o = data[index];
            var name = o.name;
            if (name != "Default" && name != "External" && name != "Monitor" && name != "Other" && name != "Support") {
                row_value.push(parseInt(o.value));
                column_value.push(name);
            }
        }
        var dataChart = new google.visualization.arrayToDataTable([column_value, row_value]);
        var table_chart_array = [];
        for (var i = 0; i < column_value.length; i++) {
            table_chart_array.push([column_value[i], row_value[i]]);
        }
        table_chart_array[0][1] = "Users";
        var table_chart_data = new google.visualization.arrayToDataTable(table_chart_array);

        var optionsChart = {
            chartArea: {
                top: 50,
                bottom: 50,
                height: 350,
                width: 400
            },
            vAxis: {
                textStyle: {
                    fontSize: 10
                }
            },
            legend: {
                position: 'yes'
            },
        };

        // display the chart

        var barchart = cvs_displayChart_column("cvs_groups", dataChart, optionsChart);
        var tablechart = cvs_displayTable("cvs_groups", table_chart_data, optionsChart);

        google.visualization.events.addListener(tablechart, 'sort',
            function(event) {
                table_chart_data.sort([{
                    column: event.column,
                    desc: !event.ascending
                }]);
                column_value = [];
                row_value = [];
                column_value.push('Group');
                row_value.push('');
                for (var i = 0; i < table_chart_data.getNumberOfRows(); i++) {
                    row_value.push(parseInt(table_chart_data.getValue(i, 1)));
                    column_value.push(table_chart_data.getValue(i, 0));
                }
                dataChart = new google.visualization.arrayToDataTable([column_value, row_value]);
                barchart.draw(dataChart, optionsChart);
            });

    } else {
        hideChart();
    }
}


var cvs_draw_legacies = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set columns for the chart
        data = data.data;
        var row_value = [
            ['Location', 'Meeting rooms']
        ];
        var last_index = 0;
        for (var index in data) {
            var o = data[index];
            var name = o.name;
            var value = parseInt(o.value);
            row_value.push([name, value]);

        }

        var dataChart = google.visualization.arrayToDataTable(row_value);



        var optionsChart = {
            chartArea: {
                top: 5,
                bottom: 5,
                height: 550,
                width: 600
            },
            vAxis: {
                textStyle: {
                    fontSize: 10
                }
            },
            legend: {
                position: 'none'
            },
            pieSliceText: 'label',
            sliceVisibilityThreshold: 1 / 100
        };

        // display the chart

        var chart = cvs_displayChart_pie("cvs_legacies", dataChart, optionsChart);
        var display = cvs_displayTable("cvs_legacies", dataChart, optionsChart);

        google.visualization.events.addListener(chart, 'select',
            function() {
                var selection = chart.getSelection()[0];
                display.setSelection({
                    row: selection.row,
                    column: null
                });
            });

    } else {
        hideChart();
    }

}

var cvs_draw_piwki_bar_graph = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        // set columns for the chart
        var period = data.period;
        var graph = 'browser';
        if (data.type == 'UserSettings.getOS')
            graph = 'os';
        data = data.data;
        var column_value = [];
        var row_value = [];
        row_value.push(column_value);
        var build_data = [];
        for (var index in data) {
            if (data[index].label) {
                build_data = data;
                break;
            }
            build_data = build_data.concat(data[index]);
        }
        for (index in build_data) {
            column_value = [];
            var value;
            var o = build_data[index];
            var name = o.label;
            if (period == 'day') {
                value = parseInt(o.nb_uniq_visitors);
            } else {
                value = parseInt(o.nb_visits);
            }
            var is_Mobile_OS = $jq.inArray(name, mobile_os);
            if (value > 1 && is_Mobile_OS == -1) {
                var i = 0;
                for (i = 0; i < row_value.length; i++) {
                    if (row_value[i][0] == name) {
                        row_value[i][1] += value;
                        break;
                    }
                }
                if (i == row_value.length) {
                    column_value.push(name);
                    column_value.push(value);
                    row_value.push(column_value);
                }
            }
        }

        // order by number of users
        row_value.sort(function(a, b) {
            var x = a[1];
            var y = b[1];
            return x - y;
        });
        row_value.reverse();
        if (graph == 'os')
            row_value = row_value.slice(0, 8);
        else
            row_value = row_value.slice(0, 6);

        row_value = _cvs_convert_matrix(row_value);
        var dataChart = new google.visualization.arrayToDataTable(row_value);

        var optionsChart = {
            chartArea: {
                top: 40,
                bottom: 10,
                height: 250,
                width: 200
            },
            vAxis: {
                textStyle: {
                    fontSize: 10
                },
                baseline: 0
            },
            hAxis: {
                logScale: true,
                textStyle: {
                    fontSize: 10
                },
                title: "Visitors"
            },
            legend: {
                position: 'yes'
            },
        };

        // display the chart
        if (!chart_type[period])
            cvs_displayChart_bar("cvs_" + graph + "_" + period, dataChart, optionsChart);
        else
            cvs_displayChart_column("cvs_" + graph + "_" + period, dataChart, optionsChart);
    }
}
var chart_type = {
    day: false,
    month: false,
    year: false,
    last_year: false
}
var cvs_draw_piwki_evolution_graph = function(data, textStatus, xhr) {
    if (textStatus == 'success') {
        var dataChart = new google.visualization.DataTable();
        // set columns for the chart
        var period = data.period;
        var total = data.total;

        dataChart.addColumn('string', period);
        dataChart.addColumn('number', 'Visitors');
        dataChart.addColumn({
            type: 'boolean',
            role: 'certainty'
        }); // certainty col.

        data = data.data;
        var count = 0;
        for (var index in data) {
            var o = data[index];
            var label = o.label;
            if (period != 'day')
                label = index;
            var value = parseInt(o.nb_visits);
            var certainty = true;
            if (count++ == total - 1)
                certainty = false;
            if (value > 0)
                dataChart.addRow([label, value, certainty]);
        }

        var optionsChart = {
            curveType: 'function',
            chartArea: {
                top: 10,
                bottom: 10,
                height: 300
            },
            hAxis: {
                title: '',
                gridlines: {
                    count: 10
                },
                textStyle: {
                    fontSize: 10
                }
            },
            vAxis: {
                title: 'Visitors',
                viewWindowMode: "explicit",
                viewWindow: {
                    min: 0
                }
            },
            colors: ['#f89406', '#51a351'],
            pointSize: 5
        };
        cvs_displayChart_lineChart("cvs_evo_" + period, dataChart, optionsChart);
    }
};
