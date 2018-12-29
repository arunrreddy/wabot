module.exports = {
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
							var game_board = board.games[game] ? board.games[game] : false;
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
	}
};
