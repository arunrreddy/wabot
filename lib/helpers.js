var contact = require("../db/contact.js");
var _ = require("underscore");
var config = require("./config.js");

function getJid(message) {
	if (message.isG) {
		return message.object.author;
	} else {
		return message.object.from;
	}
}

function removeNumbers(text, list) {
	for (var i = 0; i < list.length; i++) {
		text = text.replace("@" + list[i].split("@")[0], "");
	}
	return text;
}

function send_media(api, person, caption, media_url) {
	api.postMessage({
		type: "send_media",
		to: person,
		text: caption,
		url: media_url
	});
}

var token = null;
module.exports = {
	getUserJidFromMessage: getJid,
	handleMentions: (db, api, message) => {
		var jid = getJid(message);
		var mentioned_list = message.object.mentionedJidList;
		mentioned_list = _.uniq(mentioned_list);
		var body = removeNumbers(message.object.body, mentioned_list);
		var text = "```Mentioned by " + message.name + "```";
		var time = 1000;
		mentioned_list.forEach((person) => {
			setTimeout(
				module.exports.sendMessage,
				time,
				api,
				text,
				person,
				message.object.id.id
			);
			time += 2000;
		});
	},
	handleMultipleMedia: (api, link, jids, caption, message_id) => {
		var time = 1000;
		jids.forEach((jid) => {
			setTimeout(
				module.exports.sendMedia,
				time,
				api,
				link,
				jid,
				caption,
				message_id
			);
			time += 2000;
		});
	},
	handleMediaMentions: (db, api, message) => {
		var jid = getJid(message);
		var mentioned_list = message.object.mentionedJidList;
		mentioned_list = _.uniq(mentioned_list);
		var body = removeNumbers(message.object.caption, mentioned_list);
		var caption = "```Mentioned by ```*" + message.name + "*: \n\n" + body;
		var media_url = message.mediaUrl;
		var time = 1000;
		mentioned_list.forEach((person) => {
			setTimeout(send_media, time, api, person, caption, media_url);
			time += 2000;
		});
	},
	handleTwitchClip: (api, jid, id, message_id) => {
		var url = "https://api.twitch.tv/kraken/clips/" + id;
		var httpRequest = new XMLHttpRequest();

		httpRequest.open("GET", url);
		httpRequest.setRequestHeader("Client-ID", config.twitch_clientID);
		httpRequest.setRequestHeader("Accept", "application/vnd.twitchtv.v5+json");
		httpRequest.onload = function() {
			if (this.status == 200) {
				var result = JSON.parse(this.responseText);
				var url = result.thumbnails.medium;
				var title = result.title;
				url = url.split("-preview")[0] + ".mp4";
				console.log(url);
				module.exports.sendMedia(api, url, jid, title, message_id);
			}
		};
		httpRequest.send();
	},
	handleStreamable: (api, jid, video_id, message_id) => {
		var httpRequest = new XMLHttpRequest();
		httpRequest.open("GET", "https://api.streamable.com/videos/" + video_id);
		httpRequest.onload = function() {
			if (this.status == 200) {
				var result = JSON.parse(this.responseText);
				var url = "https:" + result.files["mp4"].url;
				module.exports.sendMedia(api, url, jid, result.title, message_id);
			}
		};
		httpRequest.send();
	},
	handleInstagram: (api, jid, url, message_id) => {
		var access_token = config.instagram_token;
		var fullurl = "https://downloadgram.com/";
		var httpRequest = new XMLHttpRequest();

		httpRequest.open("GET", fullurl);
		httpRequest.onload = function() {
			if (this.status == 200) {
				elements = this.responseXML.forms["main_form"].getElementsByTagName(
					"input"
				);
				var build_id = elements["build_id"].defaultValue;
				var build_key = elements["build_key"].defaultValue;
				var http = new XMLHttpRequest();
				var params =
					"build_id=" + build_id + "&build_key=" + build_key + "&url=" + url;
				http.open("POST", fullurl + "/process.php", true);

				//Send the proper header information along with the request
				http.setRequestHeader(
					"Content-type",
					"application/x-www-form-urlencoded"
				);

				http.onreadystatechange = function() {
					//Call a function when the state changes.
					if (http.readyState == 4 && http.status == 200) {
						var link = http.responseXML.links[0].href;
						module.exports.sendMedia(api, link, jid, null, message_id);
					}
				};
				http.responseType = "document";
				http.send(params);
			}
		};

		httpRequest.responseType = "document";
		httpRequest.send();
	},
	handleOddshot: (api, jid, id, message_id) => {
		var url = "https://api.oddshot.tv/v1/shot/" + id;
		var httpRequest = new XMLHttpRequest();

		httpRequest.open("GET", url);
		httpRequest.setRequestHeader("x-client-id", config.oddshot_token);
		httpRequest.onload = function() {
			if (this.status == 200) {
				var result = JSON.parse(this.responseText);
				console.log(result);
				var url = result.data.renditions[0].url;
				var title = result.data.name;
				module.exports.sendMedia(api, url, jid, title, message_id);
			}
		};
		httpRequest.send();
	},
	handleNoortv: (api, jid, video_id, message_id) => {
		function getVideo(id) {
			var httpRequest = new XMLHttpRequest();

			httpRequest.open(
				"GET",
				"http://alnoortv.co/VodTV/rest/video/detail?langCode=ar&videoId=" + id
			);
			httpRequest.setRequestHeader(
				"Content-type",
				"application/json;encoding=UTF-8"
			);
			httpRequest.setRequestHeader("Authorization", config.noor_auth);
			httpRequest.setRequestHeader("X-Authorization", "Bearer " + token);
			httpRequest.onload = function() {
				if (this.status == 200) {
					var result = JSON.parse(this.responseText);
					if (result.errorCode == 0) {
						var text = result.data.videoUrl.replace(
							"&profile_id=174",
							"&profile_id=175"
						);
						module.exports.sendMessage(api, text, jid, message_id);
					}
				}
			};
			httpRequest.send();
		}
		if (token == null) {
			// No Token, login
			var http = new XMLHttpRequest();
			var params = {
				loginType: 100,
				password: config.noor_pass,
				username: config.noor_username
			};
			http.open(
				"POST",
				"http://alnoortv.co/VodTV/rest/auth/login?langCode=ar",
				true
			);

			//Send the proper header information along with the request
			http.setRequestHeader("Content-type", "application/json;encoding=UTF-8");
			http.setRequestHeader("Authorization", config.noor_auth);

			http.onreadystatechange = function() {
				//Call a function when the state changes.
				if (http.readyState == 4 && http.status == 200) {
					var result = JSON.parse(this.responseText);
					if (result.errorCode == 0) {
						token = result.data.token;
						getVideo(video_id);
					}
				}
			};
			http.send(JSON.stringify(params));
		} else {
			getVideo(video_id);
		}
	},

	pingMedia: (jid, api) => {
		var media_array = [
			"https://i.imgur.com/4z39aMM.jpg",
			"https://i.imgur.com/ukYwelU.jpg",
			"https://i.imgur.com/2fdwqCR.jpg",
			"https://i.imgur.com/8ovLi.jpg",
			"https://i.imgur.com/7Aedw.jpg",
			"https://i.imgur.com/gqBZVxL.jpg",
			"https://i.imgur.com/hoXI6g8.png",
			"https://i.imgur.com/om3iRJu.jpg"
		];
		var link = _.sample(media_array);
		module.exports.sendMedia(api, link, jid, "Pong");
	},
	sendMessage: (api, text, jid, message_id) => {
		var msg_id = message_id ? message_id : null;
		api.postMessage({
			type: "send_text",
			to: jid,
			body: text,
			message_id: msg_id
		});
	},
	sendMedia: (api, link, jid, caption, message_id) => {
		var xhr = new XMLHttpRequest();
		var msg_id = message_id ? message_id : null;
		xhr.open("GET", link, true);
		xhr.responseType = "blob";
		xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
		xhr.onload = function(e) {
			if (this.status == 200) {
				var url = window.URL.createObjectURL(this.response);
				var message = {
					type: "media_url",
					url: url
				};
				chrome.tabs.query(
					{
						active: true
					},
					(tabs) => {
						chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
							if (response.type === "media_success") {
								api.postMessage({
									type: "send_media",
									to: jid,
									text: caption,
									url: response.url,
									msg_id: msg_id
								});
							} else {
								console.log("[ERROR]: Media Error " + JSON.stringify(response));
							}
						});
					}
				);
			}
		};

		xhr.send();
	},
	waitForSend: (api, text, number, index, target) => {
		if (index == number) {
			api.postMessage({
				type: "send_text",
				to: target,
				body: text
			});
		}
	},
	zomato: (api, jid, msg_id, city_text, category_text) => {
		var key = config.zomato_key;
		var url = "https://developers.zomato.com/api/v2.1/";

		var httpRequest = new XMLHttpRequest();

		httpRequest.open("GET", url + "cities?q=" + city_text);
		httpRequest.setRequestHeader("user-key", key);
		httpRequest.onload = function() {
			if (this.status == 200) {
				var result = JSON.parse(this.responseText);
				console.log(result);
				var status = result.status === "success" ? true : false;
				if (status) {
					var found_locations =
						result.location_suggestions.length > 0 ? true : false;
					if (found_locations) {
						var city_id = result.location_suggestions[0].id;
						// Put cuisine here

						var search_request = new XMLHttpRequest();
						search_request.open(
							"GET",
							url +
								"search?entity_id=" +
								city_id +
								"&entity_type=city&sort=rating"
						);
						search_request.setRequestHeader("user-key", key);

						search_request.onload = function() {
							if (this.status == 200) {
								var result = JSON.parse(this.responseText);
								console.log(result);
								var restaurants = result.restaurants;
								var random_index = _.random(0, restaurants.length);
								var selection = restaurants[random_index].restaurant;
								console.log(random_index);
								console.log(selection);
								var name = selection.name;
								var cuisine = selection.cuisines;
								var location_url =
									"https://www.google.com/maps?q=" +
									name +
									" " +
									selection.location.city;
								module.exports.sendMessage(
									api,
									"*Here is your restaurant:* \n\n " +
										name +
										"\n\n" +
										cuisine +
										"\n" +
										encodeURI(location_url),
									jid,
									msg_id
								);
							}
						};
						search_request.send();
					} else {
						module.exports.sendMessage(api, "Error finding city", jid, msg_id);
					}
				} else {
					module.exports.sendMessage(api, "Error", jid, msg_id);
				}
			}
		};
		httpRequest.send();
	},
	fenToText: (fen) => {
		var pieces = {
			K: "♔",
			Q: "♕",
			R: "♖",
			B: "♗",
			N: "♘",
			P: "♙",
			k: "♚",
			q: "♛",
			r: "♜",
			b: "♝",
			n: "♞",
			p: "♟",
			white: "□",
			black: "■"
		};

		var digits = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
		digits = digits.reverse();
		var result = "```";
		var rows = 0;
		var columns = 1;
		for (var i = 0; i < fen.length && fen[i] != " "; i++) {
			if (columns == 1) {
				result = result + digits[rows] + "|";
			}
			if (pieces[fen[i]]) {
				columns++;
				result = result + pieces[fen[i]] + "|";
			} else if (/\d/.test(fen[i])) {
				var int = parseInt(fen[i]);
				for (var c = 0; c < int; c++) {
					columns++;
					var isLight = (rows + columns) % 2 == 0;
					if (isLight) {
						result = result + pieces.white;
					} else {
						result = result + pieces.black;
					}
					result = result + "|";
				}
			} else if (fen[i] === "/") {
				result = result + "\n";
				rows++;
				columns = 1;
			}
		}
		result = result + "\n" + "▲|⒜|⒝|⒞|⒟|⒠|⒡|⒢|⒣```";
		return result;
	}
};
