const express = require('express')
const axios = require('axios');
const router = express.Router();
const {verifyStudentToken} = require('../midlewares/tokenverify');
const studentController = require('../controller/student_controller');
const AI_controller = require('../controller/AI_controller');


// AI routes
router.post('/ai/generate/teacher_comment', verifyStudentToken ,AI_controller.Ai_Generate_Base_on_TeacherComment);

// Test routes
router.get('/tests', verifyStudentToken, studentController.getStudentClassTest);
router.get('/test/:testId', verifyStudentToken, studentController.GetTestDetailById);
router.get('/test/grading/:testId',verifyStudentToken, studentController.GetTestGradingById);  

//lesson routes 
router.get('/lessons', verifyStudentToken, studentController.getStudentLessons);



module.exports = router;