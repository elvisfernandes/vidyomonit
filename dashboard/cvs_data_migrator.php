<?php
class CVS_data_migrator {
	 // path where to the xml
    public $xmlDataFolder;

    function __construct(){
        $this->xmlDataFolder = drupal_get_path('module', 'cern_vidyo_statistics') . '/data/xml/';
    }

    function updateFromXML($filename, $schema_name, $fileds_to_insert, $default_values,
    					   $rebuild_date=False, $reorder_xml=False){
    	$path = $this->xmlDataFolder .$filename;
    	$xml = simplexml_load_file($path);
		foreach($xml->children() as $child)
		{
			$values_to_insert = array();
			$counter = 0;
			$year = "";
			$month = "";
			$done_rebuilidng = False;
			foreach($child->attributes() as $atribute => $value){
				//Rebuilding date from month and year for filed that don't have a compleate date
				if($rebuild_date && !$done_rebuilidng){
					if($atribute == 'year')
						$year = $value;
					if($atribute == 'month')
						$month = sprintf('%02d', $value);
					if($year != "" && $month != ""){
						$done_rebuilidng = True;
						$values_to_insert['date'] = $year . '-' . $month . '-01';
						$counter++;
					}
					continue;
				}

				if($default_values[$counter] == null){
					//Some XML have atributes in a wrong order, we are reordering them.
					if($reorder_xml){
						$values_to_insert[$atribute] = $value;
					}
					else {
						$values_to_insert[$fileds_to_insert[$counter]] = $value;
					}
				}
				else {
					$values_to_insert[$fileds_to_insert[$counter]] = $default_values[$counter];
				}
				$counter++;
			}
			if($child->count() == 0 && in_array('value', $fileds_to_insert)){
				$values_to_insert['value'] = $child;
				$counter++;
			}
			while($counter < count($fileds_to_insert)){
				$values_to_insert[$fileds_to_insert[$counter]] = $default_values[$counter++];
			}
			db_insert($schema_name)->fields($values_to_insert)->execute();
		}
    }
}

?>
