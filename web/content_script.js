function injectVariables(variables, tag) {
	var node = document.getElementsByTagName(tag)[0];
	var script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	console.log("[Info]: Injecting variables");
	for (var i = 0; i < variables.length; i++) {
		script.textContent =
			"var " +
			variables[i].name +
			" = " +
			JSON.stringify(variables[i].value) +
			";";
	}
	node.appendChild(script);
}
function injectScript(file_path, tag) {
	var node = document.getElementsByTagName(tag)[0];
	var script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", file_path);
	node.appendChild(script);
}

injectVariables([{name: "extensionID", value: chrome.runtime.id}], "body");
injectScript(chrome.extension.getURL("web/inject.js"), "body");

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (message.type === "media_url") {
		var x = new XMLHttpRequest();
		x.open("GET", message.url, true);
		x.responseType = "blob";
		x.onload = function() {
			if (this.status == 200) {
				var myurl = window.URL.createObjectURL(this.response);
				console.log(myurl);
				sendResponse({
					type: "media_success",
					url: myurl
				});
			} else {
				sendResponse({
					type: "media_fail"
				});
			}
		};
		x.send();
	} else if (message.type === "nor") {
		chrome.tabs.create({url: message.url});
	}
	return true;
});
