var handlerObject = require("../handlerObject.js").Handler;
var events = require("events").EventEmitter;
var helpers = require("../helpers.js");
var _ = require("underscore");

module.exports = {
	description: () => {
		return "Application Description";
	},
	init: (port, database, args, bugout) => {
		var bugout = bugout;
		var handler = new handlerObject();
		var event_emitter = new events();
		var app_states = {
			// App states
		};
		var current_state = null; // Set state
		handler.on("handlersEmpty", () => {
			/**
               switch on state
            switch (current_state) {

            }
            **/
		});

		// return closure for app manager
		return {
			handleMessage: (message) => {
				var jid = helpers.getUserJidFromMessage(message);
				var handlerFunction = handler.getHandler(jid);
				if (handlerFunction) {
					// Handler exists
					handlerFunction(jid, message);
					return;
				} else return;
			},
			status: () => {
				return "Application Status";
			},
			help: () => {
				return "Application Help text";
			}
		};
	}
};
