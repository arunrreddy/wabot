var util = require('util');
var eventEmitter = require('events').EventEmitter;
var exports = module.exports = {};

function handler() {
    if (false === (this instanceof handler)) {
        return new handler();
    }
    var self = this;
    self.handlers = {};
};

util.inherits(handler, eventEmitter);

handler.prototype.addHandler = function(jid, handlerFunc) {
    var self = this;
    self.handlers[jid] = handlerFunc;
};
handler.prototype.getHandler = function(jid) {
    var self = this;
    if (self.handlers.hasOwnProperty(jid)) {
        return self.handlers[jid];
    }
    return null;

};
handler.prototype.deleteHandler = function(jid) {
    var self = this;
    delete self.handlers[jid];
    if (isEmptyObject(self.handlers)) {
        self.emit('handlersEmpty');
    }
};

function isEmptyObject(obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false; //Not empty
        }
    }
    return true; //Empty
}

exports.Handler = handler;
