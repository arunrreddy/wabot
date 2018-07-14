var handlerObject = require("../handlerObject.js").Handler;
var events = require("events").EventEmitter;
var group = require("../../db/group.js");
var contact = require("../../db/contact.js");
var helpers = require("../helpers.js");
var leaderboard = require("../../db/leaderboard.js");
var _ = require("underscore");
var decode = require("ent/decode");
// Filter cards
module.exports = {
	description: () => {
		return "Cards Against Humanity";
	},
	isGroup: () => {
		return true;
	},
	init: (port, database, grp, members, args, all_groups, bugout) => {
		var cards = require("../resources/cards.json");
		var bugout = bugout;
		var intergroup = all_groups.length > 0 ? true : false;
		function shuffle(array) {
			for (var i = 0; i < 20; i++) {
				let counter = array.length;

				// While there are elements in the array
				while (counter > 0) {
					// Pick a random index
					let index = Math.floor(Math.random() * counter);

					// Decrease counter by 1
					counter--;

					// And swap the last element with it
					let temp = array[counter];
					array[counter] = array[index];
					array[index] = temp;
				}
			}
			return array;
		}

		function prep() {
			answers = _.uniq(answers);
			for (var j = 0; j < 30; j++) {
				var random = _.random(0, answers.length - 1);
				answers.splice(random, 0, "_");
			}
			for (var i = 0; i < answers.length; i++) {
				answers[i] = decode(answers[i]);
				answers[i] = answers[i].replace(/<i>/g, "_");
				answers[i] = answers[i].replace(/<\/i>/g, "_");
				answers[i] = answers[i].replace(/<br>/g, "\n");
			}
			questions = _.uniq(questions, "text");
			for (var i = 0; i < questions.length; i++) {
				questions[i].text = decode(questions[i].text);
				questions[i].text = questions[i].text.replace(/<i>/g, "_");
				questions[i].text = questions[i].text.replace(/<\/i>/g, "_");
				questions[i].text = questions[i].text.replace(/<br>/g, "\n");
				questions[i].text = questions[i].text.replace(/<br\/>/g, "\n");
				questions[i].text = questions[i].text.replace(/<\/br>/g, "\n");
			}
			return _.map(answers, (el) => {
				if (el === "_") {
					return {
						text: el,
						empty: true
					};
				} else {
					return {
						text: el,
						empty: false
					};
				}
			});
		}
		var handler = new handlerObject();
		var answers;
		var questions;
		var group_jid = grp;
		var api = port;
		var db = database;
		var gameStates = {
			Lobby: 1, // Waiting for players
			ReplaceCards: 2, // Give option to replace cards
			PlayingAnswer: 3, // Waiting on player picks
			CzarPick: 4 // Waiting on czar to pick winner
		};
		var score_limit = 5;
		var re = /^[1-9]\d*$/;
		if (re.test(args[0])) {
			var limit = parseInt(args[0]);
			if (limit > 19) {
				api.postMessage({
					type: "send_text",
					to: group_jid,
					body: "Isn't that a little bit too much? Try less than 20 next time"
				});
			} else {
				score_limit = limit;
			}
		}
		var currentState = gameStates.Lobby;
		var roundNum = 0;
		var questionText = "";
		var numofpicks = 1;
		var Players = {
			// jid
			// cards : []
			// name: String
			// Points: Int
			// isCzar: boolean
		};
		var first = true;
		var eventEmitter = new events();
		var czarJid;
		var czarIndex;
		var playerCzarArray = [];
		var playedCards = [];

		function prepCards() {
			answers = cards.whiteCards;
			questions = cards.blackCards;
			answers = prep();
			questions = shuffle(questions);
			answers = shuffle(answers);
		}
		prepCards();
		handler.on("handlersEmpty", () => {
			if (currentState == gameStates.Lobby) {
				if (Object.keys(Players).length > 2) {
					if (intergroup) {
						api.postMessage({
							type: "group_invite",
							jid: group_jid,
							members: Object.keys(Players)
						});

						all_groups.forEach((group) => {
							api.postMessage({
								type: "send_text",
								to: group,
								body:
									"*CAH:* Cross Group game started, use !join to join the ongoing game"
							});
						});
					}
					// Setup game
					setTimeout(setup, 10000);
					//setup();
				} else {
					if (intergroup) {
						all_groups.forEach((group) => {
							api.postMessage({
								type: "send_text",
								to: group,
								body: "*CAH:* Not enough players"
							});
						});
					} else {
						api.postMessage({
							type: "send_text",
							to: group_jid,
							body: "*CAH:* Not enough players"
						});
					}
					allLeave();
					eventEmitter.emit("gameOver");
				}
			} else if (currentState == gameStates.ReplaceCards) {
				start();
			} else if (currentState == gameStates.PlayingAnswer) {
				setupCzarPick();
			} else if (currentState == gameStates.CzarPick) {
				if (scoreLimit()) {
					var text = "*Results:*";
					for (var jid in Players) {
						if (Players[jid].Winner) {
							leaderboard.add_score(db, group_jid, "cah", jid);
							text =
								text +
								"\n*" +
								Players[jid].Name +
								"* - " +
								Players[jid].Points +
								" points (Winner)";
						} else {
							text =
								text +
								"\n*" +
								Players[jid].Name +
								"* - " +
								Players[jid].Points +
								" points";
						}
					}

					api.postMessage({
						type: "send_text",
						to: group_jid,
						body: text
					});
					allLeave();
					eventEmitter.emit("gameOver");
				} else {
					cycle();
				}
			}
		});

		function scoreLimit() {
			for (var jid in Players) {
				if (Players[jid].Points === score_limit) {
					Players[jid].Winner = true;
					return true; //Limit reached
				}
			}
			return false; //Game still goes on
		}

		function allLeave() {
			for (var jid in Players) {
				eventEmitter.emit("playerLeft", jid);
			}
		}

		function addCards(player, card) {
			Players[player].Cards.push(card);
		}

		function fillUpCards() {
			for (var jid in Players) {
				while (Players[jid].Cards.length < 10) {
					addCards(jid, answers.shift());
				}
			}
		}

		function pickRandomCzar() {
			var count = 0;
			var result;
			for (var jid in Players) {
				if (Math.random() < 1 / ++count) {
					result = jid;
				}
			}
			czarJid = result;
			playerCzarArray = Object.keys(Players);
			czarIndex = Object.keys(Players).indexOf(result);
			Players[result].isCzar = true;
		}

		function printWhoAndPoints(jid) {
			var text = "*Card played by:* " + Players[jid].Name;
			for (var jid in Players) {
				text = text + "\n*" + Players[jid].Name + "* - " + Players[jid].Points;
			}

			api.postMessage({
				type: "send_text",
				to: group_jid,
				body: text
			});
		}

		function setupCzarPick() {
			var text = "*Question Card:* " + questionText + "\n *Played Cards:* ";
			shuffle(playedCards);
			shuffle(playedCards);
			playedCards.forEach((inputs, index) => {
				text = text + "\n*" + (index + 1) + "* - ";
				inputs.cards.forEach((card, index, array) => {
					if (index == array.length - 1) {
						text = text + card.text;
					} else {
						text = text + card.text + " *&* ";
					}
				});
			});

			var handlerFunction = function(jid, message) {
				var elements = message.object.body.split(" ");
				if (elements.length == 1) {
					var re = /^([1-9]|10)$/;
					if (re.test(elements[0])) {
						var messageInt = parseInt(message.object.body);
						Players[jid].isCzar = false; // not czar anymore
						var round_winner_jid = playedCards[messageInt - 1].jid;
						Players[round_winner_jid].Points++;
						printWhoAndPoints(round_winner_jid);
						playedCards = [];
						handler.deleteHandler(jid);
					}
				}
			};
			handler.addHandler(czarJid, handlerFunction);
			currentState = gameStates.CzarPick;
			api.postMessage({
				type: "send_text",
				to: group_jid,
				body: text
			});
		}

		function getNextCzar() {
			if (first) {
				first = false;
				return;
			} else {
				czarIndex++;
				if (czarIndex > playerCzarArray.length - 1) {
					czarIndex = 0;
				}
				czarJid = playerCzarArray[czarIndex];
				Players[czarJid].isCzar = true;
			}
		}

		function sendCards() {
			for (var jid in Players) {
				if (!Players[jid].isCzar) {
					var text =
						"*Round:* " +
						roundNum +
						"\n*Question:* " +
						questionText +
						"\n*Your cards:* ";
					Players[jid].Cards.forEach((card, index) => {
						text = text + "\n*" + (index + 1) + "* - " + card.text;
					});
					api.postMessage({
						type: "send_text",
						to: jid,
						body: text
					});
				} else {
					api.postMessage({
						type: "send_text",
						to: jid,
						body: "You are the Czar"
					});
				}
			}
		}

		function cycle() {
			roundNum++;
			var question = questions.shift();
			questionText = question.text;
			numofpicks = question.pick;
			getNextCzar();
			fillUpCards();
			sendCards();
			currentState = gameStates.PlayingAnswer;
			var handlerFunction = (jid, message) => {
				var elements = message.object.body.split(" ");
				if (elements.length == numofpicks) {
					var re = /^([1-9]|10)$/;
					var result = elements.every((el) => {
						return re.test(el);
					});
					if (result) {
						var played = {
							jid: jid,
							cards: []
						};
						var numofempty = 0;
						var emptyIndexes = [];
						elements.forEach((el, index) => {
							var input = parseInt(el);
							var card = Players[jid].Cards[input - 1];
							if (card.empty) {
								numofempty++;
								emptyIndexes.push(index);
							}
							played.cards.push(card);
						});
						played.cards.forEach((card) => {
							Players[jid].Cards.splice(Players[jid].Cards.indexOf(card), 1);
						});

						var blankInputFunction = (jid, message) => {
							if (!message.isG) {
								var inputs = message.object.body.split("_");
								if (inputs.length == numofempty) {
									emptyIndexes.forEach((i, index) => {
										played.cards[i].text = inputs[index];
									});
									playedCards.push(played);
									handler.deleteHandler(jid);
								} else {
									if (!message.isG) {
										api.postMessage({
											type: "send_text",
											to: jid,
											body: "Need " + numofempty + " inputs"
										});
									}
								}
							}
						};
						if (numofempty) {
							handler.handlers[jid] = blankInputFunction;
							api.postMessage({
								type: "send_text",
								to: jid,
								body:
									"Send your blank card inputs (separated with underscore if more than one)"
							});
						} else {
							playedCards.push(played);
							handler.deleteHandler(jid);
						}
					} else {
						if (!message.isG) {
							api.postMessage({
								type: "send_text",
								to: jid,
								body: "Pick between 1-10"
							});
						}
					}
				} else {
					if (!message.isG) {
						api.postMessage({
							type: "send_text",
							to: jid,
							body: "Need " + numofpicks + " cards"
						});
					}
				}
			};
			for (var jid in Players) {
				if (!Players[jid].isCzar) {
					handler.addHandler(jid, handlerFunction);
				}
			}
			var text =
				"*Round:* " +
				roundNum +
				"\n*Question:* " +
				questionText +
				"\n*Card Czar:* " +
				Players[czarJid].Name;
			api.postMessage({
				type: "send_text",
				to: group_jid,
				body: text
			});
		}

		function replaceCards() {
			var handlerFunction = (jid, message) => {
				if (message.object.body != "0") {
					var elements = message.object.body.split(" ");
					var re = /^([1-9]|10)$/;
					var result = elements.every((el) => {
						return re.test(el);
					});

					if (result) {
						elements.forEach((el) => {
							var input = parseInt(el);
							Players[jid].Cards[input - 1] = answers.shift();
						});
						var text = "*Your new cards:* ";
						Players[jid].Cards.forEach((card, index) => {
							text = text + "\n*" + (index + 1) + "* - " + card.text;
						});
						api.postMessage({
							type: "send_text",
							to: jid,
							body: text
						});
						handler.deleteHandler(jid);
					} else if (message.object.body === "all") {
						for (var i = 0; i < 10; i++) {
							Players[jid].Cards[i] = answers.shift();
						}
						var text = "*Your new cards:* ";
						Players[jid].Cards.forEach((card, index) => {
							text = text + "\n*" + (index + 1) + "* - " + card.text;
						});
						api.postMessage({
							type: "send_text",
							to: jid,
							body: text
						});
						handler.deleteHandler(jid);
					} else {
						if (!message.isG) {
							api.postMessage({
								type: "send_text",
								to: jid,
								body: "Pick between 1-10"
							});
						}
					}
				} else {
					handler.deleteHandler(jid);
				}
			};
			for (var jid in Players) {
				var text = "*Your cards:* ";
				Players[jid].Cards.forEach((card, index) => {
					text = text + "\n*" + (index + 1) + "* - " + card.text;
				});
				api.postMessage({
					type: "send_text",
					to: jid,
					body: text
				});
				handler.addHandler(jid, handlerFunction);
				api.postMessage({
					type: "send_text",
					to: jid,
					body:
						'Select the cards you want to replace separated by spaces\n -Send 0 to replace none\n -Send "all" to replace all cards'
				});
			}
		}

		function start() {
			currentState = gameStates.PlayingAnswer;
			pickRandomCzar();
			cycle();
		}

		function setup() {
			fillUpCards();
			currentState = gameStates.ReplaceCards;
			api.postMessage({
				type: "send_text",
				to: group_jid,
				body: "Card replacement stage"
			});
			replaceCards();
		}
		members.forEach((member) => {
			var timeout = setTimeout(
				() => {
					eventEmitter.emit("playerLeft", member);
					handler.deleteHandler(member);
				},
				60000,
				member
			);

			var handlerFunction = (jid, message) => {
				if (message.object.body === "1") {
					contact.getContactByJid(db, jid).then((row) => {
						Players[jid] = {
							Cards: [],
							Name: row[0].nick,
							Points: 0,
							isCzar: false
						};
						clearTimeout(timeout);
						handler.deleteHandler(jid);
					});
					return;
				} else if (message.object.body === "2") {
					handler.deleteHandler(jid);
					eventEmitter.emit("playerLeft", jid);
					clearTimeout(timeout);
					return;
				}
			};
			handler.addHandler(member, handlerFunction);
		});
		var text =
			"Cards Against Humanity starting\n *Score limit:* " +
			score_limit +
			"\n -Send 1 to join\n -Send 2 to decline";
		if (intergroup) {
			all_groups.forEach((group) => {
				api.postMessage({
					type: "send_text",
					to: group,
					body: "*Cross Group* " + text
				});
			});
		} else {
			api.postMessage({
				type: "send_text",
				to: group_jid,
				body: text
			});
		}
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
			group: () => {
				return group_jid;
			},
			info: () => {
				return "Cards Against Humanity";
			},
			is_intergroup: () => {
				return intergroup;
			},
			join: (jid) => {
				bugout.log("Joining running game user: " + jid);
				if (Players[jid]) {
					api.postMessage({
						type: "send_text",
						to: group_jid,
						body: "Already joined"
					});
				} else {
					contact.getContactByJid(db, jid).then((row) => {
						Players[jid] = {
							Cards: [],
							Name: row[0].nick,
							Points: 0,
							isCzar: false
						};
						playerCzarArray.push(jid);
					});
				}
			},
			eventEmitter: eventEmitter,
			status: () => {
				var text = "\n*CAH Game status:* ";
				switch (currentState) {
					case gameStates.Lobby: {
						return (text = text + "Waiting for players to join");
						break;
					}
					case gameStates.ReplaceCards: {
						text = text + "Ongoing \n*Round:* " + roundNum + "\n*Waiting for:*";
						for (var jid in handler.handlers) {
							text = text + "\n*-* " + Players[jid].Name;
						}
						return text;
						break;
					}
					case gameStates.PlayingAnswer: {
						text = text + "Ongoing \n*Round:* " + roundNum + "\n*Waiting for:*";
						for (var jid in handler.handlers) {
							text = text + "\n*-* " + Players[jid].Name;
						}
						return text;
						break;
					}
					case gameStates.CzarPick: {
						text = text + "Ongoing \n*Round:* " + roundNum + "\n*Waiting for:*";
						text = text + "\n*-* " + Players[czarJid].Name;
						return text;
						break;
					}
					default: {
						return "\n";
					}
				}
			},
			help: () => {
				var text = "\n*CAH Game help:* ";
				text = text + "\n *Single answer:* Send the choice";
				text =
					text + "\n *Multiple answer:* Send the choices separated by a space";
				text =
					text +
					"\n *Blank cards:* Select your choices normally, you will then be prompted to send your input for the blank cards. Enter them in order separated by an underscore";
				return text;
			}
		};
	}
};
