<?php
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

# Background operations.

require_once 'helpers/cvs_indico.php';
require_once 'helpers/cvs_mysql.php';
require_once 'helpers/cvs_soap.php';
require_once 'cvs_data_display.php';

class CVS_background_worker {

    // store the time in the past to consider an entry in the XML old and to be removed
    private $limitPast;

  // webservice soap access for user API
    private $indico;

    // mysql database connection object
    private $mysql;

    // webservice soap access for user API
    private $soap;

    // private var used by calculated by get_maximum_simultaneous_callers_last24 but used by get_license_status()
    private $max_sim_users_now = 0;
    private $busy_members = 0;

    /*
     * Get the configuration params from the Drupal module and init external connections.
     */
    function __construct(){
        $this->limitPast = time() - 60 * 60 * 24 * 365; // 60 secs * 60 mins * 24 hours * 365 days = 1 year
        $this->indico = new CVS_Indico();
        $this->mysql = new CVS_MySQL();
        $this->soap = new CVS_SOAP();
    }

    /*
     * Update monitoring tab history (Cron job only on the drupal server)
     */
    public function update_monitoring(){
        $url = $this->get_cvs_monitoring_proxy_server() . 'hosts/';
        // Create map with request parameters
        $params = array ('update' => 'True',
                         'username'=>variable_get('cvs_monitoring_proxy_username'),
                         'password'=>variable_get('cvs_monitoring_proxy_password')
                         );

        // Build Http query using params
        $query = http_build_query ($params);

        // Create Http context details
        $contextData = array (
                        'method' => 'POST',
                        'header' => "Connection: close\r\n".
                                    "Content-type: application/x-www-form-urlencoded\r\n".
                                    "Content-Length: ".strlen($query)."\r\n",
                        'content'=> $query );

        // Create context resource for our request
        $context = stream_context_create (array ( 'http' => $contextData ));

        // Read page rendered as result of your POST request
        try{
        $result =  file_get_contents (
                          $url,  // page url
                          false,
                          $context);
        }
        catch(Exception $e){
              watchdog("CERN Vidyo statistics", "Vidyo proxy cron job failed");
        }
    }

    public function get_minutes_in_conference(){
        $mydate = date('Y-m-d 00:00:00');
        $today_time_stamp = strtotime($mydate);
        $yesterday = date('Y-m-d', strtotime('-' . 1 . ' day', $today_time_stamp));
        $today = $mydate;
        $url = $this->get_cvs_monitoring_proxy_server() . 'ajax/minutes_in_conferences/';
        // Create map with request parameters
        $params = array ('start_date' => $yesterday,
                         'end_date' => $today,
                         'username'=>variable_get('cvs_monitoring_proxy_username'),
                         'password'=>variable_get('cvs_monitoring_proxy_password')
                         );

        // Build Http query using params
        $query = http_build_query ($params);

        // Create Http context details
        $contextData = array (
                        'method' => 'POST',
                        'header' => "Connection: close\r\n".
                                    "Content-type: application/x-www-form-urlencoded\r\n".
                                    "Content-Length: ".strlen($query)."\r\n",
                        'content'=> $query );

        // Create context resource for our request
        $context = stream_context_create (array ( 'http' => $contextData ));

        // Read page rendered as result of your POST request
        $result =  file_get_contents (
                          $url,  // page url
                          false,
                          $context);
        if($result){
            $result = json_decode($result,True);
            $total_minutes = 0;
            for($i=0;$i<count($result);$i++){
                $total_minutes += $result[$i]['minutes'];
            }
            $data_db = array("timestamp"=>$today_time_stamp, "minutes"=>$total_minutes);
            $has_data = db_select('cern_vidyo_statistics_minutesInConference', 'minutesInConf')
                    ->fields('minutesInConf')
                    ->condition('minutesInConf.timestamp', $today_time_stamp)
                    ->execute()
                    ->rowCount() > 0 ? true : false;
            if($has_data){
                db_update('cern_vidyo_statistics_minutesInConference')->fields($data_db)
                                                       ->condition('cern_vidyo_statistics_minutesInConference.timestamp', $today_time_stamp)
                                                       ->execute();
            }
            else {
                db_insert('cern_vidyo_statistics_minutesInConference')->fields($data_db)->execute();
            }
        }
    }

