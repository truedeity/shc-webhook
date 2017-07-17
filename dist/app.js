"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app = require("./WebhookServer");
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
