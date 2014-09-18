<?php
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

# Fetch and reformat data to be displayed in graphs.

class CSV_data_display {

	var $piwik_portal = 'https://piwik-api.web.cern.ch/piwik-api/';
   	var $piwik_site = '61';
    var $piwik_token = variable_get('cvs_piwik_apikey');

	// Renders Json for Google Chars for maximum simultaneous connections
	function cvs_get_maxSimCallers($only_24 = false){
	    $select = db_select('cern_vidyo_statistics_maxSimCallers', 'maxSimCallers');
	    $select = $select->fields('maxSimCallers');
	    if($only_24){
	    	$select = $select->condition('maxSimCallers.is_agragated', 0)
	                     ->condition('maxSimCallers.timestamp', time() - 60 * 60 * 24, '>');
	    }
	    else{
	    	$select = $select->condition('maxSimCallers.is_agragated', 1);
	    }
	    $select = $select->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	      array_push($row_data, array('users' => $record['users_number'],
	      							  'timestamp'=>$record['timestamp']));
	    }
	    return array('data' => $row_data);
	}
    var $experminets_array = array("ACE","AEGIS","ALICE","ALPHA","AMS","ASACUSA","ATLAS","ATRAP","AWAKE","CAST","CLOUD","CMS","COMPASS","DIRAC","ISOLDE","LHCb","LHCf","MOEDAL","NA61/SHINE","NA62","nTOF","OSQAR","TOTEM");

	function cvs_get_top_connection_meetings_yearly(){
		$last_year = strtotime('-1 year', strtotime(date("Y-m-d")));
		$select = db_query("SELECT MAX(conference_calls) as conference_calls, conferance, timestamp
							FROM  `cern_vidyo_statistics_usersInConference_perMeeting`
							WHERE timestamp > ".$last_year." GROUP BY conferance
							ORDER BY conference_calls DESC
							LIMIT 0 , 10");
	    $row_data = array();
		foreach ($select as $record) {
		  $name = $record->conferance;
		  if(strstr($name, '__',true))
		  	$name = strstr($name, '__',true);
		  if(strstr($name, '_indico',true))
		  	$name = strstr($name, '_indico',true);
		  if(strstr($name, '@',true))
		  	$name = strstr($name, '@',true);
		  $name = str_replace("_", " ", $name);
		  for($i=0;$i<count($this->experminets_array);$i++){
		  	$name = str_ireplace($this->experminets_array[$i], "***", $name);
		  }
	      array_push($row_data, array('name' => $name,
	      							  'users' => $record->conference_calls,
	      							  'date' => date("Y-m-d", $record->timestamp)));
	    }
	    return array('data' => $row_data);
	}

	function cvs_get_top_connection_meetings_monthly(){
		$last_year = strtotime('-1 month', strtotime(date("Y-m-d")));
		$select = db_query("SELECT MAX(conference_calls) as conference_calls, conferance, timestamp
							FROM  `cern_vidyo_statistics_usersInConference_perMeeting`
							WHERE timestamp > ".$last_year." GROUP BY conferance
							ORDER BY conference_calls DESC
							LIMIT 0 , 10");
	    $row_data = array();
		foreach ($select as $record) {
		  $name = $record->conferance;
		  if(strstr($name, '__',true))
		  	$name = strstr($name, '__',true);
		  if(strstr($name, '_indico',true))
		  	$name = strstr($name, '_indico',true);
		  if(strstr($name, '@',true))
		  	$name = strstr($name, '@',true);
		  $name = str_replace("_", " ", $name);
		  for($i=0;$i<count($this->experminets_array);$i++){
		  	$name = str_ireplace($this->experminets_array[$i], "***", $name);
		  }
	      array_push($row_data, array('name' => $name,
	      							  'users' => $record->conference_calls,
	      							  'date' => date("Y-m-d", $record->timestamp)));
	    }
	    return array('data' => $row_data);
	}

	function cvs_get_top_connection_meetings_day(){
		$last_day = strtotime('-1 day', strtotime(date("Y-m-d H:i:s")));

		$select = db_query("SELECT MAX(conference_calls) as conference_calls,conferance,timestamp
							FROM  `cern_vidyo_statistics_usersInConference_perMeeting`
							WHERE timestamp > ".$last_day." GROUP BY conferance
							ORDER BY conference_calls DESC
							LIMIT 0 , 10");
		$row_data = array();
		foreach ($select as $record) {
		  $name = $record->conferance;
		  if(strstr($name, '__',true))
		  	$name = strstr($name, '__',true);
		  if(strstr($name, '_indico',true))
		  	$name = strstr($name, '_indico',true);
		  if(strstr($name, '@',true))
		  	$name = strstr($name, '@',true);
		  $name = str_replace("_", " ", $name);
		  for($i=0;$i<count($this->experminets_array);$i++){
		  	$name = str_ireplace($this->experminets_array[$i], "***", $name);
		  }
		  	      array_push($row_data, array('name' => $name,
	      							  'users' => $record->conference_calls,
	      							  'date' =>  date("Y-m-d H:i:s", $record->timestamp)));
	    }
	    return array('data' => $row_data);

		/*
	    $conf_names = array();
	    $row_data = array();
		foreach ($select as $record) {
			array_push($conf_names,$record->conferance);
		 }

		 for($pos_array=0;$pos_array<count($conf_names);$pos_array++){
		 	$select2 = db_query("SELECT * FROM cern_vidyo_statistics_usersInConference_perMeeting
								WHERE conferance = '".$conf_names[$pos_array]."' AND  timestamp > ".$last_day. "
								ORDER BY conference_calls DESC
							 	LIMIT 0 , 1");
		 	foreach($select2 as $record2){
		 		//$record2->timestamp = date("Y-m-d H:i:s",$record2->timestamp);

		 		for($counter =0 ; $counter<count($row_data);$counter++){
		 			if($row_data[$counter]['timestamp'] == $record2->timestamp)
		 				break;
		 		}
		 		if($counter == count($row_data)){
		 			$row_data[$counter]['timestamp'] = $record2->timestamp;
		 			for($my_i=0;$my_i<10;$my_i++){
		 				$row_data[$counter]['c'.$my_i] = -1;

		 			}
		 		}
		 		$row_data[$counter]['c'.$pos_array] = $record2->conference_calls;
		 	}

		 }
		 $sortArray = array();

		foreach($row_data as $row){
		    foreach($row as $key=>$value){
		        if(!isset($sortArray[$key])){
		            $sortArray[$key] = array();
		        }
		        $sortArray[$key][] = $value;
		    }
		}
		$orderby = "timestamp"; //change this to whatever key you want from the array

		array_multisort($sortArray[$orderby],SORT_ASC,$row_data);

		 for($pos_array=0;$pos_array<count($conf_names);$pos_array++){
		  $name =$conf_names[$pos_array];
		  if(strstr($name, '__',true))
		  	$name = strstr($name, '__',true);
		  if(strstr($name, '_indico',true))
		  	$name = strstr($name, '_indico',true);
		  if(strstr($name, '@',true))
		  	$name = strstr($name, '@',true);
		  $name = str_replace("_", " ", $name);
	      $conf_names[$pos_array] = $name;
	    }
		return array('data' => $row_data, 'columns' => $conf_names);
		*/
	}

	function cvs_get_minutesInConferences($step){
		$limit = 31;
		$divider = 60;
		switch ($step) {
			case 1:
				$start_date = strtotime((date('Y')-1) . '-' . date('n') . '-1');
				$datediff = time() - $start_date;
				$limit = floor($datediff/(60*60*24));
				$divider = 1;
				break;
			case 2:
				$limit = 31*12*10;
				$divider = 60*24;
				break;
			default:
				$limit = 31;
				$divider = 1;
				break;
		}
		$select = db_select('cern_vidyo_statistics_minutesInConference', 'minutesInConference');
	    $select = $select->fields('minutesInConference')->orderBy('minutesInConference.timestamp', "DESC");
	    $select = $select->range(0,$limit)->execute();
	    $row_data = array();
	    $previous = null;
	    $total = 0;
	    $days_format = array("Y-m-d", "Y-m", "Y");
	    $tmp_date = "";
		$step = $step % count($days_format);
	   	while($record = $select->fetchAssoc()){
	   			if($previous == null){
	   				$previous = date($days_format[$step],$record['timestamp']);
	   			}
	   			if($previous != date($days_format[$step],$record['timestamp']))
	   			{
	   				array_push($row_data, array("timestamp"=>$previous,"minutes"=>$total/$divider));
	   				$total = 0;
	   				$previous = date($days_format[$step],$record['timestamp']);
	   			}
	   			$total += $record['minutes'];
	   		}
	   	// Last update
	   	if($step == 2)
	   		$previous = "2012-11-01";
	   	array_push($row_data, array("timestamp"=>$previous,"minutes"=>$total/$divider));
	    return array('data' => $row_data, 'step'=>$step);
	}
	// Get the data for devices
	function cvs_get_users_devices(){
 		$select = db_select('cern_vidyo_statistics_users_devices', 'user_devices');
	    $select = $select->fields('user_devices')
	    				 ->condition('user_devices.new_guests', 0, '>')
	    				 ->condition('user_devices.new_devices', 0, '>')
	    				 ->condition('user_devices.new_users', 0, '>')
	    				 ->orderBy('user_devices.timestamp','ASC');
	    $select = $select->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	      array_push($row_data, array('new_guests' => $record['new_guests'],
	      							  'new_devices' => $record['new_devices'],
	      							  'new_users' => $record['new_users'],
	      							  'timestamp' => $record['timestamp']));
	    }
	    return array('data' => $row_data);
	}

	// Renders Json for Google Chars for Total Number of Connections connections
	function cvs_get_usersInConference($only_24 = false){
	    $select = db_select('cern_vidyo_statistics_usersInConference', 'usersInConference');
	    $select = $select->fields('usersInConference');
	    if($only_24){
	    	$select = $select->condition('usersInConference.is_agragated', 0)
	                     ->condition('usersInConference.timestamp', time() - 60 * 60 * 24, '>');
	    }
	    else{
	    	$select = $select->condition('usersInConference.is_agragated', 1);
	    }
	    $select = $select->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	      array_push($row_data, array('conferance_calls' => $record['conference_calls'],
	      							  'point_to_point' => $record['point_to_point'],
	      							  'timestamp' => $record['timestamp']));
	    }
	    return array('data' => $row_data);
	}

	// Renders Json for Google Chars for Meetings per day
	function cvs_get_meetings($only_7_days = false){
	    $select = db_select('cern_vidyo_statistics_meetings', 'meetringsPerDay');
	    $today = strtotime(date('Y-m-d'));
	    if($only_7_days){
        	$first_day = date('Y-m-d', strtotime('-' . 7 . ' day', $today));
	    }
	    else {
        	$first_day = date('Y-m-01', strtotime('-' . 1 . ' year', $today));
	    }
	    $select = $select->fields('meetringsPerDay')
	                     ->condition('meetringsPerDay.is_agragated', $only_7_days == true ? 0 : 1)
	                     ->condition('meetringsPerDay.date', $first_day, '>=')
	                     ->orderBy('meetringsPerDay.date','ASC')
	                     ->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	      array_push($row_data, array('date' => $record['date'],
	      							  'alice' => $record['alice'],
	      							  'cms' => $record['cms'],
	      							  'lhcb' => $record['lhcb'],
	      							  'other' => $record['other'],
	      							  'atlas' => $record['atlas']));
	    }
	    return array('data' => $row_data);
	}



	// Renders Json for Google Chars for Distinct users per Month
	function cvs_get_uniqueUsersPerMonth(){
	    $select = db_select('cern_vidyo_statistics_unique_users', 'unique_users');
	    $select = $select->fields('unique_users')
	    	             ->condition('unique_users.year', date("Y")-1, '>=')
	    				 ->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	      $record['month'] = sprintf('%02d', $record['month']);
	      if($record['year'] == (date("Y")-1) && $record['month'] <= sprintf('%02d',date('m')))
	      	continue;
	      array_push($row_data, $record);
	    }
	    return array('data' => $row_data);
	}

	// Renders Json for Google Chars for Participants per Meeting
	function cvs_get_callersPerMeeting(){
		$select = db_query("SELECT Count(*) AS meetings, conference_calls AS callers
			                FROM `cern_vidyo_statistics_usersInConference_perMeeting`
                            GROUP BY conference_calls");
	    $row_data = array();
	    foreach ($select as $record) {
			array_push($row_data, $record);
	    }

	    return array('data' => $row_data);
	}

	// Renders Json for Google Chars for Client Installations Evolution
	function cvs_get_installations() {
    	$select = db_select('cern_vidyo_statistics_installations', 'installations');
	    $select = $select->fields('installations')
	    				 ->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	      array_push($row_data, $record);
	    }
	    return array('data' => $row_data);
	}

	// Renders Json for Google Chars for Registrations
	function cvs_get_registrations(){
    	$select = db_select('cern_vidyo_statistics_licenses', 'regs');
	    $select = $select->fields('regs')
	    				 ->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	    	if($record['name']=='Seats')
	    		$row_data['Seats'] = array('value' => $record['value'], 'max' => $record['max']);
	    	if($record['name']=='Installs')
	    		$row_data['Installs'] = array('value' => $record['value'], 'max' => $record['max']);
	    	if($record['name']=='Ports')
	    		$row_data['Ports'] = array('value' => $record['value'], 'max' => $record['max']);
	    }
	    return array('data' => $row_data);
	}

	// Renders Json for Google Chars for User Groups
	function cvs_get_groups(){
    	$select = db_select('cern_vidyo_statistics_groups', 'groups');
	    $select = $select->fields('groups')
	    				 ->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	    	array_push($row_data, $record);
	    }
	    return array('data' => $row_data);
	}

		// Renders Json for Google Chars for Registered H.323 endpoints (Meeting Rooms)
	function cvs_get_legacies(){
    	$select = db_select('cern_vidyo_statistics_legacies', 'groups');
	    $select = $select->fields('groups')
	    				 ->orderBy('value','DESC')
	    				 ->execute();
	    $row_data = array();
	    while($record = $select->fetchAssoc()){
	    	array_push($row_data, $record);
	    }
	    return array('data' => $row_data);
	}

	// Renders Json for Google Chars for Piwik Browsers
	function cvs_get_pwiki($period,$method){
		$date = "today";
		$old_period = $period;
		if($old_period == "last_year"){
			$year = date("Y") - 1;
			$date = date($year.'-m-d,Y-m-d');
			$period = "month";
		}
		if($old_period == 'month'){
				$date = date("Y-m-01,Y-m-d");
				$period = "day";
			}
		if($old_period == 'year'){
				$date = date("Y-01-01,Y-m-d");
				$period = "month";
			}
		if($method){
		$url = $this->piwik_portal.'?module=API&method='.$method.'&idSite='.$this->piwik_site.'&period='.$period.'&date='.$date.'&format=JSON&token_auth='.$this->piwik_token;
		$row_data = json_decode(file_get_contents($url),true);
		}
		else {
			$row_data = array('piwik_portal'=>($this->piwik_portal), 'piwik_site'=>($this->piwik_site), 'date'=>$date,'auth_token'=>($this->piwik_token));
		}
		return array('data' => $row_data,'period'=>$old_period, 'type'=>$method, 'total'=>count($row_data));
	}
}
