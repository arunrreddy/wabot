module.exports = {
	"!help": {
		action: function(message) {
			var jid = helpers.getUserJidFromMessage(message);
			contact.checkAdmin(db, jid).then((row) => {
				var result = row[0].admin ? true : false;
				if (result) {
					var text = "Commands (Admin): ";
					for (var key in command_list) {
						text = text + "\n*" + key + "* - " + command_list[key].description;
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
	}
};
