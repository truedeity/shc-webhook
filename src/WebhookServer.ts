import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as socketIo from "socket.io";
import * as bodyParser from "body-parser";
import * as crypto from "crypto";
import * as fs from "fs";
import * as util from "util";


const app = express();
app.use(bodyParser.json())

const server2 = http.createServer(app).listen(process.env.PORT || 1337);
const io = socketIo(server2);

export class ApiAiWelcomeIntent {

    constructor(pinNumber: string, sessionId: string) {

        this.pinNumber = pinNumber;
        this.sessionId = sessionId;

    }

    public sessionId: string;
    public pinNumber: string;

}

export class ConnectedClient {

    private socket: SocketIO.Socket;

    constructor(pinNumber: string, clientId: string, socket: SocketIO.Socket) {

        this.clientId = clientId;
        this.pinNumber = pinNumber;
        this.socket = socket;
    }

    public clientId: string;
    public pinNumber: string;

    sendMessage(event: string, message: string) {
        if (this.socket && this.socket.connected) {
            console.log("sending message to client" + this.socket.id);
            this.socket.emit(event, message);
            return true;
        }
        return false;
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }
}


export class WebhookServer {

    private static apiAiWelcomeMessages: Array<ApiAiWelcomeIntent> = [];
    private static connectedClients: Array<ConnectedClient> = [];
    private static lastHookData: any = {};


    constructor() {

        this.startRestService();
        this.startSocketIO();

    }

    startRestService() {

        app.get("/clients", (req, res) => {
            res.json(util.inspect(WebhookServer.connectedClients, false));
        });

        app.get("reset", (req, res) => {
            WebhookServer.connectedClients = [];
            WebhookServer.apiAiWelcomeMessages = [];
            res.json(util.inspect(this));
        })


        app.get("/welcomeIntents", (req, res) => {
            res.json(WebhookServer.apiAiWelcomeMessages.length);
        });

        app.get("/lastWelcomeIntent", (req, res) => {
            res.json(util.inspect(WebhookServer.lastHookData, false));
        });


        app.post("/hook", (req, res) => {

            WebhookServer.lastHookData = req.body.sessionId;

            var speechMessage: string = "got it";

            if (req.body && req.body.result) {

                var data = req.body.result;

                if (data.metadata.intentId == "1fb8cef5-5bb0-4501-bf6f-f47f408b5cd8") {

                    var pinNumber = data.parameters["pin-number"];

                    if (pinNumber) {

                        var welcomeIntent = new ApiAiWelcomeIntent(pinNumber, req.body.sessionId);

                        if (!WebhookServer.apiAiWelcomeMessages.find(m => m.sessionId == req.body.sessionId)) {

                            WebhookServer.apiAiWelcomeMessages.push(welcomeIntent);

                            speechMessage = "added welcome intent " + WebhookServer.apiAiWelcomeMessages.length;
                        }

                    }

                } else {

                    var sessionId: string = req.body.sessionId;

                    var welcomeMessage = WebhookServer.apiAiWelcomeMessages.find(m => m.sessionId == sessionId);

                    if (welcomeMessage && welcomeMessage.pinNumber) {

                        if (WebhookServer.connectedClients.length > 0) {

                            var client = WebhookServer.connectedClients.find(s => s.pinNumber == welcomeMessage.pinNumber && s.isConnected());

                            if (client) {

                                client.sendMessage("api-ai-message", JSON.stringify(req.body))

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
        })


    }

    startSocketIO() {

        io.on("connect", socket => {

            socket.on("pin", (message) => {

                var index = WebhookServer.connectedClients.findIndex(s => s.clientId == socket.id);

                if (index == -1) {

                    var client = new ConnectedClient(message, socket.id, socket);

                    WebhookServer.connectedClients.push(client);

                    socket.emit("pin-accepted", socket.id);

                } else {

                    var client = new ConnectedClient(message, socket.id, socket);

                    WebhookServer.connectedClients[index] = client;
                    
                }

            })

            socket.on('disconnect', () => {
                var index = WebhookServer.connectedClients.findIndex(s => s.clientId == socket.id);
                if (index != -1) {
                    WebhookServer.connectedClients.splice(index, 1);
                }
            });

        })

    }


}