    /**
     * Fetch minutes in today's conferences.
     */
    public function get_minutes_in_conference_today(){
        $mydate = date('Y-m-d 00:00:00');
        $today_time_stamp = strtotime($mydate);
        $tomorrow = date('Y-m-d', strtotime('+' . 1 . ' day', $today_time_stamp));
        $today = $mydate;
        $url = $this->get_cvs_monitoring_proxy_server() . 'ajax/minutes_in_conferences/';
        // Create map with request parameters
        $params = array ('start_date' => $today,
                         'end_date' => $tomorrow,
                         'username'=>variable_get('cvs_monitoring_proxy_username'),
                         'password'=>variable_get('cvs_monitoring_proxy_password')
                         );

        // Build Http query using params
        $query = http_build_query ($params);

        // Create Http context details
        $contextData = array (
                        'method' => 'POST',
                        'header' => "Connection: close\r\n".
                                    "Content-type: application/x-www-form-urlencoded\r\n".
                                    "Content-Length: ".strlen($query)."\r\n",
                        'content'=> $query );

        // Create context resource for our request
        $context = stream_context_create (array ( 'http' => $contextData ));

        // Read page rendered as result of your POST request
        $result =  file_get_contents (
                          $url,  // page url
                          false,
                          $context);
        if($result){
            $result = json_decode($result,True);
            $total_minutes = 0;
            for($i=0;$i<count($result);$i++){
                $total_minutes += $result[$i]['minutes'];
            }
            $data_db = array("timestamp"=>$today_time_stamp, "minutes"=>$total_minutes);
            $has_data = db_select('cern_vidyo_statistics_minutesInConference', 'minutesInConf')
                    ->fields('minutesInConf')
                    ->condition('minutesInConf.timestamp', $today_time_stamp)
                    ->execute()
                    ->rowCount() > 0 ? true : false;
            if($has_data){
                db_update('cern_vidyo_statistics_minutesInConference')->fields($data_db)
                                                       ->condition('cern_vidyo_statistics_minutesInConference.timestamp', $today_time_stamp)
                                                       ->execute();
            }
            else {
                db_insert('cern_vidyo_statistics_minutesInConference')->fields($data_db)->execute();
            }
        }
    }

    function get_vr_list(){
        $url = $this->get_cvs_monitoring_proxy_server() . 'ajax/vidyorooms/';
        // Create map with request parameters
        $params = array ('username'=>variable_get('cvs_monitoring_proxy_username'),
                         'password'=>variable_get('cvs_monitoring_proxy_password')
                         );

        // Build Http query using params
        $query = http_build_query ($params);

        // Create Http context details
        $contextData = array (
                        'method' => 'POST',
                        'header' => "Connection: close\r\n".
                                    "Content-type: application/x-www-form-urlencoded\r\n".
                                    "Content-Length: ".strlen($query)."\r\n",
                        'content'=> $query );

        // Create context resource for our request
        $context = stream_context_create (array ( 'http' => $contextData ));

        // Read page rendered as result of your POST request
        $result =  file_get_contents (
                          $url,  // page url
                          false,
                          $context);
        return $result;
      }


    function getNiceDuration($durationInSeconds) {

          $duration = '';
          $days = floor($durationInSeconds / 86400);
          $durationInSeconds -= $days * 86400;
          $hours = floor($durationInSeconds / 3600);
          $durationInSeconds -= $hours * 3600;
          $minutes = floor($durationInSeconds / 60);
          $seconds = $durationInSeconds - $minutes * 60;

          if($days > 0) {
            $duration .= $days . ' days';
          }
          if($hours > 0) {
            $duration .= ' ' . $hours . ' hours';
          }
          if($minutes > 0) {
            $duration .= ' ' . $minutes . ' minutes';
          }
          if($seconds > 0) {
            $duration .= ' ' . $seconds . ' seconds';
          }
          return $duration;
    }

