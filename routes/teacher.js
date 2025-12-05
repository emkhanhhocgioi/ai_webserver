const router = require('express').Router();
const teacherController = require('../controller/teacher_controller');
const answerController = require('../controller/answer_controller');
const { teacherTokenVerify } = require('../midlewares/teacherverify');
const multer = require('multer');

// Cấu hình multer để lưu file tạm thời trong memory
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh!'), false);
    }
  }
});

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
router.put('/tests/answers/:answerId/grade', teacherController.TeacherGradingAsnwer);   
// Teacher question management route
router.post('/tests/:testId/questions', teacherTokenVerify, upload.single('file'), teacherController.CreateQuestion);
router.delete('/tests/questions/:questionId', teacherTokenVerify, teacherController.DeleteQuestion);
router.put('/tests/questions/:questionId', teacherTokenVerify, upload.single('file'), teacherController.UpdateQuestion);
module.exports = router;