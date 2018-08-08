var helper = require("./helpers.js");
var emotes = {
	Overrustle: "https://i.imgur.com/YhUyr4i.png",
	Sweatstiny: "https://i.imgur.com/RbNzAyQ.png",
	Supersweatstiny: "https://i.imgur.com/YRWSgIu.png",
	Extremesweatstiny: "https://i.imgur.com/D0Fu69a.png",
	monkaS: "https://i.imgur.com/g7cxn3w.png",
	Mohsenstiny: "https://i.imgur.com/y2bzbRH.jpg",
	POGGERS: "https://i.imgur.com/pO4kO2J.png",
	monkaGun: "https://i.imgur.com/e9CHbPi.png",
	Glockstiny: "https://i.imgur.com/lEmnHzF.jpg",
	POGGSTINY: "https://i.imgur.com/LVplSjN.jpg",
	REEE: "https://i.imgur.com/pM5HJHb.png",
	HYPERS: "https://i.imgur.com/BYrRSlu.jpg",
	Hhehe: "https://i.imgur.com/rxsOvBX.jpg",
	Pepothink: "https://i.imgur.com/9nq5hiV.jpg",
	Hmmstiny: "https://i.imgur.com/27axujQ.png",
	REEESTINY: "https://i.imgur.com/X46ZvTm.jpg",
	HaHAA: "https://i.imgur.com/WVnxILc.jpg",
	YEET: "https://i.imgur.com/kpIV4lM.jpg",
	ForsenE: "https://i.imgur.com/CWP8bnu.jpg",
	SpookerZ: "https://i.imgur.com/Vtnqifd.jpg",
	moon2S: "https://i.imgur.com/OrQurUW.jpg",
	moon2SMUG: "https://i.imgur.com/iDpZty2.jpg"
};
module.exports = {
	init: (port, bugout) => {
		var api = port;

		return {
			process: (message) => {
				if (emotes[message.object.body]) {
					helper.sendMedia(
						api,
						emotes[message.object.body],
						message.object.from,
						"",
						message.object.id.id
					);
				}
			}
		};
	},
	list: () => {
		var text = "*Available Emotes:* ";
		for (var key in emotes) {
			text = text + "\n " + key;
		}
		return text;
	}
};