    public function get_users_in_conference_per_meeting(){
        $execStart = time();

        // retrieve information for ConferenceCall
        $resultConfCall = $this->mysql->getConn()->query(
                "SELECT COUNT(*) AS users, ConferenceName
                FROM ConferenceCall2
                WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND
                (
                    (
                      CallState = 'IN PROGRESS'
                      AND JoinTime > CURDATE() - INTERVAL 2 DAY
                    )
                ) GROUP BY ConferenceName
                ORDER BY JoinTime");
        while($row = $resultConfCall->fetch()){

          // Get Values from query Vidyo DB
          $values_to_insert = array();
          $values_to_insert['conference_calls'] = $row['users'];
          $values_to_insert['conferance'] = utf8_decode($row['ConferenceName']);
          $values_to_insert['timestamp'] = $execStart;
          $values_to_insert['is_agragated'] = 0;

          // Select query to drupal db with where condition. Fetch all records with same conference in maximums table
          $has_yesterday = db_select('cern_vidyo_statistics_usersInConference_perMeeting')
              ->fields('cern_vidyo_statistics_usersInConference_perMeeting')
              ->condition('conferance', $values_to_insert['conferance'])
              ->execute()->fetch();

          if($has_yesterday){
            // If there is a record present and the number of live calls are greater than the previous maximum
            if($has_yesterday->conference_calls < $values_to_insert['conference_calls']){

              // Update the maximum number of calls on a meeting
              db_update('cern_vidyo_statistics_usersInConference_perMeeting')->fields($values_to_insert)
                                     ->condition('cern_vidyo_statistics_usersInConference_perMeeting.conferance', $values_to_insert['conferance'])
                                     ->execute();
            }
          }
          // There is no record present for the conference. Just insert new record on maximums table
          else {
            db_insert('cern_vidyo_statistics_usersInConference_perMeeting')->fields($values_to_insert)->execute();
          }
        }
    }

    /*
     * Extract information from Vidyo database to get the real number of Conference Calls and PointToPoint
     * for the last 24 hours.
     */
    public function get_users_in_conference_calls_last24(){
        $execStart = time();

        // retrieve information for ConferenceCall
        $resultConfCall = $this->mysql->getConn()->query(
                "SELECT COUNT(*) AS users
                FROM ConferenceCall2
                WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND ConferenceType = 'C' AND
                (
                    (
                      CallState = 'IN PROGRESS'
                      AND JoinTime > NOW() - INTERVAL 2 DAY
                    )
                    OR (
                        CallState = 'COMPLETED'
                        AND TIMEDIFF(LeaveTime, JoinTime) > 60
                        AND JoinTime > NOW() - INTERVAL 1 DAY
                    )
                )
                ORDER BY JoinTime");

        $row = $resultConfCall->fetch();
        $values_to_insert['conference_calls'] = $row['users'];
        $resultConfCall = $this->mysql->getConn()->query(
                "SELECT COUNT(*) AS point_to_point
                FROM ConferenceCall2
                WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND ConferenceType = 'D' AND Direction = 'O'
                AND
                (
                    (
                      CallState = 'IN PROGRESS'
                      AND JoinTime > NOW() - INTERVAL 2 DAY
                    )
                OR (
                        CallState = 'COMPLETED'
                        AND TIMEDIFF(LeaveTime, JoinTime) > 60
                        AND JoinTime > NOW() - INTERVAL 1 DAY
                    )
                )
                ORDER BY JoinTime");

        $row = $resultConfCall->fetch();
        $values_to_insert['timestamp'] = $execStart;
        $values_to_insert['point_to_point'] = $row['point_to_point'];
        $values_to_insert['is_agragated'] = 0;
        db_insert('cern_vidyo_statistics_usersInConference')->fields($values_to_insert)->execute();
    }



  /*
     * Extract information from Vidyo database to get the real number of Conference Calls and PointToPoint
     */
    public function get_users_in_conference_calls(){
        $execStart = time();

        // retrieve information for ConferenceCall
        $resultConfCall = $this->mysql->getConn()->query(
                "SELECT COUNT(*) AS users
                FROM ConferenceCall2
                WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND ConferenceType = 'C' AND
                (
                    (
                      CallState = 'IN PROGRESS'
                      AND JoinTime > NOW() - INTERVAL 2 DAY
                    ) OR (
                      CallState = 'COMPLETED'
                      AND JoinTime > DATE(NOW() - INTERVAL 1 DAY)
                      AND TIMEDIFF(LeaveTime, JoinTime) > 60
                    )
                )
                ORDER BY JoinTime");

        $row = $resultConfCall->fetch();
        $values_to_insert['conference_calls'] = $row['users'];
        $resultConfCall = $this->mysql->getConn()->query(
                "SELECT COUNT(*) AS point_to_point
                FROM ConferenceCall2
                WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND ConferenceType = 'D' AND Direction = 'O'
                AND
                (
                    (
                      CallState = 'IN PROGRESS'
                      AND JoinTime > NOW() - INTERVAL 2 DAY
                    ) OR (
                      CallState = 'COMPLETED'
                      AND JoinTime > DATE(NOW() - INTERVAL 1 DAY)
                      AND TIMEDIFF(LeaveTime, JoinTime) > 60
                    )
                )
                ORDER BY JoinTime");

        $row = $resultConfCall->fetch();
        $values_to_insert['timestamp'] = $execStart;
        $values_to_insert['point_to_point'] = $row['point_to_point'];
        $values_to_insert['is_agragated'] = 1;
        db_insert('cern_vidyo_statistics_usersInConference')->fields($values_to_insert)->execute();
    }





    /*
     * Fetch how many calls IN PROGRESS are happening now. Must be run every 1 minute
     */
    public function get_maximum_simultaneous_callers_last24(){

        $url = $this->get_cvs_monitoring_proxy_server() . 'hosts/';
        // Create map with request parameters
        $params = array (
                         'username'=>variable_get('cvs_monitoring_proxy_username'),
                         'password'=>variable_get('cvs_monitoring_proxy_password')
                         );

        // Build Http query using params
        $query = http_build_query ($params);

        // Create Http context details
        $contextData = array (
                        'method' => 'POST',
                        'header' => "Connection: close\r\n".
                                    "Content-type: application/x-www-form-urlencoded\r\n".
                                    "Content-Length: ".strlen($query)."\r\n",
                        'content'=> $query );

        // Create context resource for our request
        $context = stream_context_create (array ( 'http' => $contextData ));

        // Read page rendered as result of your POST request
        $result =  file_get_contents (
                          $url,  // page url
                          false,
                          $context);
        $users = -1;
        if($result){
            $result = json_decode($result,true);
            for($i=0;$i<count($result);$i++){
                if($result[$i]['device_type'] == "portal"){
                    $users = $result[$i]['specific_services']['number_of_users']['description'];
                }
            }
        }
        if($users != -1){
            $values_to_insert['users_number'] = $users;
            $values_to_insert['timestamp'] = time();
            $values_to_insert['is_agragated'] = 0;
            db_insert('cern_vidyo_statistics_maxSimCallers')->fields($values_to_insert)->execute();
        }
    }

    /* Compute the new users vs new devices
    */
    public function get_new_users_new_devices($day){

        if($day == null){
          $day = 0;
        }
        $today = strtotime('-'.$day.' day', strtotime(date('Y-m-d 00:00:00')));
        $newUsers = $this->mysql->getConn()->query(
                "SELECT COUNT(DISTINCT username) AS users
                FROM ClientInstallations2
                WHERE DATE(timeInstalled) < FROM_UNIXTIME(".$today.") AND username != 'Guest'")->fetch();
        $newDevices = 0;
        $newDevicesRow = $this->mysql->getConn()->query(
                "SELECT COUNT(username) AS users
                FROM ClientInstallations2
                WHERE DATE(timeInstalled) < FROM_UNIXTIME(".$today.") AND username != 'Guest'
                GROUP BY username HAVING count(username) > 1 ");
        while($row = $newDevicesRow->fetch()){
          $newDevices += $row['users'];
        }

        $guests = $this->mysql->getConn()->query(
                "SELECT COUNT(*) AS users
                FROM ClientInstallations2
                WHERE DATE(timeInstalled) < FROM_UNIXTIME(".$today.") AND username = 'Guest'")->fetch();

         $has_yesterday = db_select('cern_vidyo_statistics_users_devices')
              ->fields('cern_vidyo_statistics_users_devices')
              ->condition('timestamp', $today)
              ->execute()
              ->rowCount() > 0 ? true : false;
        $values_to_insert = array('timestamp'=>$today, 'new_users'=>$newUsers['users'],'new_devices'=>$newDevices,'new_guests'=>$guests['users']);
        if($has_yesterday){
          db_update('cern_vidyo_statistics_users_devices')->fields($values_to_insert)
                                 ->condition('cern_vidyo_statistics_users_devices.timestamp', $today)
                                 ->execute();
        }
        else {
          db_insert('cern_vidyo_statistics_users_devices')->fields($values_to_insert)->execute();
        }

    }

    /*
     * Extract information from Vidyo database to get the real number of Conference Calls
     * for the current month
     */
    public function get_maximum_simultaneous_callers(){
       $execStart = time();
               // retrieve information for ConferenceCall
        /*
        $resultConfCall = $this->mysql->getConn()->query(
                "SELECT COUNT(*) AS users_number
                FROM ConferenceCall2
                WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND
                (
                    (
                      CallState = 'IN PROGRESS'
                      AND JoinTime > DATE(NOW() - INTERVAL ".($days+2)." DAY)
                      AND JoinTime < DATE(NOW() - INTERVAL ".($days). " DAY)
                    ) OR (
                      CallState = 'COMPLETED'
                      AND JoinTime > DATE(NOW() - INTERVAL ".($days+1)." DAY)
                      AND JoinTime < DATE(NOW() - INTERVAL ".($days). " DAY)
                      AND TIMEDIFF(LeaveTime, JoinTime) > 60
                    )
                )
                ORDER BY JoinTime");

        $row = $resultConfCall->fetch();
        */
        $day = 0;
        $today = strtotime('-'.$day.' day', strtotime(date('Y-m-d 00:00:00')));

        $select = db_select('cern_vidyo_statistics_maxSimCallers')
                    ->fields('cern_vidyo_statistics_maxSimCallers')
                    ->condition('is_agragated', 0)
                    ->condition('timestamp',$today,'>')
                    ->condition('timestamp',strtotime('+1 day',$today), '<=')
                    ->orderby('users_number','DESC')
                    ->execute();
        while($row = $select->fetchAssoc()){
          if ($row['users_number'] == NULL || $row['users_number'] <= 0){
            continue;
          }
          $values_to_insert['users_number'] = $row['users_number'];
          $values_to_insert['timestamp'] = $today;
          $values_to_insert['is_agragated'] = 1;
          $has_yesterday = db_select('cern_vidyo_statistics_maxSimCallers')
              ->fields('cern_vidyo_statistics_maxSimCallers')
              ->condition('timestamp', $today)
              ->condition('is_agragated', 1)
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_yesterday){
          db_update('cern_vidyo_statistics_maxSimCallers')->fields($values_to_insert)
                                 ->condition('cern_vidyo_statistics_maxSimCallers.timestamp', $today)
                                 ->execute();
        }
        else {
          db_insert('cern_vidyo_statistics_maxSimCallers')->fields($values_to_insert)->execute();
          watchdog("CERN Vidyo statistics", "Number of simultationus connections: ".$row['users_number']);
        }
          break;
        }
    }
    /*
     * Get from Indico the number of meetings in the last week per category
     * Runs once per day and updates/inserts the values for yesterday and today.
     */
    public function get_meetings_lastweek(){
        $today = strtotime(date('Y-m-d'));
        $yesterday = date('Y-m-d', strtotime('-' . 1 . ' day', $today));
        $today = date('Y-m-d');

        $yesterday_meetings = array();
        $today_meetings = array();

        $yesterday_total_meetings = 0;
        $today_total_meetings = 0;


        // fetch from Indico Vidyo meetings per category
        $categories = array(
                        'other' => '0', // this MUST be as first
                        'atlas' => '1l2',
                        'cms' => '2l76',
                        'lhcb' => '1l22',
                        'alice' => '1l8',
                        );

        $days = array();
        $indicoRequest = new CVS_Indico();
        $total_meetings = 0;
        // for each category, get the meetings
        foreach ($categories as $catName => $catValue){
            // perform a request for the last 7 days
            $results = $indicoRequest->fetchVidyoMeetings($yesterday, $today, $catValue);
            if ($results){
                $meetings = $results['results'];
                $total_meetings += $results['count'];
                if ($results['count'] > 0 && $meetings){
                    foreach ($meetings as $meeting){

                        // get the start date
                        $thisDate = $meeting['startDate']['date'];
                        if($thisDate == $yesterday){
                          if (array_key_exists($catName, $yesterday_meetings)){
                              $yesterday_meetings[$catName]++;
                            }
                            else{
                              $yesterday_meetings[$catName] = 1;
                            }

                            if ($catName != 'other'){
                              $yesterday_total_meetings++;
                            }
                        }
                        elseif($thisDate == $today){
                          if (array_key_exists($catName, $today_meetings)){
                              $today_meetings[$catName]++;
                            }
                            else{
                              $today_meetings[$catName] = 1;
                            }
                             if ($catName != 'other'){
                              $today_total_meetings++;
                            }
                        }
                    }
                }
            }
        }
        $yesterday_meetings['other'] -= $yesterday_total_meetings;
        $today_meetings['other'] -= $today_total_meetings;
        $yesterday_meetings['date'] = $yesterday;
        $today_meetings['date'] = $today;
        $yesterday_meetings['is_agragated'] = 0;
        $today_meetings['is_agragated'] = 0;
        //Update or insert yesterday value
        $has_yesterday = db_select('cern_vidyo_statistics_meetings', 'connectionsPerWeek')
              ->fields('connectionsPerWeek')
              ->condition('connectionsPerWeek.date', $yesterday)
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_yesterday){
          db_update('cern_vidyo_statistics_meetings')->fields($yesterday_meetings)
                                 ->condition('cern_vidyo_statistics_meetings.date', $yesterday)
                                 ->execute();
        }
        else {
          db_insert('cern_vidyo_statistics_meetings')->fields($yesterday_meetings)->execute();
        }

        //Update or insert today value
        $has_today = db_select('cern_vidyo_statistics_meetings', 'connectionsPerWeek')
              ->fields('connectionsPerWeek')
              ->condition('connectionsPerWeek.date', $today)
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_today){
          db_update('cern_vidyo_statistics_meetings')->fields($today_meetings)
                                 ->condition('cern_vidyo_statistics_meetings.date', $today)
                                 ->execute();
        }
        else {
          db_insert('cern_vidyo_statistics_meetings')->fields($today_meetings)->execute();

        }
    }

    /*
     * Get from Indico the number of meetings in the last week per category
     * Runs once per day and updates/inserts the values.
     */
    public function get_meetings_lastmonth(){
      $select = db_select('cern_vidyo_statistics_meetings', 'meetringsPerDay');
      $today = strtotime(date('Y-m-d'));
      // Computing the last 2 months to avoid the edge case of the first day of the month.
        $first_day = date('Y-m-01', strtotime('-' . 1 . ' month', $today));

      $select = $select->fields('meetringsPerDay')
                       ->condition('meetringsPerDay.is_agragated', 0)
                       ->condition('meetringsPerDay.date', $first_day, '>=')
                       ->execute();
      //Last month data
      $row_data = array('date' => date('Y-m-01', strtotime('-' . 1 . ' month', $today)),
                  'alice' => 0,
                  'cms' => 0,
                  'lhcb' => 0,
                  'other' => 0,
                  'atlas' => 0,
                  'is_agragated' => 1
                  );
      $months_data = array();
      array_push( $months_data, $row_data);
      //Current month
      $row_data['date'] = date('Y-m-01');
      array_push( $months_data, $row_data);
      while($record = $select->fetchAssoc()){
        $splited_date = explode('-', $record['date']);
        $index = 0;
        if($splited_date[1] == date('m'))
          $index = 1;
        $months_data[$index]['alice'] += $record['alice'];
        $months_data[$index]['cms'] += $record['cms'];
        $months_data[$index]['lhcb'] += $record['lhcb'];
        $months_data[$index]['other'] += $record['other'];
        $months_data[$index]['atlas'] += $record['atlas'];
      }
      for($i=0;$i<count($months_data);$i++){
      //Update or insert computed value
          $already_exists = db_select('cern_vidyo_statistics_meetings', 'connectionsPerMonth')
                ->fields('connectionsPerMonth')
                ->condition('connectionsPerMonth.date', $months_data[$i]['date'])
                      ->condition('connectionsPerMonth.is_agragated', 1)
                ->execute()
                ->rowCount() > 0 ? true : false;
          if($already_exists &&  $months_data[$i]['atlas'] > 0 ){
            db_update('cern_vidyo_statistics_meetings')
                ->fields($months_data[$i])
                ->condition('cern_vidyo_statistics_meetings.date', $months_data[$i]['date'])
                      ->condition('cern_vidyo_statistics_meetings.is_agragated', 1)
                ->execute();
          }
          else if($months_data[$i]['atlas'] > 0 ) {
            db_insert('cern_vidyo_statistics_meetings')->fields($months_data[$i])->execute();

          }
      }
    }

     /*
     * Extract information from Vidyo database to get how many unique users have connected each month
     */
    public function get_unique_users_per_month(){
        $room_list = $this->get_vr_list();
        $execStart = time();

        $today = strtotime(date('Y-m-d'));

        // this month until today
        $currentDate = date('Y-m', $today);
        $currentStart = date('Y-m', $today) . '-01';
        $currentEnd = date('Y-m-d', $today);

        $whereOthers = " (EndpointType = 'D') ";
        $whereGuest = " (EndpointType = 'G') ";
        // telephone can be: 'anonymous' or '+number' (ex. +4143435)
        $whereTel = " ( EndpointType = 'L' AND (CallerName = 'anonymous' OR CallerName REGEXP '^([0-9]+)(@|#)*(.*)$') ) ";
        // H.323 legacy but not telephones
        $whereH323 = " (EndpointType = 'L') AND NOT " . $whereTel;
        $whereRooms = " (CallerID IN (".$room_list.")) ";

        $queryOthers = "SELECT COUNT(DISTINCT CallerName) AS total
                        FROM ConferenceCall2
                        WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND
                        DATE(JoinTime) BETWEEN '" . $currentStart . "' AND '" . $currentEnd . "'
                        AND " . $whereOthers . "
                        ; ";

        $queryGuests = "SELECT COUNT(*) AS total
                        FROM ConferenceCall2
                        WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND
                        DATE(JoinTime) BETWEEN '" . $currentStart . "' AND '" . $currentEnd . "'
                        AND " . $whereGuest . "
                        ; ";

        $queryH323 = "SELECT COUNT(DISTINCT CallerName) AS total
                        FROM ConferenceCall2
                        WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND
                        DATE(JoinTime) BETWEEN '" . $currentStart . "' AND '" . $currentEnd . "'
                        AND " . $whereH323 . "
                        ; ";

        $queryTel = "SELECT COUNT(DISTINCT CallerName) AS total
                        FROM ConferenceCall2
                        WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND
                        DATE(JoinTime) BETWEEN '" . $currentStart . "' AND '" . $currentEnd . "'
                        AND " . $whereTel . "
                        ; ";

        $queryRooms = "SELECT COUNT(DISTINCT CallerName) AS total
                        FROM ConferenceCall2
                        WHERE TenantName IS NOT NULL AND JoinTime IS NOT NULL AND
                        DATE(JoinTime) BETWEEN '" . $currentStart . "' AND '" . $currentEnd . "'
                        AND " . $whereRooms . "
                        ; ";

        $row_data = array();

        $queryOthers = $this->mysql->getConn()->query($queryOthers);
        $current = $queryOthers->fetch();
        $row_data['totalOthers'] = $current['total'];

        $queryGuests = $this->mysql->getConn()->query($queryGuests);
        $current = $queryGuests->fetch();
        $row_data['totalGuests'] = $current['total'];

        $queryH323 = $this->mysql->getConn()->query($queryH323);
        $current = $queryH323->fetch();
        $row_data['totalH323'] = $current['total'];

        $queryTel = $this->mysql->getConn()->query($queryTel);
        $current = $queryTel->fetch();
        $row_data['totalTel'] = $current['total'];

        $queryRooms = $this->mysql->getConn()->query($queryRooms);
        $current = $queryRooms->fetch();
        $row_data['totalVidyoRooms'] = $current['total'];
        $dateArray = explode('-',$currentDate);
        $row_data['year'] = $dateArray[0];
        $row_data['month'] = $dateArray[1];
        $has_data = db_select('cern_vidyo_statistics_unique_users', 'unique_users')
              ->fields('unique_users')
              ->condition('unique_users.year', $dateArray[0])
              ->condition('unique_users.month', $dateArray[1])
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_data){
          db_update('cern_vidyo_statistics_unique_users')->fields($row_data)
              ->condition('cern_vidyo_statistics_unique_users.year', $dateArray[0])
              ->condition('cern_vidyo_statistics_unique_users.month', $dateArray[1])
              ->execute();
        }
        else {
          db_insert('cern_vidyo_statistics_unique_users')->fields($row_data)->execute();

        }
    }

    /*
     * Extract information from Vidyo database to get how many people are per meeting:
     * for example, 2 meetings with 20 people, 7 meetings with 5 people, etc..
     */
    public function get_callers_per_meeting(){
        }



     /*
     * Get the data  from Vidyo database to get the unique installations of the software.
     */
    public function get_unique_installations(){
        $arrayCliInstalls = array();

        //retrieve all the information
        $resultCliInstalls = $this->mysql->getConn()->query(
            "SELECT DATE(timeInstalled) as d
            FROM ClientInstallations2
            WHERE DATE(timeInstalled) > DATE(NOW() - INTERVAL 1 WEEK)"
            );

        while ($row = $resultCliInstalls->fetch()){
            //gets the call status
            $time = strtotime($row['d']);

            if (array_key_exists($time, $arrayCliInstalls))
                $arrayCliInstalls[$time]++;
            else
                $arrayCliInstalls[$time] = 1;
        }

        foreach($arrayCliInstalls as $timestamp => $value){
          $row_data = array(
                    "timestamp" => $timestamp,
                    "installed_V2" => $value,
                    "installed_V1" => 0
                    );
          $has_data = db_select('cern_vidyo_statistics_installations', 'installs')
              ->fields('installs')
              ->condition('installs.timestamp', $timestamp)
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_data){
            db_update('cern_vidyo_statistics_installations')->fields($row_data)
                  ->condition('cern_vidyo_statistics_installations.timestamp', $timestamp)
                  ->execute();
        }
        else {
            db_insert('cern_vidyo_statistics_installations')->fields($row_data)->execute();
        }
        }
    }


    /*
     * Get the various licence statuses
     */
    public function get_license_status() {
        // retrieve information for the SOAP webservice
        $client = $this->soap->getConn("admin");
        try {
            // call the method to get the Licenses Data
            $result = $client->GetLicenseData();
        } catch (SoapFault $fault) {
            watchdog("CERN Vidyo statistics", "Sorry, API GetLicenseData() returned the following ERROR: ".$fault->faultcode."-".$fault->faultstring.".");
            return;
        }
        $licenses = $result->LicenseFeature;

        $arrayResults = array();
        foreach ($licenses as $license){
            // save the number of licenses for each type
            if ($license->Name == "Seats" || $license->Name == "Ports" || $license->Name == "Installs"){
                $arrayResults[] = array( 'current' => $license->CurrentValue, 'name' => $license->Name, 'max' => $license->MaxValue );
                // write other users (not desktop)
                if ($license->Name == "Ports"){
                    $ports = (int)$license->CurrentValue;
                    $not_desktop = $this->max_sim_users_now - $ports;

                    /*
                    * BUG workaround
                    * It seems that the number of members with BUSY status is not right using User API.
                    * To get the BUSY members, just sum Ports and Not Desktop people
                    */
                    $this->busy_members = $not_desktop + $ports;
                    $arrayResults[] = array( 'current' => $not_desktop, 'name' => 'notDesktop', 'max' => 0 );
                }
            }
        }

        foreach ($arrayResults as $val){
            // new entry
            if ($val['name'] == 'notDesktop' && $val['current'] < 0)
                $val['current'] = 0;
            $row_data = array(
                    'name' => $val['name'],
                    'max' => $val['max'],
                    'value' => $val['current']);

            $has_data = db_select('cern_vidyo_statistics_licenses', 'regs')
              ->fields('regs')
              ->condition('regs.name', $val['name'])
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_data){
            db_update('cern_vidyo_statistics_licenses')->fields($row_data)
                  ->condition('cern_vidyo_statistics_licenses.name', $val['name'])
                  ->execute();
        }
        else {
            db_insert('cern_vidyo_statistics_licenses')->fields($row_data)->execute();
        }
        }
    }

    /*
     * Get from Vidyo database the number of registered users per group and the number of H323 endpoints per location
     */
    public function get_groups_and_legacies() {

        // retrieve information for the SOAP webservice
        $client = $this->soap->getConn("admin");
        try {
            // use the method GetMembers to get all the members of Vidyo
            $result = $client->GetMembers(array('query' => ''));
        } catch (SoapFault $fault) {
            watchdog("CERN Vidyo statistics", "Sorry, API GetMembers() returned the following ERROR: ".$fault->faultcode."-".$fault->faultstring.".");
            return;
        }
        // everything went fine, extract the needed data
        $members = $result->member;
        $arrayGroups = array();
        $arrayLegacies = array();
        // loop for each member to split them in several groups
        foreach ($members as $member) {
            // get the role of the member
            $role = $member->RoleName;
            // check if role is Legacy
            if ($role == "Legacy") {
                $name = $member->name;
                $matches = array();
                // get the room name
                $pattern = "/^ROOM_(.*)_.*/";
                if (preg_match($pattern, $name, $matches))
                    $location = $matches[1];
                else
                    $location = "Unknown";
                // add the member to a specific location or add to a one already present
                if (array_key_exists($location, $arrayLegacies))
                    $arrayLegacies[$location]++;
                else
                    $arrayLegacies[$location] = 1;
            }
            else {
                // other role, split by group name
                $groupName = $member->groupName;
                if (array_key_exists($groupName, $arrayGroups))
                    $arrayGroups[$groupName]++;
                else
                    $arrayGroups[$groupName] = 1;
            }
        }
        // sort the result
        ksort($arrayGroups);
        // sort the result
        ksort($arrayLegacies);
        //Groups
        db_truncate('cern_vidyo_statistics_groups')->execute();
        foreach ($arrayGroups as $name => $value){
           $row_data = array(
                    'name' => $name,
                    'value' => $value);
            $has_data = db_select('cern_vidyo_statistics_groups', 'groups')
              ->fields('groups')
              ->condition('groups.name', $name)
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_data){
            db_update('cern_vidyo_statistics_groups')->fields($row_data)
                  ->condition('cern_vidyo_statistics_groups.name', $name)
                  ->execute();
        }
        else {
            db_insert('cern_vidyo_statistics_groups')->fields($row_data)->execute();
        }
        }
        //Legacy
        db_truncate('cern_vidyo_statistics_legacies')->execute();
        foreach ($arrayLegacies as $name => $value){
           $row_data = array(
                    'name' => $name,
                    'value' => $value);
            $has_data = db_select('cern_vidyo_statistics_legacies', 'legacy')
              ->fields('legacy')
              ->condition('legacy.name', $name)
              ->execute()
              ->rowCount() > 0 ? true : false;
        if($has_data){
            db_update('cern_vidyo_statistics_legacies')->fields($row_data)
                  ->condition('cern_vidyo_statistics_legacies.name', $name)
                  ->execute();
        }
        else {
            db_insert('cern_vidyo_statistics_legacies')->fields($row_data)->execute();
        }
        }
        watchdog("Everything is ok","Cron ok");
    }

     /*
     * Find the maximum number of simultaneous callers in the range of callers passed as parameter.
     * IMPORTANT: the param $arrayRange MUST be sorted by joinTime
     *
     * The algorithm uses the concept of "windows": each caller represents a window, from the joinTime
     * to the leaveTime and a counter, which represents how many people are sim. calling with him.
     * For each window, if the caller is inside, the caller's counter is incremented.
     * At the end of the scan, this caller's window is appended to the windows structure.
     * In this way, each caller is checked with all the other windows before this call.
     *
     * Example of the problem
     * W = window
     * J = JoinTime
     * L = LeaveTime
     *         J1 ------------ L1
     *         J2 ------------------ L2
     *             J3 ------------ L3
     *                J4 ------------------------------------------- L4
     */

    private function get_max_sim_callers_range($arrayRange){
        $maximum = 1;
        $windows = array();

        foreach ($arrayRange as $caller){
            // scan each window

            foreach ($windows as $window){
                if (
                ( ($window['start'] <=  $caller['JoinTime']) && ( $caller['JoinTime'] <= $window['end']) ) ||
                ( ($window['start'] <= $caller['LeaveTime']) && ($caller['LeaveTime']<= $window['end']) )
                ){
                    $caller['simCallers']++;
                    if ($caller['simCallers'] > $maximum)
                        $maximum = $caller['simCallers'];
                }
            }

            $windows[] = array(
                            'start' => $caller['JoinTime'],
                            'end' => $caller['LeaveTime'],
                        );
        }

        return $maximum;
    }

    /**
     *
     * Used to search in a array of arrays a key
     */
    private function search_array_key($search, $array){
        foreach($array as $key => $element){
            if($element['callers'] == $search)
                return $key;
        }
        return FALSE;
    }

    private function usort_array_callers_per_meeting($a, $b){
        return $a['callers']>$b['callers'];
    }

    public function send_vidyo_minutes_email() {
        $display = new CSV_data_display();
        $result = $display->cvs_get_minutesInConferences(1);
        $data = $result['data'];
        krsort($data);

        $module = 'cern_vidyo_statistics';
        $mailkey = 'vidyo_minutes_cronjob';

        $from = 'cron@test-avc-dashboard.cern.ch';
        $recipient = 'service-avc-operation@cern.ch';


        $message = drupal_mail($module, $mailkey, $recipient, LANGUAGE_NONE, array(), $from, FALSE);

        $message['subject'] = 'Monthly Vidyo usage minutes';

        $message['body'] = array();
        $message['body'][] = 'Monthly Vidyo usage minutes*:';
        $message['body'][] = '';

        foreach ($data as $item) {
            if ($item['timestamp'] != date('Y-m')) {
                $message['body'][] = $item['timestamp'] . ': ' . $item['minutes'] . ' minutes';
            }
        }

        $message['body'][] = '';
        $message['body'][] = '*The sum of minutes of all users per Vidyo meeting in all meetings with more than 1 participants';

        // retrieve the responsible implementation for this message.
        $system = drupal_mail_system($module, $mailkey);

        // format the message body.
        $message = $system->format($message);

        // send e-mail
        $message['result'] = $system->mail($message);
    }


    public function get_cvs_monitoring_proxy_server() {
        $url = variable_get('cvs_monitoring_proxy_server');
        $regexp = '/^(?:https?:\/+)?(vidyodash\.cern\.ch)(?:\/.*)?$/';
        preg_match($regexp, $url, $match);
        if (count($match) == 2) {
            return 'https://' . $match[1] . '/';
        }
        return $url;
    }
}
?>
