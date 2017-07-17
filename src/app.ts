import * as app from "./WebhookServer" 


export class Server {

    public static Start() {
        return new app.WebhookServer();
    }
}

Server.Start();
