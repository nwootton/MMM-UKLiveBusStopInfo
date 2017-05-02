var request = require('request');

function returnReal(atco) {

    //These are the demo API keys - Please replace with your own
    var app_id = '03bf8009';
    var app_key = 'd9307fd91b0247c607e098d5effedc97';

    var url = "https://transportapi.com/v3/uk/bus/stop/"+ atco + "/live.json?app_id="+app_id+"&app_key="+app_key+"&group=no&nextbuses=no";

    request({url:url, method: 'GET'}, function(error, response, body) {
      if(!error && response.statusCode == 200) {
        var result = processBuses(JSON.parse(body));

        console.log(result);
      }
    });
}

function returnFull(atco) {
    var obj = {};

    //Header
    obj.atcocode = atco;
    obj.smscode = 530145;
    obj.request_time = new Date();
    obj.name = "My Working Bus Stop (XYZ)";
    obj.stop_name = "My Working Bus Stop";
    obj.bearing = "NW";
    obj.indicator = "Stop Z";

    //Departure info
    obj.departures = {};

    //Array of departures
    obj.departures.all = [];

    //First departure
    obj.departures.all.push({
        mode: "bus",
        line: "W3",
        line_name: "W3",
        direction: "Finsbury Pk Stn",
        operator: "LONDONBUS",
        date: "2017-04-28",
        expected_departure_date: "2017-04-28",
        aimed_departure_time: "07:47",
        expected_departure_time: "07:45",
        best_departure_estimate: "07:45",
        source: "Countdown instant",
        dir: "outbound",
        id: "https://transportapi.com/v3/uk/bus/route/LONDONBUS/W3/outbound/490006830W/2017-04-28/07:47/timetable.json?app_id=03bf8009&app_key=d9307fd91b0247c607e098d5effedc97",
        operator_name: "London Buses"
    });

    //Second departure
    obj.departures.all.push({
        mode: "bus",
        line: "W3",
        line_name: "W3",
        direction: "Finsbury Pk Stn",
        operator: "LONDONBUS",
        date: "2017-04-28",
        expected_departure_date: "2017-04-28",
        aimed_departure_time: "07:59",
        expected_departure_time: "08:00",
        best_departure_estimate: "08:00",
        source: "Countdown instant",
        dir: "outbound",
        id: "https://transportapi.com/v3/uk/bus/route/LONDONBUS/W3/outbound/490006830W/2017-04-28/07:59/timetable.json?app_id=03bf8009&app_key=d9307fd91b0247c607e098d5effedc97",
        operator_name: "London Buses"
    });

    return obj;
}

function returnEmptyArray(atco) {
    var obj = {};

    //Header
    obj.atcocode = atco;
    obj.smscode = 530145;
    obj.request_time = new Date();
    obj.name = "My Working Bus Stop (XYZ)";
    obj.stop_name = "My Working Bus Stop";
    obj.bearing = "NW";
    obj.indicator = "Stop Z";

    //Departure info
    obj.departures = {};

    //Array of departures
    obj.departures.all = [];

    return obj;
}

function returnNoArray(atco) {
    var obj = {};

    //Header
    obj.atcocode = atco;
    obj.smscode = 530145;
    obj.request_time = new Date();
    obj.name = "My Working Bus Stop (XYZ)";
    obj.stop_name = "My Working Bus Stop";
    obj.bearing = "NW";
    obj.indicator = "Stop Z";

    //Departure info
    obj.departures = {};

    return obj;
}

function returnNoDepartures(atco) {
    var obj = {};

    //Header
    obj.atcocode = atco;
    obj.smscode = 530145;
    obj.request_time = new Date();
    obj.name = "My Working Bus Stop (XYZ)";
    obj.stop_name = "My Working Bus Stop";
    obj.bearing = "NW";
    obj.indicator = "Stop Z";

    return obj;
}

