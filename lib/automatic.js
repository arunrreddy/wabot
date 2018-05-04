var helper = require('./helpers.js');
var contact = require('../db/contact.js');
module.exports = {
    init: (port, db, bugout) => {
        var api = port;
        var regexes = [
            {
                regex: /(clips\.)?twitch\.tv\/(\w+)(?:\/(?:(.)\/(\d+)|(\w+)))?/i,
                handler: (match, result) => {
                    helper.handleTwitchClip(api, match.object.from, result[2], match.object.id.id);
                }
            },
			{
				regex: /^(https?:\/\/)?(oddshot\.tv\/.*\/)([-\.\w\d])*\/?$/,
				handler: (match, result) => {
						var id = result[0].split("/").pop();
						helper.handleOddshot(api, match.object.from, id, match.object.id.id);
				}
			},
			{
				regex: /#memo/g,
				handler: (match, result) => {
						var jid = helper.getUserJidFromMessage(match);
						contact.addMemo(db, jid, match.object.body)	
				}
			},
			{
				regex: /(https?:\/\/(www\.)?)?instagram\.com(\/p\/\w+.\w+\/?)/,
				handler: (match, result) => {
						helper.handleInstagram(api, match.object.from, result[0], match.object.id.id);
				}
			},
			{
					regex: /(https?:\/\/(www\.)?)?alnoortv.co\/public\/video-detail\/(\d*)\/\w+/,

					handler: (match, result) => {
							helper.handleNoortv(api, match.object.from, result[3], match.object.id.id);
					}
			},
			{
					regex: /(.*)streamable\.com\/(\w*)/,
					handler: (match, result) => {
						helper.handleStreamable(api, match.object.from, result[2], match.object.id.id);
					}
			}
        ];
        return {
            process: (message) => {
                regexes.forEach((reg) => {
                    var result = reg.regex.exec(message.object.body);
                    if (result) {
                        reg.handler(message, result);
                    }
                });
            }
        };
    }
};
