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
    start: function() {
        console.log('MMM-UKLiveBusStopInfo helper started ...');
    },

    checkSchedule: function(payload) {

        //Define url to modify
        var workingURL = payload.url;

        //Is smartTime object populated?
        if (typeof payload.smartTime !== 'undefined' && payload.smartTime !== null) {

            //Get today & day of week (DoW)
            var today = moment().format('YYYY-MM-DD');
            var DoW = moment().format('ddd');

            //console.log(today);
            //console.log(DoW);

            //See if DoW matches requested
            if (payload.smartTime.days.indexOf(DoW) === -1) {
                //SmartTime NOT requested for today
            } else {
                //Today is requested in SmartTime
                //Loads as local, Outputs as UTC
                var startRange = moment(today + 'T' + payload.smartTime.start).toDate();
                var endRange = moment(today + 'T' + payload.smartTime.end).toDate();

                //console.log(startRange);
                //console.log(endRange);

                //Define start and end of range
                var range = moment.range(startRange, endRange);

                //Get now()
                var when = moment();

                //console.log(when);

                //See if now() is between start and end range
                if (when.within(range)) {
                    //Amend url with nextBuses ON
                    workingURL = workingURL.replace(/(nextbuses=)[^\&]+/, '$1' + 'yes');


                } else {
                    //Amend url with nextBuses OFF
                    workingURL = workingURL.replace(/(nextbuses=)[^\&]+/, '$1' + 'no');
                }
            }
        } else {
            /*
                Assumes that config is either yes or no for nextBuses
                So doesn't need to do anything
            */
        }
        this.getTimetable(workingURL, payload.url);
    },

    /* getTimetable()
     * Requests new data from TransportAPI.com
     * Sends data back via socket on succesfull response.
     */
    getTimetable: function(workingURL, originalURL) {
        var self = this;
        var retry = true;

        request({ url: workingURL, method: 'GET' }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                self.sendSocketNotification('BUS_DATA', { 'data': JSON.parse(body), 'url': originalURL });
            }
        });
    },

    //Subclass socketNotificationReceived received.
    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_BUSINFO') {
            this.checkSchedule(payload);
            //console.log(payload);
        }
    }

});