"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var bodyParser = require("body-parser");
//import { ApiAiWelcomeIntent } from "./Models/ApiAiWelcomeIntent"
//import { ConnectedClient } from "./Models/ConnectedClient"
var restService = express();
restService.use(bodyParser.json());
// var options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.cert')
// };
var server = http.createServer(restService).listen(5000);
var server2 = http.createServer(restService).listen(process.env.PORT || 1337);
var io = socketIo(server);
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
    return ConnectedClient;
}());
exports.ConnectedClient = ConnectedClient;
var WebhookServer = (function () {
    function WebhookServer() {
        this.startRestService();
        this.startSocketIO();
    }
    WebhookServer.prototype.startRestService = function () {
        restService.post("/hook", function (req, res) {
            if (req.body && req.body.result) {
                var data = req.body.result;
                if (data.contexts[0].name == "defaultwelcomeintent-followup") {
                    var welcomeIntent = new ApiAiWelcomeIntent(data, req.body.sessionId);
                    WebhookServer.apiAiWelcomeMessages.push(welcomeIntent);
                }
                else {
                    var sessionId = req.body.sessionId;
                    var welcomeMessage = WebhookServer.apiAiWelcomeMessages.find(function (m) { return m.sessionId == sessionId; });
                    if (welcomeMessage && welcomeMessage.pinNumber) {
                        var client = WebhookServer.connectedClients.find(function (s) { return s.pinNumber == welcomeMessage.pinNumber; });
                        if (client && client.socket && client.socket.connected) {
                            client.socket[client.clientId].emit("api-ai-message", JSON.stringify(req.body));
                        }
                    }
                }
            }
            return res.json({
                speech: "got it",
                displayText: "got it",
                source: "shc-webhook"
            });
        });
    };
    WebhookServer.prototype.startSocketIO = function () {
        io.on("connect", function (socket) {
            //this.activeSocket = socket;
            var index = -1;
            socket.on("pin", function (message) {
                var client = new ConnectedClient(message, socket.id, socket);
                index = WebhookServer.connectedClients.push(client);
            });
            socket.on('disconnect', function () {
                WebhookServer.connectedClients = WebhookServer.connectedClients.splice(index, 1);
            });
        });
    };
    return WebhookServer;
}());
exports.WebhookServer = WebhookServer;
