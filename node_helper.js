/* Live Bus Stop Info */

/* Magic Mirror
 * Module: UK Live Bus Stop Info
 * By Nick Wootton
 * MIT Licensed.
 */

/*
Smart Time format

    smartTime:	{
                    start: '08:45:00',
                    end: 	'10:00:00',
                    days:	['Mon','Tue','Wed','Thur','Fri']
    }

*/


var NodeHelper = require('node_helper');
var request = require('request');

var Moment = require('moment');
var MomentRange = require('moment-range');

var moment = MomentRange.extendMoment(Moment);

module.exports = NodeHelper.create({
    start: function () {
        console.log('MMM-UKLiveBusStopInfo helper started ...');
    },


    checkSchedule: function(payload) {

        //Is smartTime object populated?
        if(typeof payload.smartTime !== 'undefined' && payload.smartTime !== null) {
            console.log("In SmartTime");

            //Get today & day of week (DoW)
            var today = moment().format('YYYY-MM-DD');
            var DoW = moment().format('ddd');

            console.log(today);
            console.log(DoW);

            //See if DoW matches requested
            if (payload.smartTime.days.indexOf(DoW) === -1) {
                //Not requested for today
                console.log('Not today');
            }
            else {
                //Today is requested
                console.log('Yay today');

                //Loads as local, Outputs as UTC
                var startRange = moment(today + 'T' + payload.smartTime.start).toDate();
                var endRange = moment(today + 'T' + payload.smartTime.end).toDate();

                console.log(startRange);
                console.log(endRange);

                //Define start and end of range
                var range = moment.range(startRange, endRange);

                //Get now()... NOT in UTC
                var when  = moment();

                //console.log(when);

                //See if now() is between start and end range
                if(when.within(range)) {
                    console.log("NextBuses IS OOOOOONNNNN");

                    //Amend url with nextBuses ON
                    payload.url += "&nextbuses=yes";
                }
                else {
                    console.log("Not at this time");

                    //Amend url with nextBuses OFF
                    payload.url += "&nextbuses=no";
                }
            }
        }
        else {
            //Assumes that config is either yes or no for nextBuses
            console.log("In manual spec");
        }

        //console.log(payload.url);
        this.getTimetable(payload.url);
    },

	/* getTimetable()
	 * Requests new data from TransportAPI.com
	 * Sends data back via socket on succesfull response.
	 */
    getTimetable: function(url) {
        var self = this;
        var retry = true;

        request({url:url, method: 'GET'}, function(error, response, body) {
            if(!error && response.statusCode == 200) {
                self.sendSocketNotification('BUS_DATA', {'data': JSON.parse(body), 'url': url});
            }
        });
    },

    //Subclass socketNotificationReceived received.
    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_BUSINFO') {
            this.checkSchedule(payload);
        }
    }

});
