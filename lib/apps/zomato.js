var handlerObject = require('../handlerObject.js').Handler;
var events = require('events').EventEmitter;
var helpers = require('../helpers.js');
var _ = require('underscore');
var config = require('../config.js');

var app_name = "zomato";
module.exports = {
    name: () => {
        return app_name;
    },
    description: () => {
        return "Application Description";
    },
    init: (port, database, group_jid, args, bugout, user_jid) => {
        var bugout = bugout;
        var api = port;
        var handler = new handlerObject();
        var event_emitter = new events();
        var group_jid = group_jid;
        var user_jid = user_jid;
        var city_id = 0;
        var key = config.zomato_key;
        var url = "https://developers.zomato.com/api/v2.1/";
        var app_states = {
            Entry: 1,
            Get_Cuisine: 2
        };
        var current_state = app_states.Entry; // Set state
        handler.on('handlersEmpty', () => {
            switch (current_state) {
                case app_states.Entry:
                    {
                        getCuisine();
                        break;
                    }
                case app_states.Get_Cuisine:
                    {
                        event_emitter.emit("quit", user_jid);
                        break;
                    }
            }
        });

        function getCuisine() {
            current_state = app_states.Get_Cuisine;
            var request = new XMLHttpRequest();
            request.open("GET", url + "cuisines?city_id=" + city_id);
            request.setRequestHeader("user-key", key);
            request.onload = function() {
                if (this.status == 200) {
                    var result = JSON.parse(this.responseText);
                    var status = (result.cuisines.length > 0) ? true : false;
                    if (status) {
                        var found_cuisines = result.cuisines;
                        console.log(found_cuisines);
                        var handler_function = (jid, message) => {
                            var elements = message.object.body.split(" ");
                            var re = /^[1-9]\d?$/;
                            var test = elements.every((el) => {
                                return re.test(el);
                            });

                            console.log(elements);
                            if (test) {
                                var query_string = "";
                                elements.forEach((el) => {
                                    var index = parseInt(el);
                                    if ((index-1) < found_cuisines.length) {
                                        query_string = query_string + found_cuisines[index-1].cuisine.cuisine_id + ",";
                                    } else {
                                        helpers.sendMessage(api, "Error: " + index + " doesn't exist", group_jid, message.object.id.id);
                                    }
                                    query_string = query_string.slice(0,-1);
                                    console.log(query_string);
                                    handler.deleteHandler(jid);
                                });
                            } else {
                                helpers.sendMessage(api, "Pick the cuisines by number", group_jid, message.object.id.id);
                            }
                        };
                        var text = "Here are the cuisines:\n";
                        var j = -1;
                        for (var i = 0; i < found_cuisines.length; i++) {
                            if (j == 1) {
                                j = 0;
                                text = text + "\n  " + (i+1) + " - " + found_cuisines[i].cuisine.cuisine_name;
                            } else {
                                text = text + "  " + (i+1) + " - " + found_cuisines[i].cuisine.cuisine_name;
                                j++;
                            }
                        }
                        helpers.sendMessage(api, text, group_jid, null);
                        handler.addHandler(user_jid, handler_function);
                    } else {
                        helpers.sendMessage(api, "No Cuisines Exist", group_jid);
                    }
                }
            };
            request.send();
        }
        var handler_function = (jid, message) => {
            var request = new XMLHttpRequest();
            request.open("GET", url + "cities?q=" + message.object.body);
            request.setRequestHeader("user-key", key);
            request.onload = function() {
                if (this.status == 200) {
                    var result = JSON.parse(this.responseText);
                    var status = (result.status === "success") ? true : false;
                    if (status) {
                        var found_locations = (result.location_suggestions.length > 0) ? true : false;
                        if (found_locations) {
                            city_id = result.location_suggestions[0].id;
                            handler.deleteHandler(jid);
                        } else {
                            helpers.sendMessage(api, "Error finding city", group_jid, message.object.id.id);
                        }
                    }
                }
            };
            request.send();
        };
        handler.addHandler(user_jid, handler_function);
        // return closure for app manager
        var text = "Welcome to The Zomato App\n Please enter your city: ";
        helpers.sendMessage(api, text, group_jid, null);
        return {
            handle_message: (message) => {
                var jid = helpers.getUserJidFromMessage(message);
                var handlerFunction = handler.getHandler(jid);
                if (handlerFunction) {
                    // Handler exists
                    handlerFunction(jid, message);
                    return;
                } else return;
            },
            event_emitter: event_emitter,
            status: () => {
                return "Application Status";
            },
            help: () => {
                return "Application Help text";
            },
            name: () => {
                return app_name;
            }
        };
    }
};
