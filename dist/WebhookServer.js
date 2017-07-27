"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var bodyParser = require("body-parser");
var util = require("util");
var app = express();
app.use(bodyParser.json());
var server2 = http.createServer(app).listen(process.env.PORT || 1337);
var io = socketIo(server2);
var ApiAiWelcomeIntent = (function () {
    function ApiAiWelcomeIntent(pinNumber, sessionId) {
        this.pinNumber = pinNumber;
        this.sessionId = sessionId;
    }
    return ApiAiWelcomeIntent;
}());
exports.ApiAiWelcomeIntent = ApiAiWelcomeIntent;
var ConnectedClient = (function () {
    function ConnectedClient(pinNumber, clientId, socket) {
        this.clientId = clientId;
        this.pinNumber = pinNumber;
        this.socket = socket;
    }
    ConnectedClient.prototype.sendMessage = function (event, message) {
        if (this.socket && this.socket.connected) {
            console.log("sending message to client" + this.socket.id);
            this.socket.emit(event, message);
            return true;
        }
        return false;
    };
    ConnectedClient.prototype.isConnected = function () {
        return this.socket && this.socket.connected;
    };
    return ConnectedClient;
}());
exports.ConnectedClient = ConnectedClient;
var WebhookServer = (function () {
    function WebhookServer() {
        this.startRestService();
        this.startSocketIO();
    }
    WebhookServer.prototype.startRestService = function () {
        var _this = this;
        app.get("/clients", function (req, res) {
            res.json(util.inspect(WebhookServer.connectedClients, false));
        });
        app.get("reset", function (req, res) {
            WebhookServer.connectedClients = [];
            WebhookServer.apiAiWelcomeMessages = [];
            res.json(util.inspect(_this));
        });
        app.get("/welcomeIntents", function (req, res) {
            res.json(WebhookServer.apiAiWelcomeMessages.length);
        });
        app.get("/lastWelcomeIntent", function (req, res) {
            res.json(util.inspect(WebhookServer.lastHookData, false));
        });
        app.post("/hook", function (req, res) {
            WebhookServer.lastHookData = req.body.sessionId;
            var speechMessage = "got it";
            if (req.body && req.body.result) {
                var data = req.body.result;
                if (data.metadata.intentId == "1fb8cef5-5bb0-4501-bf6f-f47f408b5cd8") {
                    var pinNumber = data.parameters["pin-number"];
                    if (pinNumber) {
                        var welcomeIntent = new ApiAiWelcomeIntent(pinNumber, req.body.sessionId);
                        if (!WebhookServer.apiAiWelcomeMessages.find(function (m) { return m.sessionId == req.body.sessionId; })) {
                            WebhookServer.apiAiWelcomeMessages.push(welcomeIntent);
                            speechMessage = "added welcome intent " + WebhookServer.apiAiWelcomeMessages.length;
                        }
                    }
                }
                else {
                    var sessionId = req.body.sessionId;
                    var welcomeMessage = WebhookServer.apiAiWelcomeMessages.find(function (m) { return m.sessionId == sessionId; });
                    if (welcomeMessage && welcomeMessage.pinNumber) {
                        if (WebhookServer.connectedClients.length > 0) {
                            var client = WebhookServer.connectedClients.find(function (s) { return s.pinNumber == welcomeMessage.pinNumber && s.isConnected(); });
                            if (client) {
                                client.sendMessage("api-ai-message", JSON.stringify(req.body));
                            }
                        }
                    }
                }
            }
            return res.json({
                //speech: speechMessage,
                //displayText: speechMessage,
                source: "shc-webhook"
            });
        });
    };
    WebhookServer.prototype.startSocketIO = function () {
        io.on("connect", function (socket) {
            socket.on("pin", function (message) {
                var client = new ConnectedClient(message, socket.id, socket);
                WebhookServer.connectedClients.push(client);
                socket.emit("pin-accepted", socket.id);
            });
            socket.on('disconnect', function () {
                var index = WebhookServer.connectedClients.findIndex(function (s) { return s.clientId == socket.id; });
                if (index != -1) {
                    WebhookServer.connectedClients.splice(index, 1);
                }
            });
        });
    };
    WebhookServer.apiAiWelcomeMessages = [];
    WebhookServer.connectedClients = [];
    WebhookServer.lastHookData = {};
    return WebhookServer;
}());
exports.WebhookServer = WebhookServer;
