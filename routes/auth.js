const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const teacherController = require('../controller/teacher_controller');
const studentController = require('../controller/student_controller');
const AdminController = require('../controller/admin_controller');
const Admin = require('../schema/admin_schema');
const bcrypt = require('bcrypt');
const router = express.Router();

// Auth Service URL
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';


router.post('/student/login', studentController.loginStudent);

// ==================== TEACHER ROUTES ====================


// Route: Đăng nhập giáo viên
router.post('/teacher/login', teacherController.login);


// ==================== ADMIN ROUTES ====================

// Route: Đăng nhập admin
router.post('/admin/login', AdminController.adminLogin);

module.exports = router;
