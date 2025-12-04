const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv');
const http = require('http');
const mongoose = require('./dtb/shared_database')
const class_service = require('./routes/classservice')
const auth_routes = require('./routes/auth')
const test_routes = require('./routes/testservice')
const student_routes = require('./routes/student')
const teacher_routes = require('./routes/teacher')
const admin_routes = require('./routes/admin')
const WebSocketService = require('./service/websocket');
const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', auth_routes);
app.use('/api/class', class_service);
app.use('/api/test',test_routes );
app.use('/api/teacher', teacher_routes);
app.use('/api/student', student_routes);
app.use('/api/admin', admin_routes);
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Learning Service is running'
    });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Make WebSocket service available to routes if needed
app.set('wsService', wsService);

// Add WebSocket info endpoint
app.get('/api/ws/rooms', (req, res) => {
    res.status(200).json({
        success: true,
        rooms: wsService.getAllRoomsInfo()
    });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`API gateway is running on port ${PORT}`);
    console.log(`WebSocket service is ready`);
});