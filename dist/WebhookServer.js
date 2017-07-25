"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var bodyParser = require("body-parser");
var util = require("util");
//import { ApiAiWelcomeIntent } from "./Models/ApiAiWelcomeIntent"
//import { ConnectedClient } from "./Models/ConnectedClient"
var app = express();
app.use(bodyParser.json());
// var options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.cert')
// };
var server = http.createServer(app).listen(5000);
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
        }
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
        app.get("/clients", function (req, res) {
            res.json(util.inspect(WebhookServer.connectedClients, false));
        });
        app.get("/welcomeIntents", function (req, res) {
            res.json(util.inspect(WebhookServer.apiAiWelcomeMessages, false));
        });
        app.get("/lastWelcomeIntent", function (req, res) {
            res.json(util.inspect(WebhookServer.lastHookData, false));
        });
        app.post("/hook", function (req, res) {
            WebhookServer.lastHookData = JSON.stringify(req.body);
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
                    console.log(sessionId);
                    console.log(WebhookServer.apiAiWelcomeMessages.length);
                    var welcomeMessage = WebhookServer.apiAiWelcomeMessages.find(function (m) { return m.sessionId == sessionId; });
                    console.log(welcomeMessage);
                    if (welcomeMessage && welcomeMessage.pinNumber) {
                        if (WebhookServer.connectedClients.length > 0) {
                            var client = WebhookServer.connectedClients.find(function (s) { return s.pinNumber == welcomeMessage.pinNumber; });
                            console.log(client);
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
                console.log("dosconnecting... index: " + index);
                WebhookServer.connectedClients.splice(index - 1, 1);
            });
        });
    };
    //private activeSocket :SocketIO.Socket; 
    WebhookServer.apiAiWelcomeMessages = [];
    WebhookServer.connectedClients = [];
    WebhookServer.lastHookData = {};
    return WebhookServer;
}());
exports.WebhookServer = WebhookServer;
