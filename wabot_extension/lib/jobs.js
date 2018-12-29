var cron = require("node-cron");
module.exports = (port, log) => {
	var api = port;
	var bugout = log;
	return {
		initTil: (groupID, reddit) => {
			cron.schedule("0 */12 * * *", () => {
				bugout.log("[DEBUG]: TIL firing");
				reddit.sendTIL(api, groupID);
			});
		}
	};
};
