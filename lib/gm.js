var group = require("../db/group.js");
var contact = require("../db/contact.js");
var helpers = require("../lib/helpers.js");
var _ = require("underscore");
module.exports = {
	init: (database, port, bugout) => {
		var db = database;
		var api = port;
		var running_games = [];
		var already_playing = [];
		var bugout = bugout;
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

		function startGame(message) {
			var jid = helpers.getUserJidFromMessage(message);
			var elements = message.object.body.split(" ");
			var game = getGame(elements[0]);
			var args = _.rest(elements, 1);
			if (game) {
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
					return game.group() === message.object.from;
				});
				if (group_games.length) {
					index = index - 1;
					if (index >= 0 && index < group_games.length) {
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
