const express = require('express')
const axios = require('axios');
const router = express.Router();
const {verifyStudentToken} = require('../midlewares/tokenverify');
const studentController = require('../controller/student_controller');

router.get('/tests', verifyStudentToken, studentController.getStudentClassTest);
router.get('/test/:testId', verifyStudentToken, studentController.GetTestDetailById);
router.get('/test/grading/:testId',verifyStudentToken, studentController.GetTestGradingById);  



module.exports = router;