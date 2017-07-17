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

            if (req.body && req.body.result) {

                var data = req.body.result;

                if (data.contexts[0].name == "defaultwelcomeintent-followup") {

                    var welcomeIntent = new ApiAiWelcomeIntent(data, req.body.sessionId);

                    WebhookServer.apiAiWelcomeMessages.push(welcomeIntent);

                } else {

                    var sessionId: string = req.body.sessionId;

                    var welcomeMessage = WebhookServer.apiAiWelcomeMessages.find(m => m.sessionId == sessionId);

                    if (welcomeMessage && welcomeMessage.pinNumber) {

                        var client = WebhookServer.connectedClients.find(s => s.pinNumber == welcomeMessage.pinNumber);

                        if (client && client.socket && client.socket.connected) {

                            client.socket.emit("api-ai-message", JSON.stringify(req.body));

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