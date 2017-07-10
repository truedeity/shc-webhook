import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as socketIo from "socket.io";
import * as bodyParser from "body-parser"; 
import * as crypto from "crypto"; 
import * as fs from "fs"; 


const restService = express();
restService.use(bodyParser.json())

var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = http.createServer(restService); 
const server2 = https.createServer(options, restService).listen(443); 

const io = socketIo(server);

export class WebhookServer {

    private activeSocket :SocketIO.Socket; 

    constructor() {
        
        this.startRestService() ;
        
        

        this.startSocketIO(); 

        
    }

    startRestService() {
        restService.post("/hook", (req, res) => { 

            if(req.body) {

                if(this.activeSocket && this.activeSocket.connected) {

                    //this will broadcast the message to all connected clients
                    //we need to change this to send the message to the specific client associated with the api.ai sessionId   
                    //pairing a client to a paticular api ai session id may be a little bit trickey.
                    this.activeSocket.emit("api-ai-message", JSON.stringify(req.body));
                }

                

            }

            return res.json({
                 speech: "just another test", 
                 displayText:  "just another test", 
                 source: "shc-webhook"
            })
        })

        restService.listen(process.env.PORT || 5000, () => { console.log("Server running...")}) ; 

    }


    startSocketIO() {

        server.listen(3000);

        io.on("connect", socket=> {
            this.activeSocket = socket;
            socket.on('disconnect', () => console.log('Client disconnected'));
        })

    }


}