var schemaBuilder = require('./db/connector.js');
var contact = require('./db/contact.js');
var group = require('./db/group.js');
var helper = require('./lib/helpers.js');
var reddit = require('./lib/reddit.js')();
var codebird = require('codebird');
var cb = new codebird;
var _ = require("lodash");
var debugout = require('./lib/debugout.js');
var bugout = new debugout();
const axios = require("axios");
var Socket = require('phoenix').Socket;
var config = require('./lib/config.js');
bugout.useTimestamps = true;
bugout.useLocalStorage = true;
require('./lib/log.js')(bugout);
// Initialise Database
var whitelist = config.whitelist; 
var local = chrome.runtime.connectNative('wa');
local.onMessage.addListener((msg) => {
		console.log(msg);
});

local.onDisconnect.addListener(() =>{
		console.log("disconnect");
});
local.postMessage({text: "Test"});
local.postMessage({text: "Test"});
schemaBuilder.connect().then((db) => {
    chrome.runtime.onConnectExternal.addListener((port) => {
        if (port.name === "api" && port.sender.url === "https://web.whatsapp.com/") {
            var emotes = require('./lib/emotes.js').init(port, bugout);
            var gm = require('./lib/gm.js').init(db, port, bugout);
            var app_manager = require('./lib/app_manager.js').init(port, db, bugout);
            var command_handler = require('./lib/commands/commandList.js').init(db, port, gm, app_manager, bugout);
            var jobs = require('./lib/jobs.js')(port, bugout);
            var automatic = require('./lib/automatic.js').init(port, db, bugout);
            port.onMessage.addListener((msg) => {
                if (msg.type === "message") {
                    var jid = helper.getUserJidFromMessage(msg);
                    if (!msg.isM) {
                        if (msg.isG) {
                            bugout.log("[MESSAGE_G - " + msg.object.from + " - " + jid + "]: " + msg.object.body);
                        } else {
                            bugout.log("[MESSAGE - " + jid + "]: " + msg.object.body);
                        }
                    }
                    emotes.process(msg);
                    automatic.process(msg);
                    gm.handleMessage(msg);
                    app_manager.handle_message(msg);
                    command_handler.handleMessage(msg);
                    // Mentions
                    if (msg.object.mentionedJidList) {
                        helper.handleMentions(db, port, msg);
                    }
                } else if (msg.type === "contact") {
                    // Contacts
                    contact.addContact(db, msg.contact.id);
                } else if (msg.type === "group") {
                    // Groups
                    if (whitelist.indexOf(msg.id) == -1) {
                        port.postMessage({
                            type: "leave_group",
                            jid: msg.id
                        });
                        group.deleteGroup(db, msg.id, bugout);
                    } else {
                        // jobs.initTil(msg.id, reddit);
                        group.addGroup(db, msg);
                    }
                } else if (msg.type === "group_update") {
                    if (whitelist.indexOf(msg.id) == -1) {
                        port.postMessage({
                            type: "leave_group",
                            jid: msg.id
                        });
                        group.deleteGroup(db, msg.id);
                    } else {
                        group.addGroupMember(db, msg.id, msg.member);
                    }
                }
            });
        }
    });
});
