var group = require("../db/group.js");
var contact = require("../db/contact.js");
var helpers = require("../lib/helpers.js");
var lobby = require("../db/lobby.js");
var _ = require("underscore");
module.exports = {
	init: (database, port, bugout) => {
		var db = database;
		var api = port;
		var bugout = bugout;
		var lobbies = [];

		// Get lobbies from DB
		lobby.get_groups(db).then((rows) => {
			bugout.log(rows);
			if (rows.length > 0) {
				rows.forEach((row) => {
					var lob = {
						group_jid: row.group_jid,
						used: false
					};
					lobbies.push(lob);
				});
			}
		});

		// Reset all groups
		lobbies.forEach((grp) => {
			bugout.log("Kicking all members");
			helpers.sendMessage(api, "Freeing lobby", grp.group_jid, null);
			api.postMessage({
				type: "kick_all",
				group_jid: grp.group_jid
			});
		});
		return {
			get_lobby: (game_title) => {
				var empty_lobbies = _.filter(lobbies, (lobby) => {
					return !lobby.used;
				});
				if (empty_lobbies.length > 0) {
					//empty lobbies exist, pick one
					bugout.log("Lobby is free, using it ", empty_lobbies[0]);
					api.postMessage({
						type: "update_title",
						group_jid: empty_lobbies[0].group_jid,
						title: "Game Lobby: " + game_title
					});
					lobbies[lobbies.indexOf(empty_lobbies[0])].used = true;
					bugout.log("updated lobbies");
					bugout.log(lobbies);
					return empty_lobbies[0].group_jid;
				} else {
					// No empty lobbies, must create a new one
					// CREATE LOBBY
					api.postMessage({
						type: "lobby_create"
					});
					return false;
				}
			},
			clear_lobby: (group_jid) => {
				var current_lobby = _.filter(lobbies, (lobby) => {
					return lobby.group_jid === group_jid;
				});
				lobbies[lobbies.indexOf(current_lobby[0])].used = false;
				helpers.sendMessage(
					api,
					"Freeing lobby in 10 seconds ",
					current_lobby[0].group_jid,
					null
				);
				api.postMessage({
					type: "kick_all",
					group_jid: current_lobby[0].group_jid
				});
			},
			new_lobby: (lobby_jid) => {
				var lob = {
					group_jid: lobby_jid,
					used: false
				};
				lobbies.push(lob);
			}
		};
	}
};
