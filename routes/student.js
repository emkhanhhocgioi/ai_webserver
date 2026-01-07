const express = require('express')
const axios = require('axios');
const router = express.Router();
const {verifyStudentToken} = require('../midlewares/tokenverify');
const studentController = require('../controller/student_controller');
const AI_controller = require('../controller/AI_controller');
const notificationController = require('../controller/notifications_controller');
const answerController = require('../controller/answer_controller');
const { uploadAny } = require('../midlewares/upload');


// Student personal
router.put('/personal/daily-question-subject', verifyStudentToken, studentController.DailyTestSubjectChange);
router.get('/personal/daily-question-answer', verifyStudentToken, studentController.GetDailyQuestionAnswer);

// Notification routes
router.get('/notifications', verifyStudentToken, notificationController.getStudentNotifications);
router.patch('/notifications/:notificationId/read', verifyStudentToken, notificationController.markNotificationAsRead);

// Search routes
router.get('/search/all', verifyStudentToken, studentController.searchLessonsAndTests);
router.get('/search/Teachers', verifyStudentToken, studentController.searchTeachersByQuery);

// Student data
router.get('/info', verifyStudentToken, studentController.getStudentDataById);

// AI routes
router.post('/ai/generate/teacher_comment', verifyStudentToken ,AI_controller.Ai_Generate_Base_on_TeacherComment);
router.post('/ai/grading/essay', verifyStudentToken ,AI_controller.AI_Grading_essay);
router.post('/ai/recent-incorrect-answers', verifyStudentToken, studentController.GetRecentInCorrectAnswers);
router.post('/ai/daily-question-answer', verifyStudentToken, studentController.Ai_Daily_Generate_Question_Answer);
router.post('/ai/auto-grade', verifyStudentToken, studentController.Ai_Auto_Grade_And_Save);


// Grade Summary routes
router.get('/grades/summary', verifyStudentToken, studentController.getAllSubjectsGrade);

// Test routes
router.get('/tests', verifyStudentToken, studentController.getStudentClassTest);
router.get('/test/:testId', verifyStudentToken, studentController.GetTestDetailById);
router.get('/test/grading/:testId',verifyStudentToken, studentController.GetTestGradingById);  
router.post('/test/answer/file-upload', uploadAny.single('file'), verifyStudentToken, answerController.FileUploadToQuestion);
router.put('/test/answer/edit', verifyStudentToken, answerController.editAnswer);
router.put('/test/answer/file-edit', uploadAny.single('file'), verifyStudentToken, answerController.editUploadQuestion);
router.get('/test/subject/:subject', verifyStudentToken, studentController.getTestBySubject);

//lesson routes 
router.get('/lesson/subject/:subject', verifyStudentToken, studentController.getLessonBySubjectforStudent);
router.get('/lessons', verifyStudentToken, studentController.getStudentLessons);


// Teacher contact routes
router.get('/teachers/contact', studentController.TeacherContact);

// Schedule routes
router.get('/schedule', verifyStudentToken, studentController.getStudentSchedule);

// Account settings routes
router.put('/settings/account', verifyStudentToken, studentController.updateAccountSettings);
router.put('/settings/change-password', verifyStudentToken, studentController.changePassword);

module.exports = router;