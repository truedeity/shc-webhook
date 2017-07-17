
export class ApiAiWelcomeIntent {
    
    constructor(pinNumber: string, sessionId: string) {
        
        this.pinNumber = pinNumber;
        this.sessionId = sessionId;

    }

    public sessionId: string;
    public pinNumber: string; 

}