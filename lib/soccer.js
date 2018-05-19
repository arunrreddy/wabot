module.exports = {
    init: (port, log, db) => {
        const axios = require("axios");
        var base_url = "http://mobilews.365scores.com/Data/Games/?lang=10&AppType=2&uc=124&usc=124&tz=24&countries=&competitions=321,549,5447,7,5096,8,6346,5930,11,13,15,472,572,573,639&competitors=480,224,225,226,227,341,8346,331&FullCurrTime=true&onlyvideos=false&withExpanded=true&startdate=";
        var _ = require('underscore');
		var later = require('later');
        var lodash = require('lodash');
        var helpers = require('./helpers.js');
        var cron = require('node-cron');
        var moment = require('moment');
        var group = require('../db/group.js');
        var api = port;
        var bugout = log;
        var last_uid = null;
        var date_format = "DD/MM/YYYY";
        var keys = [];
        var game_url = null;
		var interval_365;
		var interval_reddit;
		var config = require("./config.js");
        /*
          var games = {
             game_id: {
                home: "HomeTeam",
                away: "AwayTeam",
                seq: 0,
                found_goal: false,
                seen: [],
                subscribed: []
             }
          }
          */
        var games = {};


        function setup_games_today() {
				clearInterval(interval_reddit);
				clearInterval(interval_365);
            var today = moment().format(date_format);
            var future = moment(today, date_format).add(1, "days");
            game_url = base_url + today + "&enddate=" + future.format(date_format);
            axios.get(game_url)
                .then(response => {
                    function getComp(comp) {
                        switch (comp) {
                            case 11:
                                return "La Liga";
                            case 7:
                                return "Premier League";
                            case 572:
                                return "UEFA Champions League";
                            default:
                                return comp;
                        }
                    }
                    response.data.Games.forEach((game) => {
                        games[game.ID] = {
                            home: game.Comps[0].Name,
                            home_b: game.Comps[0].SName ? game.Comps[0].SName : game.Comps[0].Name,
                            away: game.Comps[1].Name,
                            away_b: game.Comps[1].SName ? game.Comps[1].SName : game.Comps[1].Name,
                            seq: 0,
                            found_goal: false,
                            time: moment(game.STime, "DD-MM-YYYY HH:mm"),
                            competition: getComp(game.Comp),
                            seen: [],
                            subscribed: [],
							goals: [],
							events: []
                        };
                    });
                    keys = lodash.keys(games).map((key) => {
						return [key, games[key].time];
					});
					bugout.log(keys);
				keys = lodash.sortBy(keys, (o) => {
				  return o[1];
				});
				bugout.log(keys);
				keys = keys.map((key) => {
				  return key[0];
				});
				bugout.log(keys);
                    bugout.log(games);
                    interval_reddit = setInterval(find_goals, 3000);
                    interval_365 = setInterval(get_games, 6000);
                    //send_games_today();
                });
        };

        function send_games_today() {
            // send games
            var text = "Upcoming Games: ";
            for (var i = 0; i < keys.length; i++) {
				text = text + "\n" + (i + 1) + "- *" + games[keys[i]].home + "* vs. *" + games[keys[i]].away + "*\n\t ```" + games[keys[i]].time + "```";
            }
            text = text + "\n Send !soccer _number_ to subscribe";
				group.getGroups(db).then((rows) => {
					rows.forEach((row) => {
						helpers.sendMessage(api, text, row.jid, null);
					});
				});

        };
        function contains(string, array) {
            var found = false;
            array.forEach((substring) => {
                if (string.includes(substring)) {
                    found = true;
                }
            });
            return found;
        }

        function find_goals() {
            axios.get("https://www.reddit.com/r/soccer/new.json?limit=50")
                .then(response => {
                    var unfiltered = response.data.data.children;
                    var posts = _.filter(unfiltered, function(element) {
                        return (element.data.author === "gemifra" || element.data.author === "paicmhsc" || element.data.author === "HerbalDreamin" || element.data.author === "Meladroit1" || element.data.author === "Adnell" || element.data.author === "goonerlenny" || element.data.author === "PradaBoyDave" || element.data.author === "ennuihenry14");
                    });
					posts = lodash.reverse(posts);
                    keys.forEach((key) => {
                        posts.forEach((post) => {
                            post.data.title = lodash.deburr(post.data.title);
                            if (contains(post.data.title, [games[key].home, games[key].home_b, games[key].away, games[key].away_b])) {
                                var regex = /.?(\d)\W*-\W*(\d).?/;
                                var match = regex.exec(post.data.title);
                                if (match !== null) {
                                    var sum = parseInt(match[1]) + parseInt(match[2]);
                                    if (games[key].seq < sum) {
                                        games[key].found_goal = true;
                                        games[key].seq++;
										var goal_details = {
												url: post.data.url,
												title: post.data.title,
												unsup: false
										};
                                        if (post.data.url.includes("flixtc")) {
                                            var httpRequest = new XMLHttpRequest();
                                            httpRequest.open('GET', post.data.url);
                                            httpRequest.onload = function() {
                                                if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                                                    var url = httpRequest.responseXML.getElementsByTagName("source")[0].src;
                                                    var args = {
                                                        "apikey": config.cc_key,
                                                        "inputformat": "mp4",
                                                        "outputformat": "mp4",
                                                        "input": "download",
                                                        "file": url,
                                                        "wait": true,
                                                        "download": false
                                                    };
                                                    axios.post("https://api.cloudconvert.com/convert", args)
                                                        .then(response => {
                                                            if (response.data.step === 'finished') {
																goal_details.url = "https:" + response.data.output.url;
																games[key].goals.push(goal_details);
																helpers.handleMultipleMedia(api, "https:" + response.data.output.url, games[key].subscribed, post.data.title, null);
                                                            }
                                                        });
                                                }
                                            };
                                            httpRequest.responseType = "document";
                                            httpRequest.send();
                                        } else if (post.data.url.includes("streamable")) {
                                            var regex = /(.*)streamable\.com\/(\w*)/;
                                            var result = regex.exec(post.data.url);
                                            var video_id = result[2];
                                            var httpRequest = new XMLHttpRequest();
                                            httpRequest.open('GET', "https://api.streamable.com/videos/" + video_id);
                                            httpRequest.onload = function() {
                                                if (this.status == 200) {
                                                    var result = JSON.parse(this.responseText);
                                                    var url = "https:" + result.files["mp4"].url;
													goal_details.url = url;
													games[key].goals.push(goal_details);
													helpers.handleMultipleMedia(api, url, games[key].subscribed, post.data.title, null);
                                                }
                                            };
                                            httpRequest.send();
                                        } else if (post.data.url.includes("pomfe")) {
                                            bugout.log("[SOCCER_DEBUG]: pomfe link goal");
                                            bugout.log(post.data);
											goal_details.url = post.data.url;
											games[key].goals.push(goal_details);
											helpers.handleMultipleMedia(api, post.data.url, games[key].subscribed, post.data.title, null);
                                        } else if (post.data.url.includes("clippit")) {
                                            var regex = /(.*)clippituser\.tv\/c\/(\w*)/
                                            var result = regex.exec(post.data.url);
                                            var video_id = result[2];
                                            var url = "https://clips.clippit.tv/" + video_id + "/720.mp4";
                                            var httpRequest = new XMLHttpRequest();
                                            httpRequest.open('GET', url);
                                            httpRequest.onload = function() {
                                                if (this.status == 200) {
															goal_details.url = url;
															games[key].goals.push(goal_details);
														helpers.handleMultipleMedia(api, url, games[key].subscribed, post.data.title, null);
                                                } else {
                                                    games[key].found_goal = false;
                                                    games[key].seq--;
                                                }
                                            };
                                            httpRequest.send();
                                        } else if (post.data.url.includes("streamja")) {
                                            var httpRequest = new XMLHttpRequest();
                                            httpRequest.open('GET', post.data.url);
                                            httpRequest.onload = function() {
                                                if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                                                    var url = httpRequest.responseXML.getElementsByTagName("source")[0].src;
                                                    var args = {
                                                        "apikey": config.cc_key,
                                                        "inputformat": "mp4",
                                                        "outputformat": "mp4",
                                                        "input": "download",
                                                        "file": url,
                                                        "wait": true,
                                                        "download": false
                                                    };
                                                    axios.post("https://api.cloudconvert.com/convert", args)
                                                        .then(response => {
                                                            if (response.data.step === 'finished') {
																goal_details.url = "https:" + response.data.output.url;
																games[key].goals.push(goal_details);
																helpers.handleMultipleMedia(api, "https:" + response.data.output.url, games[key].subscribed, post.data.title, null);
                                                            }
                                                        });
												}
											} 
                                            httpRequest.responseType = "document";
                                            httpRequest.send();
                                        } else {
												bugout.log("[SOCCER_DEBUG]: UNKNOWN PROVIDER");
												var text = "Unknown video provider\n" + post.data.url + "\n" + post.data.title;
													games[keys].subscribed.forEach((jids) => {
														helpers.sendMessage(api, text, jids, null);
													});
												bugout.log(post.data.url);
												goal_details.unsup = true;
												games[key].goals.push(goal_details);
										}
                                    } else {
                                        //Old Goal
                                    }
                                }
                            }
                        });
                    });
                });
        };

        function get_games() {
            if (last_uid) {
                axios.get(game_url + "&uid=" + last_uid)
                    .then(response => {
                        last_uid = response.data.LastUpdateID;
                        if (response.data.Notifications) {
                            response.data.Notifications.forEach((notification) => {
                                if (notification.EntID in games) {
                                    if (_.indexOf(games[notification.EntID].seen, notification.ID) < 0) {
                                        games[notification.EntID].seen.push(notification.ID);
                                        switch (notification.Type) {
                                            case 9:
                                                {
                                                    var text = "🔔 - " + notification.Params[0].Value + " *" + games[notification.EntID].home + " vs " + games[notification.EntID].away + "*";
													games[notification.EntID].events.push(text);
                                                    games[notification.EntID].subscribed.forEach((jids) => {
                                                        helpers.sendMessage(api, text, jids, null);
                                                    });
                                                    break;
                                                }
                                            case 10:
                                                {
                                                    games[notification.EntID].found_goal = false;
                                                    var text = "⚽ - " + notification.Params[1].Value + "'  " + games[notification.EntID].home + " " + notification.Params[3].Value + "-" + notification.Params[4].Value + " " + games[notification.EntID].away;
													games[notification.EntID].events.push(text);
                                                    games[notification.EntID].subscribed.forEach((jids) => {
                                                        helpers.sendMessage(api, text, jids, null);
                                                    });
                                                    break;
                                                }
                                            case 11:
                                                {
                                                    var text = "📒 - " + notification.Params[1].Value + "' " + notification.Params[2].Value + " *" + games[notification.EntID].home + " vs " + games[notification.EntID].away + "*";
													games[notification.EntID].events.push(text);
                                                    games[notification.EntID].subscribed.forEach((jids) => {
                                                        helpers.sendMessage(api, text, jids, null);
                                                    });
                                                    break;
                                                }
                                            case 12:
                                                {
                                                    var text = "📕- " + notification.Params[2].Value + " *" + games[notification.EntID].home + " vs " + games[notification.EntID].away + "*";
													games[notification.EntID].events.push(text);
                                                    games[notification.EntID].subscribed.forEach((jids) => {
                                                        helpers.sendMessage(api, text, jids, null);
                                                    });
                                                    break;
                                                }
                                            case 32:
                                                {
                                                    var text = "🔔 Game Started - *" + games[notification.EntID].home + " vs " + games[notification.EntID].away + "*";
													games[notification.EntID].events.push(text);
                                                    games[notification.EntID].subscribed.forEach((jids) => {
                                                        helpers.sendMessage(api, text, jids, null);
                                                    });
                                                    break;
                                                }
                                            case 33:
                                                {
                                                    var text = "🔔 Game Ended - *" + games[notification.EntID].home + " vs " + games[notification.EntID].away + "*";
                                                    games[notification.EntID].subscribed.forEach((jids) => {
                                                        helpers.sendMessage(api, text, jids, null);
                                                    });
                                                    break;
                                                }
                                            default:
                                                {
                                                    bugout.log("[UNKNOWN NOTIFICATION]");
													helpers.sendMessage(api, JSON.stringify(response.data), config.admin_jid, null);
                                                    bugout.log(response.data);
                                                    break;
                                                }


                                        }

                                    }
                                }
                            });
                        }
                    }).catch((error) => {
						bugout.log(error);	
					});
            } else {
                axios.get(game_url)
                    .then(response => {
                        last_uid = response.data.LastUpdateID;
                    });
            }
        }
        setTimeout(setup_games_today, 10000);
		var cron = '00 06 * * ? *';
		var s = later.parse.cron(cron);
		bugout.log(later.schedule(s).next(10));
		later.setInterval(setup_games_today, s);
        return {
            subscribe: (message, index) => {
                index = index - 1;
                if (index >= 0 && index < keys.length) {
                    games[keys[index]].subscribed.push(message.object.from);
                    games[keys[index]].subscribed = lodash.uniq(games[keys[index]].subscribed);
                    helpers.sendMessage(api, "Subscribed to match #" + (index + 1), message.object.from, message.object.id.id);
                    bugout.log(games);
                } else {
                    helpers.sendMessage(api, "Invalid selection", message.object.from, message.object.id.id);
                }
            },
            list: (message) => {
					bugout.log(games);
                var text = "Upcoming Games: ";
                for (var i = 0; i < keys.length; i++) {
						text = text + "\n" + (i + 1) + "- *" + games[keys[i]].home + "* vs. *" + games[keys[i]].away + "*\n\t ```" + games[keys[i]].time.format("DD-MM-YYYY HH:mm") + "```";
                }
                text = text + "\n Send !soccer _number_ to subscribe";
                helpers.sendMessage(api, text, message.object.from, message.object.id.id);
            },
				get_goals: (message, index) => {
						index = index - 1;
						if (index >= 0 && index < keys.length) {
							var time = 1000;
							games[keys[index]].goals.forEach((goal) => {
								if (goal.unsup) {
										helpers.sendMessage(api, goal.title + "\n" + goal.url, message.object.from, message.object.id.id);	
								} else {
										setTimeout(helpers.sendMedia, time, api, goal.url, message.object.from, goal.title, message.object.id.id);
										time += 2000;
								}
							});
						} else {
							helpers.sendMessage(api, "Invalid selection", message.object.from, message.object.id.id);
						}
				}, 
				get_events: (message, index) => {
						index = index - 1;
						if (index >= 0 && index < keys.length) {
								var text = "*" + games[keys[index]].home + " vs. " + games[keys[index]].away + "*";
								games[keys[index]].events.forEach((evt) => {
										text = text + "\n" + evt;	
								});
								helpers.sendMessage(api, text, message.object.from, message.object.id.id);
						} else {
							helpers.sendMessage(api, "Invalid selection", message.object.from, message.object.id.id);
						}
				} 
        };
    }
};
