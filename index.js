require('dotenv').config();

const express = require('express')
const cors = require('cors')

const http = require('http');
const mongoose = require('./dtb/shared_database');
const transporter =  require('./service/nodemailer');
const class_service = require('./routes/classservice')
const auth_routes = require('./routes/auth')
const test_routes = require('./routes/testservice')
const student_routes = require('./routes/student')
const teacher_routes = require('./routes/teacher')
const admin_routes = require('./routes/admin')
const WebSocketService = require('./service/websocket');
const {cloudinary} = require('./utils/cloudiary-utils');
const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "https://schoolmanageai.vercel.app","https://elearn-ai.vercel.app"],
  credentials: true
}));
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

// Check MongoDB connection
mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

server.listen(PORT, () => {
    console.log(`API gateway is running on port ${PORT}`);
    console.log(`WebSocket service is ready`);
    
    // Check current MongoDB connection state
    const connectionState = mongoose.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    console.log(`MongoDB connection state: ${states[connectionState]}`);
});