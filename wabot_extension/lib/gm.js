var group = require("../db/group.js");
var contact = require("../db/contact.js");
var helpers = require("../lib/helpers.js");
var _ = require("underscore");
module.exports = {
	init: (database, port, bugout, lobby_manager) => {
		var db = database;
		var api = port;
		var running_games = [];
		var already_playing = [];
		var bugout = bugout;
		var lobby_manager = lobby_manager;
		var games = {
			"!cah": require("./games/cah.js")
			//"!chess": require('./games/chess.js'),
			// "!spades": require('./games/spades.js')
		};

		function getGame(name) {
			return games[name];
		}

		function removeMembers(members) {
			var allowed = members.filter(function(val) {
				return already_playing.indexOf(val) == -1;
			});
			bugout.log("Allowed players " + allowed);
			return allowed;
		}

		function handleEvents(game) {
			game.eventEmitter.on("gameOver", () => {
				if (game.is_intergroup()) {
					// game is intergorup clearing lobby
					lobby_manager.clear_lobby(game.group());
				}
				bugout.log("[DEBUG]: Game over");
				var index = running_games.indexOf(game);
				running_games.splice(index, 1);
				bugout.log("[DEBUG]: Currently running games: ");
				bugout.log(running_games);
			});
			game.eventEmitter.on("playerLeft", (jid) => {
				bugout.log(jid + " Has left game");
				var index = already_playing.indexOf(jid);
				already_playing.splice(index, 1);
			});
		}

		function start_intergroup_game(game, args, message) {
			var lobby_jid = lobby_manager.get_lobby(game.description());
			if (!lobby_jid) {
				var text = "Creating a new lobby, please try again";
				helpers.sendMessage(
					api,
					text,
					message.object.from,
					message.object.id.id
				);
			} else {
				// Get all contacts
				contact.getContacts(db).then((rows) => {
					var players = removeMembers(
						rows.map((row) => {
							return row.jid;
						})
					);
					already_playing = already_playing.concat(players);
					if (players.length) {
						// Enough Players
						group.getGroups(db).then((groups) => {
							var all_groups = groups.map((grp) => {
								return grp.jid;
							});
							var run = game.init(
								api,
								db,
								lobby_jid,
								players,
								args,
								all_groups,
								bugout
							);
							running_games.push(run);
							handleEvents(run);
						});
					} else {
						lobby_manager.clear_lobby(lobby_jid);
						api.postMessage({
							type: "send_text",
							to: message.object.from,
							body: "No one is available"
						});
					}
				});
			}
		}
		function startGame(message) {
			var jid = helpers.getUserJidFromMessage(message);
			var elements = message.object.body.split(" ");
			var game = getGame(elements[0]);
			var args = _.rest(elements, 1);
			if (game) {
				if (args[0] === "g") {
					start_intergroup_game(game, _.rest(args, 1), message);
				} else {
					if (game.isGroup() && message.isG) {
						group.getGroupByJid(db, message.object.from).then((row) => {
							var grp = row[0];
							var players = removeMembers(
								grp.members.map((member) => {
									return member.id;
								})
							);
							already_playing = already_playing.concat(players);
							if (players.length) {
								// Enough Players
								var run = game.init(
									api,
									db,
									message.object.from,
									players,
									args,
									false,
									bugout
								);
								running_games.push(run);
								handleEvents(run);
							} else {
								api.postMessage({
									type: "send_text",
									to: message.object.from,
									body: "No one is available"
								});
							}
						});
					} else if (!game.isGroup()) {
						contact
							.getTwoContacts(db, jid, elements[1] + "@c.us")
							.then((rows) => {
								if (rows.length == 2) {
									var allowed_players = removeMembers([
										jid,
										elements[1] + "@c.us"
									]);
									if (allowed_players.length == 2) {
										var run = games[elements[0]].init(api, db, allowed_players);
										running_games.push(run);
										handleEvents(run);
									} else {
										api.postMessage({
											type: "send_text",
											to: message.object.from,
											body: "No one is available"
										});
									}
								}
							});
					}
				}
			}
		}
		return {
			listGames: () => {
				var text = "Available Games:";
				for (var key in games) {
					text = text + "\n*" + key + "* - " + games[key].description();
				}
				return text;
			},
			join: (user_jid, message, index) => {
				var group_games = _.filter(running_games, (game) => {
					return game.group() === message.object.from || game.is_intergroup();
				});
				if (group_games.length) {
					index = index - 1;
					if (index >= 0 && index < group_games.length) {
						if (group_games[index].is_intergroup()) {
							api.postMessage({
								type: "group_invite",
								jid: group_games[index].group(),
								members: [user_jid]
							});
						}
						group_games[index].join(user_jid);
					} else {
						var text = "Current games:";
						for (var i = 0; i < group_games.length; i++) {
							text = text + "\n" + (i + 1) + " - " + group_games[i].info();
						}
						api.postMessage({
							type: "send_text",
							to: message.object.from,
							body: text
						});
					}
				} else
					api.postMessage({
						type: "send_text",
						to: message.object.from,
						body: "No games running"
					});
			},
			status: () => {
				if (running_games.length) {
					var text = "*Status of ongoing games:*";
					running_games.forEach((game) => {
						text = text + game.status();
					});
					return text;
				} else return "No games running";
			},
			help: () => {
				if (running_games.length) {
					var text = "*Help for ongoing games:*";
					running_games.forEach((game) => {
						text = text + game.help();
					});
					return text;
				} else return "No games running";
			},
			handleMessage: (message) => {
				var jid = helpers.getUserJidFromMessage(message);
				startGame(message);
				if (running_games.length) {
					running_games.forEach((game) => {
						game.handleMessage(message);
					});
				}
			}
		};
	}
};
