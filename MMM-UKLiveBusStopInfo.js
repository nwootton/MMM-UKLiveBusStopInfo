/* Live Bus Stop Info */

/* Magic Mirror
 * Module: UK Live Bus Stop Info
 *
 * By Nick Wootton
 * based on SwissTransport module by Benjamin Angst http://www.beny.ch
 * MIT Licensed.
 */

Module.register("MMM-UKLiveBusStopInfo",{

	// Define module defaults
	defaults: {
		updateInterval: 5 * 60 * 1000, // Update every 5 minutes.
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25, // Start on 1/4th of the list.
    initialLoadDelay: 0, // start delay seconds.

    apiBase: 'https://transportapi.com/v3/uk/bus/stop/',

		atcocode:		'', 	// atcocode for bus stop
		app_key: 		'', 	// TransportAPI App Key
    app_id: 		'', 	// TransportAPI App ID
		group:			'no', //Stops buses being grouped by route

		limit: 			'', 	//Maximum number of results to display
		nextBuses: 	'no', 		//Use NextBuses API calls

		showRealTime: false,
		showDelay: false,
		header:	'Departures'
	},

	// Define required scripts.
	getStyles: function() {
		return ["bus.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	//Define header for module.
	getHeader: function() {
		return this.config.header;
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

    this.buses = {};
		this.loaded = false;
		this.scheduleUpdate(this.config.initialLoadDelay);

		this.updateTimer = null;

		this.url = encodeURI(this.config.apiBase + this.config.atcocode + '/live.json' + this.getParams());

		this.updateBusInfo(this);
	},

	// updateBusInfo
	updateBusInfo: function(self) {
		//Log.info(self);
		self.sendSocketNotification('GET_BUSINFO', {'url':this.url});
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.atcocode === "") {
			wrapper.innerHTML = "Please set the ATCO Code: " + this.atcocode + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (this.config.app_id === "") {
			wrapper.innerHTML = "Please set the application ID: " + this.app_id + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (this.config.app_key === "") {
			wrapper.innerHTML = "Please set the application key: " + this.app_key + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = "Loading bus Info ...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var title = document.createElement("div");

		title.innerHTML = this.buses.stopName;
		title.className = "small busStopName";
		wrapper.appendChild(title);


		var bustable = document.createElement("table");
		bustable.className = "small";

		for (var t in this.buses.data) {
			var bus = this.buses.data[t];

			var row = document.createElement("tr");
			bustable.appendChild(row);

			//Route name/Number
			var routeCell = document.createElement("td");
			routeCell.className = "route";
			routeCell.innerHTML = " " + bus.routeName + " ";
			row.appendChild(routeCell);

			//Direction Info
			var directionCell = document.createElement("td");
			directionCell.className = "dest";
			directionCell.innerHTML = bus.direction;
			row.appendChild(directionCell);

      //Time Tabled Departure
			var timeTabledCell = document.createElement("td");
			timeTabledCell.innerHTML = bus.timetableDeparture;
			timeTabledCell.className = "timeTabled";
			row.appendChild(timeTabledCell);

			if (this.config.showRealTime) {
      	//Real Time Feedback for Departure
				var realTimeCell = document.createElement("td");
				realTimeCell.innerHTML = "(" + bus.expectedDeparture + ")";
				realTimeCell.className = "expTime";
				row.appendChild(realTimeCell);
			}

			if (this.config.showDelay) {
	      //Delay Departure
				var delayCell = document.createElement("td");

				if(bus.delay > 1 || bus.delay < -1) {
					label = " mins ";
				}
				else {
					label = " min ";
				}

				if(bus.delay < 0 ) {
	          delayCell.innerHTML = Math.abs(bus.delay) + label + "late";
						delayCell.className = "late";
	      }
				else if(bus.delay > 0 ) {
	          delayCell.innerHTML = Math.abs(bus.delay) + label + "early";
						delayCell.className = "early";
				}
				else {
	          delayCell.innerHTML = " On Time ";
						delayCell.className = "nonews";
				}

				row.appendChild(delayCell);
			}

			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = this.buses.length * this.config.fadePoint;
				var steps = this.buses.length - startingPoint;
				if (t >= startingPoint) {
					var currentStep = t - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}

		}
		wrapper.appendChild(bustable);

		return wrapper;

	},

	/* processBuses(data)
	* Uses the received data to set the various values into a new array.
	*/
	processBuses: function(data) {
		//Define object to hold bus data
		this.buses = {};
		//Define array of departure info
    this.buses.data = [];

		//Define empty stop name
		var stopName = "";

		//Populate with stop name returned by TransportAPI info
		stopName = data.stop_name + " ("+ data.bearing +")";

		//If the name returned is more than 3, use it, else fallback to departures
		if(stopName.length > 3) {
			this.buses.stopName = stopName;
		}
		else {
			this.buses.stopName = "Departures";
		}

		//Figure out how long the reulsts are
		var counter = data.departures.all.length;

		//See if there are more results than requested and limit if necessary
		if (counter > this.config.limit) {
			counter = this.config.limit;
		}

		//Loop over the results up to the max - either counter of returned
    for (var i = 0; i < counter; i++) {

			var bus = data.departures.all[i];
			var delay = null;

			//Sometimes the aimed_departure_time is NULL, so use the expected_departure_time instead
			if((bus.aimed_departure_time === null) && (bus.expected_departure_time !== null)) {
				bus.aimed_departure_time = bus.expected_departure_time;
			}

			//Sometimes the expected_departure_time is NULL, so use the aimed_departure_time instead
			if((bus.aimed_departure_time !== null) && (bus.expected_departure_time === null)) {
				bus.expected_departure_time = bus.aimed_departure_time;
			}

			//Sometime the departure date is empty, so assume todays date!
			if(bus.expected_departure_date === null) {
				bus.expected_departure_date = bus.date;
			}


			//Only do these calc if showDelay is set in the config
			if (this.config.showDelay) {
				var arrRTDate = bus.expected_departure_date.split('-');
				var arrRTTime = bus.expected_departure_time.split(':');

				var arrTTDate = bus.expected_departure_date.split('-');
				var arrTTTime = bus.aimed_departure_time.split(':');

				var RTDate = new Date( arrRTDate[0], arrRTDate[1], arrRTDate[2], arrRTTime[0], arrRTTime[1]);
				var TTDate = new Date( arrTTDate[0], arrTTDate[1], arrTTDate[2], arrTTTime[0], arrTTTime[1]);

				delay = (((TTDate - RTDate) / 1000) / 60);
			}

      //Log.info(bus.line_name + ", " + bus.direction + ", " + bus.expected_departure_time);
      this.buses.data.push({
        routeName: bus.line_name,
        direction: bus.direction,
        timetableDeparture: bus.aimed_departure_time,
				expectedDeparture: bus.expected_departure_time,
				delay: delay
      });
    }

    this.loaded = true;

    this.updateDom(this.config.animationSpeed);
  },

	/* getParams()
	 * Generates an url with api parameters based on the config.
	 * return String - URL params.
	 */
	getParams: function() {
		var params = "?";
		params += "app_id=" + this.config.app_id;
		params += "&app_key=" + this.config.app_key;

		if(this.config.limit.length > 0) {
			params += "&limit=" + this.config.limit;
		}

		if(this.config.nextBuses.length > 0) {
			params += "&nextBuses=" + this.config.nextBuses;
		}

		params += "&group=" + this.config.group;

		//Log.info(params);
		return params;
	},

	/* scheduleUpdate()
	 * Schedule next update.
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function() {
			self.updateBusInfo(self);
		}, nextLoad);
	},


	// Process data returned
	socketNotificationReceived: function(notification, payload) {

    if (notification === 'BUS_DATA' && payload.url === this.url) {
        this.processBuses(payload.data);
				this.scheduleUpdate(this.config.updateInterval);
    }
  }

});
