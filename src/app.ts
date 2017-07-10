import * as app from "./webhook-server" 


export class Server {

    public static Start() {
        return new app.WebhookServer();
    }
}

Server.Start();
