setTimeout(function() {
	// Returns promise that resolves to all installed modules
	function getAllModules() {
		return new Promise((resolve) => {
			const id = _.uniqueId("fakeModule_");
			window["webpackJsonp"](
				[],
				{
					[id]: function(module, exports, __webpack_require__) {
						resolve(__webpack_require__.c);
					}
				},
				[id]
			);
		});
	}

	var modules = getAllModules()._value;

	// Automatically locate modules
	for (var key in modules) {
		if (modules[key].exports) {
			if (modules[key].exports.createFromData) {
				createFromData_id = modules[key].id.replace(/"/g, '"');
			}
			if (modules[key].exports.prepRawMedia) {
				prepareRawMedia_id = modules[key].id.replace(/"/g, '"');
			}
			if (modules[key].exports.default) {
				if (modules[key].exports.default.Wap) {
					store_id = modules[key].id.replace(/"/g, '"');
				}
			}
		}
	}

	console.log("CreateFromDataID = " + createFromData_id);
	console.log("PrepRawMediaID = " + prepareRawMedia_id);
}, 5000);

function _requireById(id) {
	return webpackJsonp([], null, [id]);
}
// Module IDs
var createFromData_id = 0;
var prepareRawMedia_id = 0;
var store_id = 0;
var Store = {};
function getJid(message) {
	if (message.isGroupMsg) {
		return message.author;
	} else {
		return message.from;
	}
}

function send_message(jid, body, message_id) {
	if (message_id) {
		Store.Chat.find(jid).then((chat) => {
			chat.markComposing();
			var target = _.filter(Store.Msg.models, (msg) => {
				return msg.id.id === message_id;
			})[0];
			var text = [
				body,
				{
					linkPreview: null,
					mentionedJidList: [],
					quotedMsg: target,
					quotedMsgAdminGroupJid: null
				}
			];
			var quotedMsg = {
				linkPreview: null,
				mentionedJidList: [],
				quotedMsg: target,
				quotedMsgAdminGroupJid: undefined
			};
			//chat.sendMessage(body);
			chat.sendMessage(body, quotedMsg);
		});
	} else {
		Store.Chat.find(jid).then(function(chat) {
			chat.markComposing();
			chat.sendMessage(body);
		});
	}
}
function read_message() {
	Store.Chat.models.forEach((chat) => {
		if (chat.unreadCount > 0) {
			chat.sendSeen().then((response) => {});
		}
	});
}

function send_media(jid, link, caption, msg_id, content_type) {
	var file = "";
	var createFromDataClass = _requireById(createFromData_id)["default"];
	var prepareRawMediaClass = _requireById(prepareRawMedia_id).prepRawMedia;
	Store.Chat.find(jid).then((chat) => {
		chat.markComposing();
		var xhr = new XMLHttpRequest();
		xhr.open("GET", link, true);
		xhr.responseType = "blob";
		xhr.onload = function(e) {
			if (this.status == 200) {
				var random_name = Math.random()
					.toString(36)
					.substr(2, 5);
				var type = content_type
					? content_type
					: xhr.getResponseHeader("Content-Type");
				file = new File([this.response], random_name, {
					type: type,
					lastModified: Date.now()
				});
				// myBlob is now the blob that the object URL pointed to.
				var temp = createFromDataClass.createFromData(file, file.type);
				var rawMedia = prepareRawMediaClass(temp, {});
				var target = _.filter(Store.Msg.models, (msg) => {
					return msg.id.id === msg_id;
				})[0];
				var textPortion = {
					caption: caption,
					mentionedJidList: [],
					quotedMsg: target
				};
				rawMedia.sendToChat(chat, textPortion);
			}
		};
		xhr.send();
	});
}

function startRequest(jid, txt, group_jid) {
	var group_id = group_jid;
	Store.Contact.find(jid).then((contact) => {
		Store.GroupMetadata.find(group_id).then((group) => {
			console.log(group);

			console.log(contact);
			group.participants.addParticipants([contact]).then(() => {
				var text = "Welcome to the request room. \n *Request text:*\n\n" + txt;
				send_message(group_id, text);
			});
		});
	});
}

function kick_members(group, contact) {
	console.log(group);
	group.participants.removeParticipants([contact]).then(() => {
		console.log("removed");
	});
}
function endRequest(group_jid) {
	var group_id = group_jid;
	Store.GroupMetadata.find(group_id).then((group) => {
		var contacts = group.participants.models.filter((contact) => {
			return !contact.isAdmin;
		});
		var time = 1000;
		contacts.forEach((contact) => {
			setTimeout(kick_members, time, group, contact);
			time += 3000;
		});
	});
}
function kick_all(group_jid) {
	Store.GroupMetadata.find(group_jid).then((group) => {
		var contacts = group.participants.models.filter((contact) => {
			return !contact.isAdmin;
		});
		if (contacts.length > 1) {
			var time = 1000;
			contacts.forEach((contact) => {
				setTimeout(kick_members, time, group, contact);
				time += 3000;
			});
		}
	});
}
function update_title(group_jid, title) {
	Store.Chat.find(group_jid).then((group) => {
		group.setSubject(title);
	});
}

function getContactArray(users) {
	var promises = users.map((jid) => {
		return Store.Contact.find(jid);
	});
	return Promise.all(promises);
}

function group_invite(group_jid, users) {
	getContactArray(users).then((contacts) => {
		Store.GroupMetadata.find(group_jid).then((group) => {
			console.log("inviting " + contacts.length);
			group.participants.addParticipants(contacts);
		});
	});
}

function lobby_create(api) {
	Store.Contact.find(Store.Conn.me).then((contact) => {
		Store.Chat.createGroup(
			"new_lobby",
			undefined,
			undefined,
			[contact],
			undefined,
			undefined,
			undefined,
			undefined
		).then(() => {});
	});
}
function apiChannel(logging) {
	var api = chrome.runtime.connect(extensionID, {
		name: "api"
	});
	api.onMessage.addListener((msg) => {
		if (msg.type === "send_text") {
			send_message(msg.to, msg.body, msg.message_id);
		} else if (msg.type === "read_msg") {
			read_message();
		} else if (msg.type === "refresh") {
			window.location.reload();
		} else if (msg.type === "leave_group") {
			logging.postMessage({
				level: "INFO",
				text: "Group not on whitelist" + msg.jid
			});
			Store.Chat.find(msg.jid).then((chat) => {
				if (chat.canSend) {
					Store.Wap.leaveGroup(msg.jid);
				}
			});
		} else if (msg.type === "request_start") {
			logging.postMessage({
				level: "INFO",
				text: "Beginning Request with" + msg.jid
			});
			startRequest(msg.jid, msg.text, msg.group_jid);
		} else if (msg.type === "request_done") {
			logging.postMessage({
				level: "INFO",
				text: "Ending Request"
			});
			endRequest(msg.group_jid);
		} else if (msg.type === "send_media") {
			logging.postMessage({
				level: "INFO",
				text: "Sending Media"
			});
			msg.msg_id = msg.msg_id ? msg.msg_id : null;
			send_media(msg.to, msg.url, msg.text, msg.msg_id, msg.content_type);
		} else if (msg.type === "kick_all") {
			logging.postMessage({
				level: "INFO",
				text: "Kicking all members " + msg.group_jid
			});
			setTimeout(kick_all, 10000, msg.group_jid);
			//kick_all(msg.group_jid);
		} else if (msg.type === "update_title") {
			logging.postMessage({
				level: "INFO",
				text: "Updating title for " + msg.group_jid
			});
			update_title(msg.group_jid, msg.title);
		} else if (msg.type === "lobby_create") {
			logging.postMessage({
				level: "INFO",
				text: "Creating Group "
			});
			// CREATE GROUP
			lobby_create();
		} else if (msg.type === "group_invite") {
			logging.postMessage({
				level: "INFO",
				text: "Inviting members"
			});
			group_invite(msg.jid, msg.members);
		}
	});
	return api;
}
function getContacts(api) {
	Store.Contact.models.push = function(item) {
		Array.prototype.push.call(this, item);
		this.onPush(item);
	};
	Store.Contact.models.onPush = (cntact) => {
		api.postMessage({
			type: "contact",
			contact: cntact
		});
	};
}

function getGroups(api, logging) {
	Store.GroupMetadata.models.forEach((group) => {
		Store.GroupMetadata.find(group.id).then((grp) => {
			var jid = grp.id;
			api.postMessage({
				type: "group",
				id: group.id,
				members: grp.participants.models
			});
		});
	});
	Store.GroupMetadata.models.push = function(item) {
		Array.prototype.push.call(this, item);
		this.onPush(item);
	};
	Store.GroupMetadata.models.onPush = (group) => {
		console.log(group);
		Store.GroupMetadata.find(group.id).then((group) => {
			var jid = group.id;
			Store.Chat.find(jid).then((chat) => {
				if (chat.title() === "new_lobby") {
					api.postMessage({
						type: "new_lobby",
						jid: jid
					});
				}
			});
			group.participants.models.push = function(item) {
				Array.prototype.push.call(this, item);
				this.onPush(item);
			};
			group.participants.models.onPush = (grpMember) => {
				logging.postMessage({
					level: "INFO",
					text: "New Member joined while running"
				});
				api.postMessage({
					type: "group_update",
					id: jid,
					member: grpMember
				});
			};
			api.postMessage({
				type: "group",
				id: group.id,
				members: group.participants.models
			});
		});
	};
}

function init() {
	Store = _requireById(store_id).default;
	console.log(Store);
	var logging = chrome.runtime.connect(extensionID, {
		name: "logging"
	});
	var api = apiChannel(logging);
	logging.postMessage({
		level: "INFO",
		text: "Injecting Script"
	});
	getContacts(api);
	getGroups(api, logging);
	Store.Msg.models.push = function(item) {
		Array.prototype.push.call(this, item);
		this.onPush(item);
	};
	var start_time = new Date();
	logging.postMessage({
		level: "INFO",
		text: "Bot Started"
	});
	Store.Msg.models.onPush = function(item) {
		if (!item.id.fromMe) {
			var message_time = new Date(item.t * 1000);
			var jid = getJid(item);
			if (message_time > start_time) {
				item.chat.sendSeen();
				if (!item.isMedia) {
					api.postMessage({
						type: "message",
						isG: item.isGroupMsg,
						isM: item.isMedia,
						object: item,
						name: item.senderObj.pushname
					});
				} else {
					item.downloadMedia().then(() => {
						api.postMessage({
							type: "message",
							isG: item.isGroupMsg,
							isM: item.isMedia,
							object: item,
							mediaUrl: item.mediaData.renderableUrl,
							name: item.senderObj.pushname
						});
					});
				}
			}
		}
	};
}

setTimeout(function() {
	init();
}, 7000);
