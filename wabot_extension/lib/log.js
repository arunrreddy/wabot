module.exports = (bugout) => {
	chrome.runtime.onConnectExternal.addListener((port) => {
		if (port.name === "logging") {
			port.onMessage.addListener((msg) => {
				bugout.log("[" + msg.level + "]: " + msg.text);
			});
		}
	});
};
