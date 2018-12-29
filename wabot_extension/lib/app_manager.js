var helpers = require("../lib/helpers.js");
var _ = require("underscore");

module.exports = {
	init: (port, database, bugout) => {
		var api = port;
		var db = database;
		var bugout = bugout;

		var apps = {
			"!zomato": require("./apps/zomato.js")
		};
		var running_apps = {};

		function handle_events(app) {
			app.event_emitter.on("quit", (jid) => {
				bugout.log("[DEBUG]: App Quit");
				var index = running_apps[jid].indexOf(app);
				running_apps[jid].splice(index, 1);
				bugout.log("[DEBUG]: Current apps running for " + jid);
				bugout.log(running_apps[jid]);
			});
		}

		function get_app(name) {
			return apps[name];
		}

		function start_app(message) {
			var jid = helpers.getUserJidFromMessage(message);
			var elements = message.object.body.split(" ");
			var app = get_app(elements[0]);
			var args = _.rest(elements, 1);

			if (app) {
				// App exists check if it is running
				if (
					_.findIndex(running_apps[jid], (element) => {
						return element.name() === app.name();
					}) == -1
				) {
					bugout.log(
						"[DEBUG]: App isn't running for " + jid + ", starting App"
					);
					var run = app.init(api, db, message.object.from, args, bugout, jid);
					running_apps[jid] = running_apps[jid] || [];
					running_apps[jid].push(run);
					handle_events(run);
				} else {
					helpers.sendMessage(
						api,
						"You are already running " + app.name(),
						message.object.from,
						message.object.id.id
					);
				}
			}
		}
		return {
			list_apps: () => {
				var text = "Available Apps:";
				for (var key in apps) {
					text = text + "\n*" + key + "* - " + apps[key].description();
				}
				return text;
			},
			status: () => {
				// Going to be a bit different because we are going to return the status for current user apps only
				return "TODO";
			},
			help: () => {
				// Going to be a bit different because we are going to return the help for current user apps only
				return "TODO";
			},
			handle_message: (message) => {
				var jid = helpers.getUserJidFromMessage(message);
				if (message.object.body === "~~") {
					bugout.log("[DEBUG]: Alt-tab");
				} else if (message.object.body.charAt(0) === "~") {
					if (running_apps[jid]) {
						if (running_apps[jid].length) {
							message.object.body = message.object.body.substring(1);
							running_apps[jid][0].handle_message(message);
						}
					}
				}
				start_app(message);
			}
		};
	}
};
