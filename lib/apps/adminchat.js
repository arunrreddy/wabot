var handlerObject = require("../handlerObject.js").Handler;
var events = require("events").EventEmitter;
var helpers = require("../helpers.js");
var _ = require("underscore");
var config = require("../config.js");

var app_name = "Admin App";

module.exports = {
	name: () => {
		return app_name;
	},
	description: () => {
		return "Admin Application for Bot";
	},
	init: (port, database, group_jid, args, bugout, user_jid) => {
		var bugout = bugout;
		var api = port;
		var handler = new handlerObject();
		var event_emitter = new events();
		var group_jid = group_jid;
		var user_jid = user_jid;
		var app_commands = {
			forward: {
				action: function(message) {},
				description: "Forward all messages to the bot to this number"
			}
		};
		var app_state = {
			forwardMessages: false
		};
		function loop(message) {
			if (app_state.forwardMessages) {
				//Forward message
			}
		}
		var text = "Welcome to the Admin app\n Send ~help for more info";
		helpers.sendMessage(api, text, user_jid, null);

		return {
			handle_message: (message) => {
				var jid = helpers.getUserJidFromMessage(message);
				if (jid === user_jid) {
					loop(message);
					switch (message.object.body) {
						case "forward":
					}
				}
			},
			event_emitter: event_emitter,
			status: () => {
				return "Application status";
			},
			name: () => {
				return app_name;
			}
		};
	}
};
