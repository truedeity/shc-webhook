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
            console.log(req.body);
            if (req.body && req.body.result) {
                var data = req.body.result;
                if (data.metadata.intentId == "1fb8cef5-5bb0-4501-bf6f-f47f408b5cd8") {
                    var pinNumber = data.parameters["pin-number"];
                    if (pinNumber) {
                        var welcomeIntent = new ApiAiWelcomeIntent(pinNumber, req.body.sessionId);
                        console.log(JSON.stringify(welcomeIntent));
                        if (!WebhookServer.apiAiWelcomeMessages.find(function (m) { return m.sessionId == req.body.sessionId; })) {
                            console.log("adding item");
                            WebhookServer.apiAiWelcomeMessages.push(welcomeIntent);
                        }
                    }
                    return res.json({
                        speech: "Good day!  Can you tell me some of the patients vitals?  (For example: heart rate)",
                        displayText: "Good day!  Can you tell me some of the patients vitals?  (For example: heart rate)",
                        source: "shc-webhook"
                    });
                }
                else {
                    var sessionId = req.body.sessionId;
                    console.log(sessionId);
                    console.log(WebhookServer.apiAiWelcomeMessages.length);
                    var welcomeMessage = WebhookServer.apiAiWelcomeMessages.find(function (m) { return m.sessionId == sessionId; });
                    console.log(welcomeMessage);
                    if (welcomeMessage && welcomeMessage.pinNumber) {
                        if (WebhookServer.connectedClients.length > 0) {
                            var client = WebhookServer.connectedClients.find(function (s) { return s.pinNumber == welcomeMessage.pinNumber; });
                            console.log(client);
                            if (client && client.socket && client.socket.connected) {
                                client.socket.emit("api-ai-message", JSON.stringify(req.body));
                            }
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
                console.log("pin");
                console.log(message);
                var client = new ConnectedClient(message, socket.id, socket);
                index = WebhookServer.connectedClients.push(client);
                socket.emit("pin-accepted", socket.id);
            });
            socket.on('disconnect', function () {
                WebhookServer.connectedClients = WebhookServer.connectedClients.splice(index, 1);
            });
        });
    };
    //private activeSocket :SocketIO.Socket; 
    WebhookServer.apiAiWelcomeMessages = [];
    WebhookServer.connectedClients = [];
    return WebhookServer;
}());
exports.WebhookServer = WebhookServer;
