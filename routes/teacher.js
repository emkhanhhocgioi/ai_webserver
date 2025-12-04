const router = require('express').Router();
const teacherController = require('../controller/teacher_controller');
const answerController = require('../controller/answer_controller');
const { teacherTokenVerify } = require('../midlewares/teacherverify');

// Teacher class management route
router.get('/class', teacherTokenVerify, teacherController.TeacherGetClass);
router.get('/class/subjects', teacherTokenVerify, teacherController.TeacherGetSubjectClass);


// Teacher test management route
router.get('/:classId/tests', teacherTokenVerify, teacherController.getClassTest);
router.post('/tests/create', teacherTokenVerify, teacherController.CreateTest);
router.get('/tests/:testId', teacherTokenVerify, teacherController.GetTestDetailById);
router.delete('/tests/:testId', teacherTokenVerify, teacherController.DeleteTestById);
router.put('/tests/:testId', teacherTokenVerify, teacherController.EditTestById);
router.get('/tests/:testId/submitted-answers', teacherController.getSubmittedAnswers);

// Teacher question management route
router.post('/tests/:testId/questions', teacherTokenVerify, teacherController.CreateQuestion);
router.delete('/tests/questions/:questionId', teacherTokenVerify, teacherController.DeleteQuestion);
router.put('/tests/questions/:questionId', teacherTokenVerify, teacherController.UpdateQuestion);
module.exports = router;