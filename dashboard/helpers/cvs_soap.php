<?php

class CVS_SOAP {

	private $soap_user_url;
	private $soap_user_username;
	private $soap_user_password;
        
	private $soap_admin_url;
	private $soap_admin_username;
	private $soap_admin_password;
       
    private $soap_usersstatus_url;
	private $soap_usersstatus_username;
	private $soap_usersstatus_password;
	
	function __construct(){
		$this->soap_user_url = variable_get('cvs_soap_user_url');
        $this->soap_user_username = variable_get('cvs_soap_user_username');
        $this->soap_user_password = variable_get('cvs_soap_user_password');
        
        $this->soap_admin_url = variable_get('cvs_soap_admin_url');
        $this->soap_admin_username = variable_get('cvs_soap_admin_username');
        $this->soap_admin_password = variable_get('cvs_soap_admin_password');
       /*   
        $this->soap_usersstatus_url = variable_get('cvs_soap_usersstatus_url');
        $this->soap_usersstatus_username = variable_get('cvs_soap_usersstatus_username');
        $this->soap_usersstatus_password = variable_get('cvs_soap_usersstatus_password');
        */
	}

	function getConn($soap="user"){
		try {

			// retrieve information for the SOAP webservice
	    	$url = ""; $username = ""; $password = "";
	    	switch($soap){
	    		case "user":
	    			$url = $this->soap_user_url;
	    			$username = $this->soap_user_username;
	    			$password = $this->soap_user_password;
	    			break;
	    		case "admin":
	    			$url = $this->soap_admin_url;
	    			$username = $this->soap_admin_username;
	    			$password = $this->soap_admin_password;
	    			break;
	    		/*
	    		case "usersstatus":
	    			$url = $this->soap_usersstatus_url;
	    			$username = $this->soap_usersstatus_username;
	    			$password = $this->soap_usersstatus_password;
	    			break;
	    		*/
	    			// you can add more here
	    	}
	    	$credentials = array('login' => $username, 'password' => $password);
	    	// return the SOAP connection
	    	return (new SoapClient($url, $credentials));

    	} catch (Exception $e) {
		    watchdog("CERN Vidyo Statistics", "Error connecting to SOAP webservices: " . $e->getMessage() );
		}
	}

}