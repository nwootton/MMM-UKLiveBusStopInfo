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
		nextBuses: 	'', 		//Use NextBuses API calls

		titleReplace: {
			"Zeittabelle ": ""
		},
	},

	// Define required scripts.
	getStyles: function() {
		return ["bus.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

    this.buses = [];
		this.loaded = false;
		this.scheduleUpdate(this.config.initialLoadDelay);

		this.updateTimer = null;

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

		var bustable = document.createElement("table");
		bustable.className = "small";

		for (var t in this.buses) {
			var bus = this.buses[t];

			var row = document.createElement("tr");
			bustable.appendChild(row);

      //Departure Time
			var departureTimeCell = document.createElement("td");
			departureTimeCell.innerHTML = bus.departure;
			departureTimeCell.className = "align-right bright";
			row.appendChild(departureTimeCell);

			//Route name/Number
			var routeCell = document.createElement("td");
			routeCell.className = "align-centre";
			routeCell.innerHTML = " " + bus.routeName + " ";
			row.appendChild(routeCell);

			//Direction Info
			var directionCell = document.createElement("td");
			directionCell.className = "align-right dest";
			directionCell.innerHTML = bus.direction;
			row.appendChild(directionCell);


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

		return bustable;
	},

	/* updateTimetable()
	 * Requests new data from TransportAPI.com
	 * Calls processBuses on succesfull response.
	 */
	updateTimetable: function() {
		var url = this.config.apiBase + this.config.atcocode + '/live.json' + this.getParams();
		Log.info(url);

		var self = this;
		var retry = true;

		var busInfoRequest = new XMLHttpRequest();

		busInfoRequest.open("GET", url, true);

    busInfoRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
          self.processBuses(JSON.parse(this.response));
				}
        else if (this.status === 401) {
					self.config.id = "";
					self.updateDom(this.config.animationSpeed);

					Log.error(self.name + ": Error 401");
					retry = false;
				}
        else {
					Log.error(self.name + ": Could not load buses.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		busInfoRequest.send();
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

		Log.info(params);
		return params;
	},

	/* processBuses(data)
	 * Uses the received data to set the various values into a new array.
	 */
	processBuses: function(data) {
    //Log.info("In processBuses");
    this.busStopName = data.stop_name;

    this.buses = [];
    var counter = data.departures.all.length;

    for (var i = 0; i < counter; i++) {

      var bus = data.departures.all[i];
      //Log.info(bus.line_name + ", " + bus.direction + ", " + bus.expected_departure_time);
      this.buses.push({

        routeName: bus.line_name,
        direction: bus.direction,
        departure: bus.expected_departure_time
      });
    }

    this.loaded = true;

    this.updateDom(this.config.animationSpeed);
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
			self.updateTimetable();
		}, nextLoad);
	},

});
