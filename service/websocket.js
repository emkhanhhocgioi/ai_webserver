const { WebSocketServer } = require('ws');
const answerController = require('../controller/answer_controller');
const { wssStudentToken } = require('../midlewares/tokenverify');  




class WebSocketService {
    constructor(server) {
        this.wss = new WebSocketServer({ server });
        this.rooms = new Map(); // Map<roomId, Set<WebSocket>>
        this.clientRooms = new Map(); // Map<WebSocket, Set<roomId>>
        this.studentConnections = new Map(); // Map<studentId, WebSocket> - Track connections by student ID
        
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
                            if (data.token) {
                                try {
                                    const studentid = wssStudentToken(data.token);
                                    // Store the connection with student ID
                                    this.studentConnections.set(studentid.userId.toString(), ws);
                                    console.log('Student authenticated and stored:', studentid.userId);
                                    ws.send(JSON.stringify({
                                        type: 'auth_success',
                                        message: 'Authentication successful'
                                    }));
                                } catch (error) {
                                    console.error('Authentication error:', error);
                                    ws.send(JSON.stringify({
                                        type: 'error',
                                        message: 'Authentication failed'
                                    }));
                                }
                            } else {
                                ws.send(JSON.stringify({
                                    type: 'auth_success',
                                    message: 'Authentication successful'
                                }));
                            }
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
                
                // Clean up student connections
                for (let [studentId, socket] of this.studentConnections.entries()) {
                    if (socket === ws) {
                        this.studentConnections.delete(studentId);
                        console.log('Removed student connection:', studentId);
                        break;
                    }
                }
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
     
    // Broadcast notification to specific students
    broadcastNotificationToStudents(studentIds, notification) {
        let sentCount = 0;
        studentIds.forEach(studentId => {
            const studentIdStr = studentId.toString();
            const ws = this.studentConnections.get(studentIdStr);
            if (ws && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: 'new_notification',
                    notification: notification
                }));
                sentCount++;
            }
        });
        console.log(`Notification broadcasted to ${sentCount}/${studentIds.length} connected students`);
        return sentCount;
    }

   
     
    
}


module.exports = WebSocketService;
