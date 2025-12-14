const Student = require('../schema/student');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TestScheme = require('../schema/test_schema')
const Teacher = require('../schema/teacher')
const ClassStudent = require('../schema/class_student')
const Question = require('../schema/test_question')
const TestAnswer = require('../schema/test_answer')
const Lesson = require('../schema/class_lesson')

const answerController = require('./answer_controller');
const AI_controller = require('./AI_controller');


// Search for lesson or test by query
const searchLessonsAndTests = async (req, res) => {
    try {
        const { query } = req.query;
        const studentId = req.user.userId;
        // Find the class ID for the student
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: 'Lớp học sinh không tìm thấy' });
        }
        const classId = classStudent.classID;

        // Search for lessons
        const lessons = await Lesson.find({ 
            classId,
            $or: [  
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } }
            ]
        });
        // Search for tests
        const tests = await TestScheme.find({ 
            classID: classId,
            $or: [  
                { testtitle: { $regex: query, $options: 'i' } },
            ]
        });
        res.status(200).json({ lessons, tests });
    } catch (error) {
        res.status(500).json({ message: 'Error searching lessons and tests' });
        console.error('Error searching lessons and tests:', error);
    }
};
const searchTeachersByQuery = async (req, res) => {
    try {
        const { query } = req.query;
        // Search for teachers  
        const teachers = await Teacher.find({ 
            $or: [  
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        });
        res.status(200).json({ teachers });
    } catch (error) {
        res.status(500).json({ message: 'Error searching teachers' });
        console.error('Error searching teachers:', error);
    }
};
// Teacher_contact routes
const TeacherContact = async (req, res) => {
    try {

        // Find teachers for the class
        const teachers = await Teacher.find({ });
   
        res.status(200).json({ teachers });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teacher contacts' });
        console.error('Error fetching teacher contacts:', error);
    }
};

// Function đăng ký tài khoản học sinh
const registerStudent = async (req, res) => {
    try {
        const { name, email, password, className, grade } = req.body;

        // Kiểm tra email đã tồn tại
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: "Email đã được sử dụng" });
        }

        // Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo học sinh mới
        const newStudent = new Student({
            name,
            email,
            password: hashedPassword,
            class: className,
            grade
        });

        // Lưu vào database
        await newStudent.save();

        res.status(201).json({
            message: "Tạo tài khoản thành công",
            student: {
                id: newStudent._id,
                name: newStudent.name,
                email: newStudent.email,
                class: newStudent.class,
                grade: newStudent.grade
            }
        });

    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Log the login attempt
        console.log("=== LOGIN ATTEMPT ===");
        console.log("Email trying to login:", email);
        
        // Find student by email (case-insensitive to avoid issues)
        const student = await Student.findOne({ email: email.toLowerCase().trim() });
        
        if (!student) {
            console.log("No student found with email:", email);
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }
        
        // Log found student details
        console.log("=== STUDENT FOUND ===");
        console.log("Student ID:", student._id.toString());
        console.log("Student Name:", student.name);
        console.log("Student Email:", student.email);
        
        // Verify password
        const validPassword = await bcrypt.compare(password, student.password);
        if (!validPassword) {
            console.log("Invalid password for email:", email);
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }

        // Create token with student ID
        const studentId = student._id.toString();
        const token = jwt.sign(
            { 
              userId: studentId,
              email: student.email,
              role: 'student'
            },
            process.env.JWT_SECRET || 'your_secret_key_here',
            { expiresIn: '24h' }
        );
        
        console.log("=== LOGIN SUCCESS ===");
        console.log("Generated token for student ID:", studentId);
        
        // Decode token to verify
        const decoded = jwt.decode(token);
        console.log("Token payload:", JSON.stringify(decoded, null, 2));

        res.status(200).json({
            message: "Đăng nhập thành công",
            token,
            student: {
              id: studentId,
              name: student.name,
              email: student.email,
              classid: student.classid
          }
        });

    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// Student data controller
