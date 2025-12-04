const { WebSocketServer } = require('ws');
const answerController = require('../controller/answer_controller');
const { wssStudentToken } = require('../midlewares/tokenverify');  
const submitTest = async (studentid, testid, answerData) => {
    try {
        const response = await answerController.addAnsweredQuestion(studentid, testid, answerData);
        return response;
    } catch (error) {
        throw new Error('Error submitting test: ' + error.message);
    }
};
class WebSocketService {
    constructor(server) {
        this.wss = new WebSocketServer({ server });
        this.rooms = new Map(); // Map<roomId, Set<WebSocket>>
        this.clientRooms = new Map(); // Map<WebSocket, Set<roomId>>
        
        this.setupWebSocket();
       
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('New WebSocket client connected');
        
            
            // Initialize client rooms
            this.clientRooms.set(ws, new Set());

            // Handle incoming messages
            ws.on('message',  async (message) => {
                try {
                    const data = JSON.parse(message);
                    console.log('Message received:', data);

                    // Handle different message types
                    switch (data.type) {
                        case 'start_test':
                            console.log('Start test event received:', data);
                            if (!data.testId) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'testId is required to start a test'
                                }));
                                return;
                            }
                            if (!data.token) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'token is required to start a test'
                                }));
                                return;
                            }
                            try {
                                const studentid = wssStudentToken(data.token);
                                console.log("Starting test for student ID:", studentid.userId);
                                const response = await answerController.StartTest(studentid.userId, data.testId);
                                console.log("StartTest response:", response);
                                if (response === 'Test started successfully' || response === 'Test has already been started') {
                                    ws.send(JSON.stringify({
                                        type: 'test_started',
                                        message: 'Test started successfully',
                                        testId: data.testId
                                    }));
                                } else {
                                    ws.send(JSON.stringify({
                                        type: 'error',
                                        message: 'Could not start test'
                                    }));
                                }
                            } catch (error) {
                                console.error('Error starting test:', error);
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'Error starting test: ' + error.message
                                }));
                            }
                           
                            ws.send(JSON.stringify({
                                type: 'test_started',
                                message: 'Test started successfully',
                                testId: data.testId
                            }));
                            break;
                        case 'submit_test':
                            if (!data.testId || !data.answerData) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'testId and answerData are required to submit an answer'
                                }));
                                return;
                            }
                            if (!data.token) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'token is required to submit an answer'
                                }));
                                return;
                            }
                            try {
                                const studentid = wssStudentToken(data.token);
                           
                                const response = await answerController.addAnsweredQuestion(studentid.userId, data.testId, data.answerData);
                                console.log("addAnsweredQuestion response:", response);
                            if (response === true) {
                                ws.send(JSON.stringify({
                                    type: 'answer_submitted',
                                    message: 'Answer(s) submitted successfully',
                                    testId: data.testId,
                                    isSubmitted: true  
                                }));    
                            } else {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'Could not submit answers',
                                    testId: data.testId,
                                    isSubmitted: false
                                }));
                            }
                            } catch (error) {
                                console.error('Error submitting answer:', error);
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'Error submitting answer: ' + error.message,
                                    testId: data.testId,
                                    isSubmitted: false
                                }));
                            }
                            break;

                        case 'auth':
                            console.log('Auth received:', data.userType);
                            // Handle authentication
                            ws.send(JSON.stringify({
                                type: 'auth_success',
                                message: 'Authentication successful'
                            }));
                            break;

                        default:
                            console.log('Unknown message type:', data.type);
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
                // Clean up client rooms
                const rooms = this.clientRooms.get(ws);
                if (rooms) {
                    rooms.forEach(roomId => {
                        const clients = this.rooms.get(roomId);
                        if (clients) {
                            clients.delete(ws);
                            if (clients.size === 0) {
                                this.rooms.delete(roomId);
                            }
                        }
                    });
                }
                this.clientRooms.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to WebSocket server'
            }));
        });
    }
     
   

   
     
    
}


module.exports = WebSocketService;
