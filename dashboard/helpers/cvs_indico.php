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

# Indico helpers.

class CVS_Indico {

	private $hostname;
	private $apiKey;
	private $secretKey;

	function __construct(){
		$this->hostname = variable_get('cvs_indico_url');
		$this->apiKey = variable_get('cvs_indico_apikey');
		$this->secretKey = variable_get('cvs_indico_secretkey');
	}

	private function exportIndicoData($path, $params=array()){
		$url = $this->buildIndicoRequest($path,
										$params,
										$this->apiKey,
										$this->secretKey
										);
		// add the hostname
		$requestUrl = rtrim($this->hostname, '/') . $url;
		// get the JSON result and transform it in array
		if ($arrayData = $this->loadFromURL($requestUrl))
			return $arrayData;
		else
			watchdog("CERN Vidyo Statistics", "Indico request failed: " . $requestUrl );
	}

 	private function buildIndicoRequest($path, $params=array(), $api_key=NULL, $secret_key=NULL, $only_public=FALSE, $persistent=TRUE){
		if($api_key) {
			$params['apikey'] = $api_key;
		}

		if($only_public) {
			$params['onlypublic'] = 'yes';
		}

		if($secret_key) {
			if(!$persistent) {
				$params['timestamp'] = time();
			}
			uksort($params, 'strcasecmp');
			$url = $path . '?' . http_build_query($params);
			$params['signature'] = hash_hmac('sha1', $url, $secret_key);
		}

		if(!$params) {
			return $path;
		}

		return $path . '?' . http_build_query($params);
	}

	private function loadFromURL($url){
		// use CURL to get the content from a url
		$ch = curl_init();
		// set options
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		// get th result
		$result = curl_exec($ch);
		curl_close($ch);
		if ($result)
			return json_decode($result, TRUE);
	}

	public function fetchVidyoMeetings($dateFrom, $dateEnd, $category=NULL){
		$offset = 0;
		$complete = FALSE;
		$count = 0;
		$results = array();

		while (!$complete){

			// params from Indico documentation
			$params = array(
					'from' => $dateFrom,
					'to' => $dateEnd,
					'detail' => 'events',
					'offset' => $offset
			);
			// if a category is passed, add it to the params list
			if ($category != NULL)
				$params['categ'] = $category;

			// build the url for Indico
			$arrayData = $this->exportIndicoData('/export/video/vidyo.json', $params);

			if (!$arrayData || !key_exists('results', $arrayData)) // probably the request has failed
				return;
			if (!count($arrayData['results']))
				break;

			$count += $arrayData['count'];
			$results = array_merge($results, $arrayData['results']);

			// check for 'complete' param. If complete is False, there are more 1000 results.
			// Set the offset += 1000
			if (key_exists('complete', $arrayData) && $arrayData['complete'])
				$complete = TRUE;
			else
				$offset += 1000;
		}
		return array('count' => $count, 'results' => $results);
	}

}
