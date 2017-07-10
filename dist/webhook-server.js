"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var bodyParser = require("body-parser");
var restService = express();
restService.use(bodyParser.json());
var server = http.createServer(restService);
var io = socketIo(server);
var WebhookServer = (function () {
    function WebhookServer() {
        this.startRestService();
        this.startSocketIO();
    }
    WebhookServer.prototype.startRestService = function () {
        var _this = this;
        restService.post("/hook", function (req, res) {
            if (req.body) {
                if (_this.activeSocket && _this.activeSocket.connected) {
                    //this will broadcast the message to all connected clients
                    //we need to change this to send the message to the specific client associated with the api.ai sessionId   
                    //pairing a client to a paticular api ai session id may be a little bit trickey.
                    _this.activeSocket.emit("api-ai-message", JSON.stringify(req.body));
                }
            }
            return res.json({
                sppech: "test",
                displayText: "test",
                source: "shc-webhook"
            });
        });
        restService.listen(process.env.PORT || 5000, function () { console.log("Server running..."); });
    };
    WebhookServer.prototype.startSocketIO = function () {
        var _this = this;
        io.on("connect", function (socket) {
            _this.activeSocket = socket;
        });
    };
    return WebhookServer;
}());
exports.WebhookServer = WebhookServer;
