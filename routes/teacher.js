const router = require('express').Router();
const teacherController = require('../controller/teacher_controller');
const answerController = require('../controller/answer_controller');
const AI_controller = require('../controller/AI_controller');
const studentController = require('../controller/student_controller');
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
const upload_all = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
  }
});



// Teacher AI question answer generate route
router.post('/ai/question-answer/generate', teacherTokenVerify, AI_controller.ai_qa_gen);
router.post('/ai/auto-grading', teacherTokenVerify, AI_controller.Ai_auto_grade);
router.post('/ai/auto-grading/file', teacherTokenVerify, AI_controller.Ai_Auto_Grading_from_file);
router.post('/ai/auto-grading/image', teacherTokenVerify, AI_controller.AI_Auto_Grading_from_image);


// Teacher class and student management route
router.get('/class', teacherTokenVerify, teacherController.TeacherGetClass);
router.get('/class/subjects', teacherTokenVerify, teacherController.TeacherGetSubjectClass);
// Student
router.patch('/students/:studentId', teacherTokenVerify, studentController.updateStudentConductAndPerformance);



// Teacher test management route
router.get('/:classId/tests', teacherTokenVerify, teacherController.getClassTest);
router.post('/tests/create', teacherTokenVerify, teacherController.CreateTest);
router.post('/tests/generate', teacherTokenVerify, AI_controller.Ai_Generate_Question_Answer);
router.get('/tests/:testId', teacherTokenVerify, teacherController.GetTestDetailById);
router.delete('/tests/:testId', teacherTokenVerify, teacherController.DeleteTestById);
router.put('/tests/:testId', teacherTokenVerify, teacherController.EditTestById);
router.get('/tests/:testId/submitted-answers', teacherTokenVerify, teacherController.getSubmittedAnswers);
router.put('/tests/answers/:answerId/grade', teacherTokenVerify, teacherController.TeacherGradingAsnwer);   

// Teacher question management route
router.post('/tests/:testId/questions', teacherTokenVerify, upload.array('files'), teacherController.CreateQuestions);
router.post('/tests/:testId/questions/single', teacherTokenVerify, upload.single('file'), teacherController.CreateQuestion);
router.delete('/tests/questions/:questionId', teacherTokenVerify, teacherController.DeleteQuestion);
router.put('/tests/questions/:questionId', teacherTokenVerify, upload.single('file'), teacherController.UpdateQuestion);
router.post('/tests/question/math/generate', teacherTokenVerify, AI_controller.Ai_Generate_math_Question_Answer);


// Teacher lesson management route
router.post('/lessons/create', teacherTokenVerify, upload_all.single('file'), teacherController.createLesson);
router.get('/lessons', teacherTokenVerify, teacherController.getTeacherLessons);
router.delete('/lessons/:lessonId', teacherTokenVerify, teacherController.DeleteLessonById);
router.put('/lessons/:lessonId', teacherTokenVerify, upload_all.single('file'), teacherController.UpdateLesson);
router.get('/lessons/:lessonId', teacherTokenVerify, teacherController.TeacherGetLessonsById);


// Get analytics data
router.get('/analytics/class/average-grades', teacherTokenVerify, teacherController.ClassAvarageGrades);
router.get('/analytics/tests/performance', teacherTokenVerify, teacherController.TestsAnylytics);
router.get('/analytics/student/average-grade', teacherTokenVerify, teacherController.getStudentAverageGradeBySubject);
router.get('/analytics/class/students/all-subjects-average', teacherTokenVerify, teacherController.getClassStudentsAllSubjectsAverage);
router.post('/analytics/class/update-average-grades', teacherTokenVerify, teacherController.updateClassStudentsAverageGrade);

//Schedule routes
router.get('/schedule', teacherTokenVerify, teacherController.getTeacherSchedule);

// mail routes
router.post('/send-email/homeroom', teacherTokenVerify, teacherController.teacherMailHomeroomClass);
router.post('/send-email/subject/class', teacherTokenVerify, teacherController.teacherMailSubjectClass);

module.exports = router;