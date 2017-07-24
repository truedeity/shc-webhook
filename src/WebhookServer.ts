import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as socketIo from "socket.io";
import * as bodyParser from "body-parser";
import * as crypto from "crypto";
import * as fs from "fs";
//import { ApiAiWelcomeIntent } from "./Models/ApiAiWelcomeIntent"
//import { ConnectedClient } from "./Models/ConnectedClient"


const restService = express();
restService.use(bodyParser.json())

// var options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.cert')
// };


const server = http.createServer(restService).listen(5000);
const server2 = http.createServer(restService).listen(process.env.PORT || 1337);

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
    constructor(pinNumber: string, clientId: string, socket: SocketIO.Socket) {

        this.clientId = clientId;
        this.pinNumber = pinNumber;
        this.socket = socket;
    }
    public clientId: string;
    public pinNumber: string;
    public socket: SocketIO.Socket;
}


export class WebhookServer {

    //private activeSocket :SocketIO.Socket; 
    private static apiAiWelcomeMessages: Array<ApiAiWelcomeIntent> = [];
    private static connectedClients: Array<ConnectedClient> = [];


    constructor() {

        this.startRestService();
        this.startSocketIO();



    }

    startRestService() {

        restService.post("/hook", (req, res) => {

            console.log(req.body);

            if (req.body && req.body.result) {

                var data = req.body.result;

                if (data.metadata.intentId == "1fb8cef5-5bb0-4501-bf6f-f47f408b5cd8") {

                    var pinNumber = data.parameters["pin-number"];

                    if (pinNumber) {

                        var welcomeIntent = new ApiAiWelcomeIntent(pinNumber, req.body.sessionId);

                        console.log(JSON.stringify(welcomeIntent));

                        if (!WebhookServer.apiAiWelcomeMessages.find(m => m.sessionId == req.body.sessionId)) {
                            console.log("adding item")
                            WebhookServer.apiAiWelcomeMessages.push(welcomeIntent);

                        }

                    }

                    return res.json({
                        speech: "Good day!  Can you tell me some of the patients vitals?  (For example: heart rate)",
                        displayText: "Good day!  Can you tell me some of the patients vitals?  (For example: heart rate)",
                        source: "shc-webhook"
                    })

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
            })
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
                WebhookServer.connectedClients = WebhookServer.connectedClients.splice(index, 1);
            });

        })

    }


}