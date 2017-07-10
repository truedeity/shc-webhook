import * as express from "express";
import * as http from "http";
import * as socketIo from "socket.io";
import * as bodyParser from "body-parser"; 

const restService = express();
restService.use(bodyParser.json())

const server = http.createServer(restService); 
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
        })

    }


}