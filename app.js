var schemaBuilder = require("./db/connector.js");
var contact = require("./db/contact.js");
var group = require("./db/group.js");
var lobby = require("./db/lobby.js");
var leaderboard = require("./db/leaderboard.js");
var helper = require("./lib/helpers.js");
var reddit = require("./lib/reddit.js")();
var codebird = require("codebird");
var cb = new codebird();
var _ = require("lodash");
var debugout = require("./lib/debugout.js");
var bugout = new debugout();
const axios = require("axios");
var Socket = require("phoenix").Socket;
var config = require("./lib/config.js");
bugout.useTimestamps = true;
bugout.useLocalStorage = false;
require("./lib/log.js")(bugout);
// Initialise Database
var whitelist = config.whitelist;
schemaBuilder.connect().then((db) => {
	chrome.runtime.onConnectExternal.addListener((port) => {
		if (
			port.name === "api" &&
			port.sender.url === "https://web.whatsapp.com/"
		) {
			var emotes = require("./lib/emotes.js").init(port, bugout);
			var game_lobbies = require("./lib/lobby_manager.js").init(
				db,
				port,
				bugout
			);
			var gm = require("./lib/gm.js").init(db, port, bugout, game_lobbies);
			var app_manager = require("./lib/app_manager.js").init(port, db, bugout);
			var soccer = require("./lib/soccer.js").init(port, bugout, db);
			var command_handler = require("./lib/commands.js").init(
				db,
				port,
				gm,
				app_manager,
				soccer,
				bugout
			);
			var jobs = require("./lib/jobs.js")(port, bugout);
			var automatic = require("./lib/automatic.js").init(port, db, bugout);
			port.onMessage.addListener((msg) => {
				if (msg.type === "message") {
					var jid = helper.getUserJidFromMessage(msg);
					if (!msg.isM) {
						if (msg.isG) {
							bugout.log(
								"[MESSAGE_G - " +
									msg.object.from +
									" - " +
									jid +
									"]: " +
									msg.object.body
							);
						} else {
							bugout.log("[MESSAGE - " + jid + "]: " + msg.object.body);
						}
					}
					//emotes.process(msg);
					automatic.process(msg);
					gm.handleMessage(msg);
					app_manager.handle_message(msg);
					command_handler.handleMessage(msg);
					// Mentions
					if (msg.object.mentionedJidList) {
						helper.handleMentions(db, port, msg);
					}
					if (
						msg.object.body === "!test" &&
						msg.object.from === config.admin_jid
					) {
						helper.sendMedia(
							port,
							"https://i.imgur.com/ry81RK0.png",
							config.admin_jid,
							"test",
							msg.object.id.id,
							"application/xhtml+html"
						);
					}
				} else if (msg.type === "contact") {
					// Contacts
					contact.addContact(db, msg.contact.id);
				} else if (msg.type === "group") {
					lobby.get_groups(db).then((rows) => {
						rows.forEach((row) => {
							whitelist.push(row.group_jid);
						});
						// Groups
						if (
							whitelist.indexOf(msg.id) == -1 &&
							msg.id.split("-")[0] !== config.bot_jid.split("@")[0]
						) {
							port.postMessage({
								type: "leave_group",
								jid: msg.id
							});
							group.deleteGroup(db, msg.id, bugout);
						} else {
							// jobs.initTil(msg.id, reddit);
							group.addGroup(db, msg);
						}
					});
				} else if (msg.type === "group_update") {
					lobby.get_groups(db).then((rows) => {
						rows.forEach((row) => {
							whitelist.push(row.group_jid);
						});
						if (
							whitelist.indexOf(msg.id) == -1 &&
							msg.id.split("-")[0] !== config.bot_jid.split("@")[0]
						) {
							port.postMessage({
								type: "leave_group",
								jid: msg.id
							});
							group.deleteGroup(db, msg.id);
						} else {
							group.addGroupMember(db, msg.id, msg.member);
						}
					});
				} else if (msg.type === "new_lobby") {
					lobby.add_group(db, msg.jid);
					game_lobbies.new_lobby(msg.jid);
				}
			});
		}
	});
});
