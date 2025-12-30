const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../schema/admin_schema');
const TimeSlot = require('../schema/time_slot_schema.js');
const {adminVerify} = require('../midlewares/adminverify');
const controller = require('../controller/admin_controller');


// Student Management Routes
router.get('/students',adminVerify, controller.AdminGetStudentData);
router.get('/students/:id',adminVerify, controller.AdminGetStudentByID);
router.put('/student/update/:id',adminVerify, controller.EditStudentByID);    
router.delete('/student/delete/:id',adminVerify, controller.DeleteStudentByID);
router.get('/students/class/:classId',adminVerify, controller.GetStudentByClassId);

// Subject Teacher Management Routes
router.put('/class/subject-teacher/:classid',adminVerify, controller.addSubjectTeacherForClass);


// Class Management Routes
router.get('/classes',adminVerify, controller.AdminGetClassData);
router.get('/class/:id',adminVerify, controller.AdminGetClassByID);
router.post('/classes/create',adminVerify, controller.AdminCreateClass);
router.put('/class/update/:id',adminVerify, controller.AdminUpdateClassByID);
router.delete('/class/delete/:id',adminVerify, controller.adminDeleteClassByID);
router.post('/class/add-students/:id',adminVerify, controller.AdminAddStudentsAccountsToClass);


// Teacher Management Routes
router.get('/teachers',adminVerify, controller.AdminGetTeacherData);
router.post('/teachers/create',adminVerify, controller.AdminCreateTeacherAccount);
router.get('/teacher/:id',adminVerify, controller.AdminGetTeacherById); 
router.delete('/teacher/delete/:id',adminVerify, controller.AdminDeleteTeacherByID);
router.put('/teacher/update/:id',adminVerify, controller.AdminUpdateTeacherByID);

// User Activity Logs Routes
router.get('/activities',adminVerify, controller.getUserActivitiesLogs);
router.get('/activity/:id',adminVerify, controller.getUserActivityById);
router.get('/activities/export/csv',adminVerify, controller.ExportUserActivityLogsToCSV);

// Test Report Routes
router.get('/test-reports/class/:classId', adminVerify, controller.getTestReportByClass);
router.get('/test-reports/test/:testId', adminVerify, controller.getTestReportById);
router.get('/test-reports/student/:studentId', adminVerify, controller.getStudentTestPerformance);
router.get('/test-reports/statistics', adminVerify, controller.getOverallTestStatistics);

// Class Schedule Management Routes
router.post('/schedule/assign', adminVerify, controller.assignTeacherToTimeSlot);
router.get('/schedule/class/:classId', adminVerify, controller.getClassSchedule);


// Postman test route (no auth)

router.get('/time_slot',adminVerify, controller.getTimeSlot);
module.exports = router;





