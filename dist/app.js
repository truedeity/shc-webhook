"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app = require("./webhook-server");
var Server = (function () {
    function Server() {
    }
    Server.Start = function () {
        return new app.WebhookServer();
    };
    return Server;
}());
exports.Server = Server;
Server.Start();
