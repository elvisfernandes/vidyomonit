var map;
var map_center;
var markers;
var icons = {};
var device_types = ['router','portal','gateway'];

function build_map(){
    markers = {};
    icons = {};
    //Default CERN position
    var lgn = 46.235784;
    var lat = 6.04454;
    _cvs_create_icons();
    //Get user current location (HTML5 ready) with fallback on the default values
    if (navigator.geolocation){
                navigator.geolocation.getCurrentPosition(function(position){
                    lgn = position.coords.longitude;
                    lat = position.coords.latitude;
                });
    }
    map_center = new google.maps.LatLng(lgn, lat);
    var myOptions = {
                center: map_center,
                zoom: 8,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                streetViewControl: false,
                mapTypeComarkersCountntrol: false,
                overviewMapControl: true,
                overviewMapControlOptions: { opened: false }
    };
    map = new google.maps.Map(document.getElementById("cvs_map_canvas"), myOptions);

    $('#cvs_map_container').show();
}

function add_new_host() {
    if ($('#button_add_host').text() == 'Add new host') {
        var data = 'hostname=' + $('#hostname').val() + "&label=" + $('#label2').val() + "&type=" + $('#type_device2').val();
        data = data + "&ip=" + $('#ip2').val() + "&ssh=" + $('#ssl').val();
        $('#ip_add_error,#ip_error').hide();
        $('#ip_success').show();
        $('#button_add_host').text('Please wait...').attr('disabled', true);
        jQuery.ajax({
            type: 'POST',
            url: '/ajax/add_host/',
            async: true,
            crossDomain: true,
            data: data,
            success: function(response) {
                if (response == 'ok')
                    location.reload(true);
            },
            error: function(response) {
                var error = response.responseText || 'Adding the device failed.';
        		$('#ip_success,#ip_error').hide();
                $('#ip_add_error').text(error).show();
        		$('#button_add_host').text('Add new host').attr('disabled', false);
                $('input#hostname').select();
            }
        });
    }
}

function remove_all_hosts() {
    var confirmed = confirm('Are you sure you want to remove all hosts?');
    if (confirmed) {
        document.location.pathname = '/hosts/delete';
    };
}

function add_new_popup(){
    $('#hostname').val('');
    $('#label2').val('');
    $('#type_device2').val('');
    $('#ip2').val('');
    $('#ssl').val('');
    $('#label_editor2').modal('show');
}

function set_ip(){
    var data = 'hostname='+$('#hostname').val();
    jQuery.ajax({
                            type: 'POST',
                            url: '/ajax/check_ip/',
                            async: true,
                            crossDomain: true,
                            data: data,
                            success: ip_rev_check
                });
    }

var ip_rev_check = function(data, textStatus, xhr){
    if(data == 'None')
    {
        $('#hostname').val('');
        $('#ip2_2').text('');
        $('#ip2').val('');
        $('#ip_error').show();
    }
    else
    {
        $('#ip2_2').text(data);
        $('#ip2').val(data);
    }
}

function removeElement(id){
    $('#delete_value').val(id);
    $('#delete').submit();
}

function addElement(device, name, lat, lgn, ip_address, label){
    var center = map.center;
    if(lgn != null && lat != null){
        center = new google.maps.LatLng(lgn, lat);
    }
    if(markers[name] == null) {
        var marker = new MarkerWithLabel({
            map: map,
            draggable:true,
            position: center,
            labelContent: name,
            labelAnchor: new google.maps.Point(22, 0),
            labelClass: "labels", // the CSS class for the label
            labelStyle: {opacity: 1.0},
            icon: icons[device]

        });

    google.maps.event.addListener(marker, 'click', function() {
        $('#label_editor').modal('show');
        $('#cvs_monitoring_si_hostname').text(name);
        $('#cvs_monitoring_si_ip').text(ip_address);
        $('#label').val(label);
        $('#ip').val(ip_address);

        $('#type_device').val(device);


    });
        // Register Custom "dragend" Event
        google.maps.event.addListener(marker, 'dragend', function() {
            // Get the Current position, where the pointer was dropped
            var point = marker.getPosition();
            // Update the textbox
            var data = 'lgn='+point.lng()+'&lat='+point.lat()+'&host='+name;
            jQuery.ajax({
                            type: 'POST',
                            url: '/ajax/updateposition/',
                            async: true,
                            crossDomain: true,
                            data: data,
                            success: upadate_ok
                });
        });
        markers[name] = marker

    }
    else {
        var point = markers[name].getPosition();
        map.panTo(point);
    }
}

var upadate_ok = function(data, textStatus, xhr){
    console.log(data);
    $('#'+data+'nodata').text("");
    $('#'+data+'nodata').remove();
}

function _cvs_create_icons(){
        for(index in device_types){
                var path = '/static/img/' + device_types[index] + '_green' +'.png';
                var myIcon = new google.maps.MarkerImage(
                    path,
                    null,
                    null,
                    null,
                    new google.maps.Size(40,40));
                var device = device_types[index];
                icons[device] = myIcon;
        }
}
