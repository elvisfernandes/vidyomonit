<?php

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