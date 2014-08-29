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

# MySQL helpers.

class CVS_MySQL {

	private $hostname;
    private $dbName;
    private $username;
    private $password;

	function __construct(){
		$this->hostname = variable_get('cvs_db_hostname');
        $this->dbName = variable_get('cvs_db_database');
        $this->username = variable_get('cvs_db_username');
        $this->password = variable_get('cvs_db_password');
	}

	function getConn(){
		try {
			// connect to the database or report an error message
    		$dbConnection = new PDO("mysql:host=" . $this->hostname . ";dbname=" . $this->dbName, $this->username, $this->password) ;
    		// the connection is closed automatically when the script is terminated
    		return $dbConnection;
    	} catch (PDOException $e) {
		    watchdog("CERN Vidyo Statistics", "Error connecting to MySQL database: " . $e->getMessage() );
		    die("Error connecting to MySQL database: " . $e->getMessage());
		}
	}

}