const getStudentDataById = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const student = await Student.findById(studentId).select('-password');

        if (!student) {
            return res.status(404).json({ message: "Học sinh không tìm thấy" });
        }   
        res.status(200).json(student);
    } catch (error) {
        console.error('Lỗi lấy thông tin học sinh:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// Student test controller 
const getStudentClassTest = async (req, res) => {
    try {
        const studentid = req.user.userId;
        console.log("Fetching tests for student ID:", studentid);

        const classStudent = await ClassStudent.findOne({ studentID: studentid });
        if (!classStudent) {
            return res.status(404).json({ message: "Lớp học sinh không tìm thấy" });
        }

        // Use .lean() to get plain objects we can mutate safely and fetch tests in parallel
        const tests = await TestScheme.find({ classID: classStudent.classID, status: 'open' }).lean();

        const enrichedTests = await Promise.all(tests.map(async (test) => {
            const isubmited = await answerController.GetAnswerStatus(studentid, test._id);
            return {
                ...test,
                isSubmited: !!(isubmited && isubmited.submit),
                isSubmitedTime: isubmited && isubmited.submitTime ? isubmited.submitTime : null
            };
        }));

        res.status(200).json(enrichedTests);
    } catch (error) {
        console.error('Lỗi lấy bài kiểm tra:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};
const GetTestDetailById = async (req, res) => {
  try {
    let status = false;
    const { testId } = req.params;
    const test = await TestScheme.findById(testId);
    const studentid = req.user.userId;

    if (!test) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }

    // Lấy tất cả câu hỏi của bài kiểm tra
    const questions = await Question.find({ testid: testId }).select('-solution'); // Loại bỏ trường correctAnswer
    const answer = await TestAnswer.findOne({ testID: testId, studentID: studentid });
        if (answer) {
            status = true;
        }

    res.status(200).json({ 
      test,
      questions,
      status,
      
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy chi tiết bài kiểm tra' });
    console.error('Lỗi khi lấy chi tiết bài kiểm tra:', error);
  }
};
const GetTestGradingById = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await TestScheme.findById(testId);
    const studentid = req.user.userId;
    if (!test) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }   
    // Lấy tất cả câu hỏi của bài kiểm tra
    const questions = await Question.find({ testid: testId }).select('-solution');
    const answer = await TestAnswer.findOne({ testID: testId, studentID: studentid });
    res.status(200).json({ 
      test,
      questions,
      answer
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy chi tiết bài kiểm tra' });
    console.error('Lỗi khi lấy chi tiết bài kiểm tra:', error);
  }
};
const GetRecentInCorrectAnswers = async (req, res) => {
    try {
        const studentid = req.user.userId;
        const { subject } = req.body;

        let Answers = await TestAnswer.find({ studentID: studentid, submit: true })
            .populate({ path: 'testID', match: { subject } })
            .sort({ createdAt: -1 })
            .limit(3);

        // Lọc bỏ các doc KHÔNG có testID hợp lệ
        Answers = Answers.filter(a => a.testID);
        // Lọc ra những answer có câu trả lời sai
        const incorrectAnswers = Answers.filter(answer => Array.isArray(answer.answers) && answer.answers.some(ans => ans.isCorrect === false));

        // Xử lý song song để lấy questionType cho từng câu trả lời sai
        const results = await Promise.all(incorrectAnswers.map(async (answer) => {
            const incorrectQuestions = answer.answers.filter(ans => ans.isCorrect === false);
            const questionIds = incorrectQuestions.map(ans => ans.questionID);

            // Lấy các question documents tương ứng
            const questions = await Question.find({ _id: { $in: questionIds } }).select('subjectQuestionType');
            console.log("Fetched Questions for incorrect answers:", questions);
            // Map id -> questionType
            const qTypeMap = {};
            questions.forEach(q => {
                qTypeMap[q._id.toString()] = q.subjectQuestionType;
            });

            // Gắn questionType vào từng câu trả lời sai
            const incorrectWithTypes = incorrectQuestions.map(ans => ({
                questionID: ans.questionID,
                questionType: qTypeMap[ans.questionID.toString()] || null,
                userAnswer: ans.answer,
                isCorrect: ans.isCorrect
            }));

            return {
                testID: answer.testID._id,
                testTitle: answer.testID.title || null,
                submittedAt: answer.createdAt,
                incorrectQuestions: incorrectWithTypes
            };
        }));

        // Tập hợp danh sách questionType duy nhất (nếu cần)
        const questTypes = Array.from(new Set(results.flatMap(r => r.incorrectQuestions.map(iq => iq.questionType).filter(Boolean))));
        
        // Tạo prompt tùy chỉnh (có thể để trống hoặc thêm yêu cầu cụ thể)
        const customPrompt = 'Hãy tập trung vào các dạng bài mà học sinh thường gặp khó khăn.';
        
        const responseAi = await AI_controller.GetRecentInCorrectAnswers(questTypes);
        res.status(200).json({ questTypes, responseAi });  
        // return res.status(200).json({results,questTypes });
    } catch (error) {
        console.error('Error fetching incorrect answers:', error);
        res.status(500).json({ message: 'Error fetching incorrect answers' });
    }
};
// Student grade controller
const getAllSubjectsGrade = async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        // Lấy lớp của học sinh để biết các môn có trong lớp
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: "Lớp học sinh không tìm thấy" });
        }

        // Lấy tất cả câu trả lời đã nộp và đã chấm
        const answers = await TestAnswer.find({ studentID: studentId, submit: true, isgraded: true })
            .select('teacherGrade')
            .populate('testID', 'subject');

        // Tính tổng và số lượng cho mỗi môn
        const gradeMap = {};
        answers.forEach(answer => {
            const subject = answer.testID && answer.testID.subject ? answer.testID.subject : 'Unknown';
            if (!gradeMap[subject]) {
                gradeMap[subject] = { totalGrade: 0, count: 0 };
            }
            const gradeValue = typeof answer.teacherGrade === 'number' ? answer.teacherGrade : Number(answer.teacherGrade) || 0;
            gradeMap[subject].totalGrade += gradeValue;
            gradeMap[subject].count += 1;
        });

        // Lấy danh sách tất cả môn hiện có trong lớp (đảm bảo trả về 0 nếu không có điểm)
        const subjects = await TestScheme.distinct('subject', { classID: classStudent.classID });

        const grades = subjects.map(subject => {
            if (gradeMap[subject] && gradeMap[subject].count > 0) {
                return {
                    subject,
                    averageGrade: gradeMap[subject].totalGrade / gradeMap[subject].count
                };
            } else {
                return {
                    subject,
                    averageGrade: 0
                };
            }
        });

        console.log("Calculated Grades:", grades);

        return res.status(200).json(grades);
        
    } catch (error) {
        console.error('Lỗi lấy điểm học sinh:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};


// Function lấy tất cả thông tin học sinh (không bao gồm password)
const getAllStudents = async (req, res) => {
    try {
        const students = await Student.find({}).select('-password');
        
        res.status(200).json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách học sinh:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const getStudentLessons = async (req, res) => {
    try {
        const studentId = req.user.userId;
        // Find the class ID for the student
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: 'Lớp học sinh không tìm thấy' });
        }
        const classId = classStudent.classID;

        // Find lessons for the class
        const lessons = await Lesson.find({ classId });
        res.status(200).json({ lessons });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lessons' });
        console.error('Error fetching lessons:', error);
    }
};


module.exports = {
    registerStudent,
    loginStudent,
    getStudentDataById,
    getAllStudents,
    getStudentClassTest,
    GetTestDetailById,
    GetTestGradingById,
    getStudentLessons,
    GetRecentInCorrectAnswers,
    getAllSubjectsGrade,
    searchLessonsAndTests,
    searchTeachersByQuery,
    TeacherContact
};