function processBuses(data) {

    this.config = {};
    this.config.limit = 2;
    this.config.debug = false;
    this.config.nextBuses = 'no';

    //Define object to hold bus data
    this.buses = {};
    //Define array of departure info
    this.buses.data = [];
    //Define timestamp of current data
    this.buses.timestamp = new Date();
    //Define message holder
    this.buses.message = null;

    //var data = JSON.parse(rawdata);

    //Check we have data back from API
    if (typeof data !== 'undefined' && data !== null) {

        //Figure out Bus Stop Name
        //Define empty stop name
        var stopName = "";

        if (typeof data.name !== 'undefined' && data.name !== null) {
            //Populate with stop name returned by TransportAPI info
            stopName = data.name;
        }
        else if (typeof data.stop_name !== 'undefined' && data.stop_name !== null) {
            //Populate with stop name returned by TransportAPI info
            stopName = data.stop_name + " ("+ data.bearing +")";
        }
        else {
            //Default
            stopName = "Departures";
        }
        //Set value
        this.buses.stopName = stopName;

        //Check we have route info
        if (typeof data.departures !== 'undefined' && data.departures !== null) {

            //... and some departures
            if (typeof data.departures.all !== 'undefined' && data.departures.all !== null) {

                if(data.departures.all.length > 0) {
                    //Figure out how long the results are
                    var counter = data.departures.all.length;

                    //See if there are more results than requested and limit if necessary
                    if (counter > this.config.limit) {
                        counter = this.config.limit;
                    }

                    //Loop over the results up to the max - either counter of returned
                    for (var i = 0; i < counter; i++) {

                        var bus = data.departures.all[i];
                        var delay = null;

                        var thisDate;
                        var thisTimetableTime;
                        var thisLiveTime;

                        if(this.config.nextBuses.toLowerCase() === "yes") {
                            //NextBuses Is On, so we need to use best & expected values
                            //Date
                            thisDate = bus.expected_departure_date;
                            //timetabled time
                            thisTimetableTime = bus.best_departure_estimate;
                            //live time
                            thisLiveTime = bus.expected_departure_time;

                        }
                        else {
                            //NextBuses Is Off, so we need to use aimed & expected values
                            //Date
                            thisDate = bus.date;
                            //timetabled time
                            if (bus.aimed_departure_time !== null) {
                                thisTimetableTime = bus.aimed_departure_time;
                            }
                            else {
                                thisTimetableTime = bus.expected_departure_time;
                            }
                            //live time
                            thisLiveTime = bus.best_departure_estimate;
                        }
                    /*
                        if(this.config.debug){
                            console.warn('===================================');
                            console.warn(this.config.nextBuses.toLowerCase());
                            console.warn(bus);
                            console.warn(thisDate);
                            console.warn(thisTimetableTime);
                            console.warn(thisLiveTime);
                            console.warn('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
                        }
                    */
                        //Only do these calc if showDelay is set in the config
                        if (this.config.showDelay) {
                            var arrRTDate = thisDate.split('-');
                            var arrRTTime = thisLiveTime.split(':');

                            var arrTTDate = thisDate.split('-');
                            var arrTTTime = thisTimetableTime.split(':');

                            var RTDate = new Date( arrRTDate[0], arrRTDate[1], arrRTDate[2], arrRTTime[0], arrRTTime[1]);
                            var TTDate = new Date( arrTTDate[0], arrTTDate[1], arrTTDate[2], arrTTTime[0], arrTTTime[1]);

                            delay = (((TTDate - RTDate) / 1000) / 60);
                        }

                        //console.log(bus.line_name + ", " + bus.direction + ", " + bus.expected_departure_time);
                        this.buses.data.push({
                            routeName: bus.line_name,
                            direction: bus.direction,
                            timetableDeparture: thisTimetableTime,
                            expectedDeparture: thisLiveTime,
                            delay: delay
                        });
                    }

                }
                else {
                    //No departures structure
                    this.buses.message = "No departure info returned";
                    if(this.config.debug) {
                        console.error("=======LEVEL 4=========");
                        console.error(this.buses);
                        console.error("^^^^^^^^^^^^^^^^^^^^^^^");
                    }
                }
            }
            else {
                //No departures returned - set message
                this.buses.message = "No departures scheduled";
                if(this.config.debug) {
                    console.error("=======LEVEL 3=========");
                    console.error(this.buses);
                    console.error("^^^^^^^^^^^^^^^^^^^^^^^");
                }
            }
        }
        else {
            //No departures returned - set message
            this.buses.message = "No info about the stop returned";
            if(this.config.debug) {
                console.error("=======LEVEL 2=========");
                console.error(this.buses);
                console.error("^^^^^^^^^^^^^^^^^^^^^^^");
            }
        }
    }
    else {
        //No data returned - set message
        this.buses.message = "No data returned";
        if(this.config.debug) {
            console.error("=======LEVEL 1=========");
            console.error(this.buses);
            console.error("^^^^^^^^^^^^^^^^^^^^^^^");
        }
    }

    return this.buses;

}

//var myData = returnFull("123456");
//var myData = returnEmptyArray("123456");
//var myData = returnNoArray("123456");
//var myData = returnNoDepartures("123456");

//var myData = null;
//var myData = {};
//var myData = [];
//var myData = "String";
//var myData = 1234;

//console.log(processBuses(myData));

returnReal("490006830W");
