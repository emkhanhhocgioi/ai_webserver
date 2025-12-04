const Student = require('../schema/student');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TestScheme = require('../schema/test_schema')
const Teacher = require('../schema/teacher')
const ClassStudent = require('../schema/class_student')
const Question = require('../schema/test_question')
const TestAnswer = require('../schema/test_answer')
const answerController = require('./answer_controller');
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

module.exports = {
    registerStudent,
    loginStudent,
    getAllStudents,
    getStudentClassTest,
    GetTestDetailById
};