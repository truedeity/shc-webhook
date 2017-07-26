import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as socketIo from "socket.io";
import * as bodyParser from "body-parser";
import * as crypto from "crypto";
import * as fs from "fs";

import * as util from "util";

//import { ApiAiWelcomeIntent } from "./Models/ApiAiWelcomeIntent"
//import { ConnectedClient } from "./Models/ConnectedClient" ...


const app = express();
app.use(bodyParser.json())

// var options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.cert')
// };


const server = http.createServer(app).listen(5000);
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
        }
    }
}


export class WebhookServer {

    //private activeSocket :SocketIO.Socket; 
    private static apiAiWelcomeMessages: Array<ApiAiWelcomeIntent>;
    private static connectedClients: Array<ConnectedClient>;
    private static lastHookData: any;


    constructor() {

        this.startRestService();
        this.startSocketIO();


        if(!WebhookServer.apiAiWelcomeMessages) {
            WebhookServer.apiAiWelcomeMessages = [];
        }

        if(!WebhookServer.connectedClients) {
            WebhookServer.connectedClients = [];
        }   

         if(!WebhookServer.lastHookData) {
            WebhookServer.lastHookData = {};
        }   

    }

    startRestService() {

        app.get("/clients", (req, res) => {
            res.json(util.inspect(WebhookServer.connectedClients, false));
        });


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

                    console.log(sessionId);
                    console.log(WebhookServer.apiAiWelcomeMessages.length);

                    var welcomeMessage = WebhookServer.apiAiWelcomeMessages.find(m => m.sessionId == sessionId);

                    console.log(welcomeMessage);

                    if (welcomeMessage && welcomeMessage.pinNumber) {

                        if (WebhookServer.connectedClients.length > 0) {

                            var client = WebhookServer.connectedClients.find(s => s.pinNumber == welcomeMessage.pinNumber);

                            console.log(client);

                            if (client) {

                                client.sendMessage("api-ai-message", JSON.stringify(req.body));

                            }

                        }

                    }
                }
            }

            return res.json({
                speech: speechMessage,
                displayText: speechMessage,
                source: "shc-webhook"
            });
        })


    }


    startSocketIO() {

        io.on("connect", socket => {
            //this.activeSocket = socket;

            var index: number = -1;

            socket.on("pin", (message) => {

                console.log("pin");
                console.log(message);

                var client = new ConnectedClient(message, socket.id, socket);
                index = WebhookServer.connectedClients.push(client);

                socket.emit("pin-accepted", socket.id);

            })

            socket.on('disconnect', () => {
                console.log("dosconnecting... index: " + index)
                WebhookServer.connectedClients.splice(index - 1, 1);
            });

        })

    }


}