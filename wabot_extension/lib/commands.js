var contact = require("../db/contact.js");
var group = require("../db/group.js");
var leaderboard = require("../db/leaderboard.js");
var request = require("../db/request.js");
var helpers = require("./helpers.js");
var emotes = require("./emotes.js");
var config = require("./config.js");
var lodash = require("lodash");
module.exports = {
	init: (database, port, gm, app_manager, soccer, bugout) => {
		var db = database;
		var api = port;
		var gm = gm;
		var am = app_manager;
		var soccer = soccer;
		var smmry_key = config.smmry_key;
		var axios = require("axios");
		var command_list = {
			"!help": {
				action: function(message) {
					var jid = helpers.getUserJidFromMessage(message);
					contact.checkAdmin(db, jid).then((row) => {
						var result = row[0].admin ? true : false;
						if (result) {
							var text = "Commands (Admin): ";
							for (var key in command_list) {
								text =
									text + "\n*" + key + "* - " + command_list[key].description;
							}
							helpers.sendMessage(api, text, jid, message.object.id.id);
						} else {
							var text = "Commands: ";
							for (var key in command_list) {
								if (command_list[key].admin === false) {
									text =
										text + "\n*" + key + "* - " + command_list[key].description;
								}
							}
							helpers.sendMessage(
								api,
								text,
								message.object.from,
								message.object.id.id
							);
						}
					});
				},
				description: "Help message",
				admin: false
			},
			"!ping": {
				action: function(message) {
					helpers.sendMessage(
						api,
						"Pong",
						message.object.from,
						message.object.id.id
					);
				},
				description: "Ping",
				admin: false
			},
			"!contacts": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.checkAdmin(db, jid).then((row) => {
						var result = row[0].admin ? true : false;
						if (result) {
							contact.getContacts(db).then((rows) => {
								var text = "These are the contacts:";
								rows.forEach((contact) => {
									var name = contact.nick;
									var number = "+" + contact.jid.split("@")[0];
									text = text + "\n" + name + " - " + number;
								});
								helpers.sendMessage(
									api,
									text,
									message.object.from,
									message.object.id.id
								);
							});
						} else {
							helpers.sendMessage(
								api,
								"Only an admin can do that",
								message.object.from,
								message.object.id.id
							);
						}
					});
				},
				description: "Get Contacts",
				admin: true
			},
			"!admin": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.checkAdmin(db, jid).then((row) => {
						var result = row[0].admin ? true : false;
						var text;
						if (result) {
							text = "You are an admin";
							helpers.sendMessage(
								api,
								text,
								message.object.from,
								message.object.id.id
							);
						} else {
							text = "You are not an admin 🌚";
							helpers.sendMessage(
								api,
								text,
								message.object.from,
								message.object.id.id
							);
						}
					});
				},
				description: "Check if you are an admin",
				admin: false
			},
			"!changenick": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var newName = message.object.body.replace("!changenick ", "");
					contact.updateNick(db, jid, newName);
					helpers.sendMessage(
						api,
						"Nick changed",
						message.object.from,
						message.object.id.id
					);
				},
				description: "Change nickname",
				admin: false
			},
			"!nick": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.getContactByJid(db, jid).then((row) => {
						helpers.sendMessage(
							api,
							row[0].nick,
							message.object.from,
							message.object.id.id
						);
					});
				},
				description: "Print nickname",
				admin: false
			},
			"!admins": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					if (jid === config.admin_jid) {
						contact.getContacts(db).then((row) => {
							row.forEach((contact) => {
								if (contact.admin) {
									bugout.log(contact);
								}
							});
						});
					}
				},
				description: "Log admins",
				admin: true
			},
			"!setadmin": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var target = message.object.body.replace("!setadmin ", "");
					target = target + "@c.us";
					if (jid === config.admin_jid) {
						contact.checkAdmin(db, jid).then((row) => {
							var result = row[0].admin ? true : false;
							var text;
							if (result) {
								contact.addAdmin(db, target);
								helpers.sendMessage(
									api,
									"Admin added",
									message.object.from,
									message.object.id.id
								);
							} else {
								text = "You are not an admin 🌚";
								helpers.sendMessage(
									api,
									text,
									message.object.from,
									message.object.id.id
								);
							}
						});
					} else {
						helpers.sendMessage(
							api,
							"Only bot owner can do that",
							message.object.from,
							message.object.id.id
						);
					}
				},
				description: "Set admin",
				admin: true
			},
			"!setname": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.checkAdmin(db, jid).then((row) => {
						var result = row[0].admin ? true : false;
						var text;
						if (result) {
							var split = message.object.body.replace("!setname ", "");
							split = split.split(" ");
							var length = split.length;
							var target = split[0] + "@c.us";
							var name = split.splice(1, length).join(" ");
							contact.updateName(db, target, name);
							helpers.sendMessage(
								api,
								"Name changed",
								message.object.from,
								message.object.id.id
							);
						} else {
							text = "You are not an admin 🌚";
							helpers.sendMessage(
								api,
								text,
								message.object.from,
								message.object.id.id
							);
						}
					});
				},
				description: "Set name",
				admin: true
			},
			"!name": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.getContactByJid(db, jid).then((row) => {
						helpers.sendMessage(
							api,
							row[0].name,
							message.object.from,
							message.object.id.id
						);
					});
				},
				description: "Print name",
				admin: false
			},
			"!group": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var counter = 0;
					var number = 0;
					if (message.isG) {
						group.getGroupByJid(db, message.object.from).then((row) => {
							var grp = row[0];
							var text = "Group Members:";
							var number = grp.members.length;
							grp.members.forEach((member) => {
								contact.getContactByJid(db, member.id).then((row) => {
									counter++;
									text =
										text +
										"\n *" +
										row[0].nick +
										"*: +" +
										row[0].jid.replace("@c.us", "");
									helpers.waitForSend(
										api,
										text,
										number,
										counter,
										message.object.from
									);
								});
							});
						});
					}
				},
				description: "Get group members",
				admin: false
			},
			"!games": {
				action: (message) => {
					helpers.sendMessage(
						api,
						gm.listGames(),
						message.object.from,
						message.object.id.id
					);
				},
				description: "List games",
				admin: false
			},
			"!gstatus": {
				action: (message) => {
					helpers.sendMessage(
						api,
						gm.status(),
						message.object.from,
						message.object.id.id
					);
				},
				description: "Check status of running games",
				admin: false
			},
			"!ghelp": {
				action: (message) => {
					helpers.sendMessage(
						api,
						gm.help(),
						message.object.from,
						message.object.id.id
					);
				},
				description: "Help for running games",
				admin: false
			},
			"!clog": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.checkAdmin(db, jid).then((row) => {
						var result = row[0].admin ? true : false;
						var text;
						if (result) {
							bugout.clear();
						} else {
							text = "You are not an admin 🌚";
							helpers.sendMessage(
								api,
								text,
								message.object.from,
								message.object.id.id
							);
						}
					});
				},
				description: "clear logs",
				admin: true
			},
			"!masterlog": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					if (jid === config.admin_jid) {
						bugout.log("[INFO]: Downloading Log");
						var logs = bugout.getLog();
						var blob = new Blob([logs], {
							type: "text/plain"
						});
						var url = window.URL.createObjectURL(blob);
						helpers.sendMedia(api, url, jid, "", message.object.id.id);
					} else {
						text = "You are not the bot admin";
						helpers.sendMessage(
							api,
							text,
							message.object.from,
							message.object.id.id
						);
					}
				},
				description: "Send Master Logs",
				admin: true
			},
			"!leaderboard": {
				action: (message) => {
					var game = message.object.body.replace("!leaderboard ", "");
					if (game) {
						contact.getContacts(db).then((rows) => {
							var contacts = lodash.zipObject(
								lodash.map(rows, "jid"),
								lodash.map(rows, "nick")
							);
							leaderboard.get_score(db, message.object.from).then((boards) => {
								var board = boards[0] ? boards[0] : false;
								console.log(board);
								if (board) {
									var game_board = board.games[game]
										? board.games[game]
										: false;
									console.log(game_board);
									if (game_board) {
										var text = "Leaderboards:";
										var keys = lodash.keys(game_board).map((key) => {
											return [key, game_board[key]];
										});
										keys = lodash.sortBy(keys, (o) => {
											return o[1];
										});
										keys = keys.reverse();
										console.log(keys);
										for (var i = 0; i < keys.length; i++) {
											text =
												text +
												"\n" +
												(i + 1) +
												". *" +
												contacts[keys[i][0]] +
												"* - " +
												keys[i][1];
										}
										helpers.sendMessage(
											api,
											text,
											message.object.from,
											message.object.id.id
										);
									} else {
										helpers.sendMessage(
											api,
											"Leaderboard Empty",
											message.object.from,
											message.object.id.id
										);
									}
								} else {
									helpers.sendMessage(
										api,
										"Leaderboard Empty",
										message.object.from,
										message.object.id.id
									);
								}
							});
						});
					}
				},
				description: "Get leaderboards for group. _!leaderboard cah_",
				admin: false
			},
			"!log": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					bugout.log("[INFO]: Downloading Log");
					var logs = bugout.search(message.object.from);
					var blob = new Blob([logs], {
						type: "text/plain"
					});
					var url = window.URL.createObjectURL(blob);
					helpers.sendMedia(api, url, message.object.from, "", null);
				},
				description: "Send logs for group",
				admin: false
			},
			"!refresh": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.checkAdmin(db, jid).then((row) => {
						var result = row[0].admin ? true : false;
						var text;
						if (result) {
							api.postMessage({
								type: "refresh"
							});
						} else {
							text = "You are not an admin 🌚";
							helpers.sendMessage(
								api,
								text,
								message.object.from,
								message.object.id.id
							);
						}
					});
				},
				description: "Refresh bot",
				admin: true
			},
			"!groups": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.checkAdmin(db, jid).then((row) => {
						var result = row[0].admin ? true : false;
						var text;
						if (result) {
							group.getGroups(db).then((rows) => {
								bugout.log(rows);
							});
						} else {
							text = "You are not an admin 🌚";
							helpers.sendMessage(
								api,
								text,
								message.object.from,
								message.object.id.id
							);
						}
					});
				},
				description: "Log groups",
				admin: true
			},
			"!psa": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var psa = message.object.body.replace("!psa ", "");
					if (jid === config.admin_jid) {
						group.getGroups(db).then((rows) => {
							text = "*PSA:* " + "\n" + psa;
							rows.forEach((row) => {
								helpers.sendMessage(api, text, row.jid);
							});
						});
					} else {
						helpers.sendMessage(
							api,
							"Only bot owner can do that",
							message.object.from,
							message.object.id.id
						);
					}
				},
				description: "Broadcast to all groups",
				admin: true
			},
			"!soccer": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					if (message.object.body === "!soccer") {
						soccer.list(message);
					} else {
						var text = message.object.body.replace("!soccer ", "");
						text.split(" ").forEach((number) => {
							var index = parseInt(number);
							soccer.subscribe(message, index);
						});
					}
				},
				description:
					"Subscribe to soccer games for goal highlights, use !soccer to list games",
				admin: false
			},
			"!goals": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!goals ", "");
					var index = parseInt(text);
					soccer.get_goals(message, index);
				},
				description:
					"Get Goal highlights for a game, use !soccer to list games",
				admin: false
			},
			"!events": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!events ", "");
					var index = parseInt(text);
					soccer.get_events(message, index);
				},
				description: "Get timeline for a game, use !soccer to list games",
				admin: false
			},

			"!request": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!request ", "");
					if (request.length === 0) {
						helpers.sendMessage(
							api,
							"Please enter a request",
							message.object.from,
							message.object.id.id
						);
					} else {
						request.addRequest(db, jid, text).then((row) => {
							var message_text = "[REQUEST] #" + row[0].id + "\n" + row[0].text;
							helpers.sendMessage(api, message_text, config.admin_jid);
							helpers.sendMessage(
								api,
								"Request sent",
								message.object.from,
								message.object.id.id
							);
						});
					}
				},
				description:
					"Send a request to the bot admin, he will contact you to address it.",
				admin: false
			},
			"!rstart": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!rstart ", "");
					var request_id = text.split("_")[0];
					request_id = parseInt(request_id);
					if (jid === config.admin_jid) {
						if (request_id === 0) {
							helpers.sendMessage(
								api,
								"Please enter a request id",
								jid,
								message.object.id.id
							);
						} else {
							// request.markComplete(db, request_id);
							request.getRequestByID(db, request_id).then((row) => {
								api.postMessage({
									type: "request_start",
									jid: row[0].user,
									text: row[0].text,
									group_jid: config.request_group
								});
							});
						}
					}
				},
				description: "Begin Request",
				admin: true
			},
			"!rdone": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!rdone ", "");
					var request_id = text.split("_")[0];
					request_id = parseInt(request_id);
					if (jid === config.admin_jid) {
						request.markComplete(db, request_id);
						request.getRequestByID(db, request_id).then((row) => {
							api.postMessage({
								type: "request_done",
								group_jid: config.request_group
							});
						});
					}
				},
				description: "End Request",
				admin: true
			},
			"!pingm": {
				action: (message) => {
					helpers.pingMedia(message.object.from, api);
				},
				description: "Ping with media response"
			},
			"!smmry": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!smmry ", "");
					if (text.length > 0) {
						var api_url =
							"http://api.smmry.com?SM_API_KEY=" +
							smmry_key +
							"&SM_WITH_BREAK" +
							"&SM_URL=" +
							text;
						axios({
							method: "post",
							url: api_url
						}).then((response) => {
							if (response.data.sm_api_error) {
								var message_text = response.data.sm_api_message;
								helpers.sendMessage(
									api,
									message_text,
									message.object.from,
									message.object.id.id
								);
							} else {
								var text = response.data.sm_api_content;
								var title = response.data.sm_api_title;
								text = text.replace(/\[BREAK\]/g, "\n\n\t");
								var message_text = "*" + title + "*\n" + text;
								helpers.sendMessage(
									api,
									message_text,
									message.object.from,
									message.object.id.id
								);
							}
						});
					}
				},
				description: "Summarize a URL",
				admin: false
			},
			"!emotes": {
				action: (message) => {
					var message_text = emotes.list();
					helpers.sendMessage(
						api,
						message_text,
						message.object.from,
						message.object.id.id
					);
				},
				description: "_Select_ emotes only",
				admin: false
			},
			"!flip": {
				action: (message) => {
					x = Math.floor(Math.random() * 2) == 0;
					if (x) {
						helpers.sendMessage(
							api,
							"Heads",
							message.object.from,
							message.object.id.id
						);
					} else {
						helpers.sendMessage(
							api,
							"Tails",
							message.object.from,
							message.object.id.id
						);
					}
				},
				description: "Flip coin",
				admin: false
			},
			"!memos": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.getContactByJid(db, jid).then((rows) => {
						var memos = rows[0].memos ? rows[0].memos : [];
						if (memos.length == 0) {
							helpers.sendMessage(
								api,
								"You have no memos stored \n\n Store new memos by adding #memo to any message you send to the bot",
								jid
							);
						} else {
							var text = "```Memos:```\n";
							for (var i = 0; i < memos.length; i++) {
								text = text + "\n*" + (i + 1) + "*-" + memos[i];
							}
							helpers.sendMessage(api, text, jid);
						}
					});
				},
				description: "List your memos",
				admin: false
			},
			"!clearmemos": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					contact.clearMemos(db, jid);
				},
				description: "Clear All memos",
				admin: false
			},
			"!delmemo": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!delmemo ", "");
					var request_id = parseInt(text);
					request_id = request_id - 1;
					contact.getContactByJid(db, jid).then((rows) => {
						var memos = rows[0].memos ? rows[0].memos : [];
						if (request_id >= 0 && request_id < memos.length) {
							contact.deleteMemo(db, jid, request_id);
						} else {
							api.postMessage({
								type: "send_text",
								to: jid,
								body: "Enter a valid memo index"
							});
						}
					});
				},
				description: "Delete a specific memo",
				admin: false
			},
			"!join": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					var text = message.object.body.replace("!join ", "");
					var index = parseInt(text);
					gm.join(jid, message, index);
				},
				description: "Join an ongoing game",
				admin: false
			},
			"!pick": {
				action: (message) => {
					var text = message.object.body.replace("!pick ", "");
					var city = text.split("_")[0];
					var category = text.split("_")[1];
					console.log(city, category);
					helpers.zomato(
						api,
						message.object.from,
						message.object.id.id,
						city,
						category
					);
				}
			},
			"!apps": {
				action: (message) => {
					helpers.sendMessage(
						api,
						am.list_apps(),
						message.object.from,
						message.object.id.id
					);
				},
				description: "List apps",
				admin: false
			},
			"!beta": {
				action: (message) => {
					var jid = helpers.getUserJidFromMessage(message);
					api.postMessage({
						type: "group_invite",
						jid: config.beta_group,
						members: [jid]
					});
				},
				description: "Join Beta group",
				admin: false
			}
		};
		return {
			handleMessage: (message) => {
				var elements = message.object.body.split(" ", 2);
				if (command_list[elements[0]]) {
					command_list[elements[0]].action(message, api, db);
				}
			}
		};
	}
};
