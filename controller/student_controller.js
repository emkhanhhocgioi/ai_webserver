const Student = require('../schema/student');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ClassStudent = require('../schema/class_student');
const { logActivity } = require('../service/user_activity_service');
const Class = require('../schema/class_schema');

// Import other controllers
const testController = require('./test_controller');
const lessonController = require('./lesson_controller');
const AI_controller = require('./AI_controller');
const scheduleController = require('./schedule_controller');


// ==================== STUDENT AUTHENTICATION ====================

// Function đăng ký tài khoản học sinh
const registerStudent = async (req, res) => {
    try {
        const { name, email, password, className, grade } = req.body;

        // Kiểm tra email đã tồn tại
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
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
        
        console.log("=== LOGIN ATTEMPT ===");
        console.log("Email trying to login:", email);
        
        // Find student by email (case-insensitive)
        const student = await Student.findOne({ email: email.toLowerCase().trim() });
        
        if (!student) {
            return res.status(404).json({ message: 'Email không tồn tại' });
        }
        
        console.log("=== STUDENT FOUND ===");
        console.log("Student ID:", student._id.toString());
        console.log("Student Name:", student.name);
        
        // Verify password
        const validPassword = await bcrypt.compare(password, student.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }
        
        // Check if lastLogin is more than 24 hours ago
        const now = new Date();
        const lastLogin = student.lastLogin;
        const hoursSinceLastLogin = lastLogin ? (now - lastLogin) / (1000 * 60 * 60) : 25;
        
        // Update last login time
        student.lastLogin = now;
        await student.save();
        
        // Create token
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


// ==================== STUDENT PROFILE ====================

const getStudentDataById = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const student = await Student.findById(studentId).select('-password');

        if (!student) {
            return res.status(404).json({ message: 'Học sinh không tồn tại' });
        }   
        res.status(200).json(student);
    } catch (error) {
        console.error('Lỗi lấy thông tin học sinh:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

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


// ==================== STUDENT SETTINGS ====================

const updateAccountSettings = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { notifications, darkMode, TestReminder } = req.body;
        console.log("Updating account settings for student ID:", studentId);

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Học sinh không tồn tại' });
        }

        // Initialize accountSettings if it doesn't exist
        if (!student.accountSettings) {
            student.accountSettings = {
                notifications: true,
                darkMode: false,
                TestReminder: true
            };
        }

        // Update account settings
        if (notifications !== undefined) {
            student.accountSettings.notifications = notifications;
        }
        if (darkMode !== undefined) {
            student.accountSettings.darkMode = darkMode;
        }
        if (TestReminder !== undefined) {
            student.accountSettings.TestReminder = TestReminder;
        }

        await student.save();

        // Log activity
        await logActivity({
            userId: studentId,
            role: 'student',
            action: 'Cập nhật cài đặt tài khoản'
        });

        res.status(200).json({
            message: 'Cập nhật cài đặt thành công',
            accountSettings: student.accountSettings
        });
    } catch (error) {
        console.error('Lỗi cập nhật cài đặt:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const changePassword = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Học sinh không tồn tại' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, student.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        student.password = hashedPassword;
        await student.save();

        // Log activity
        await logActivity({
            userId: studentId,
            role: 'student',
            action: 'Thay đổi mật khẩu'
        });

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const updateStudentConductAndPerformance = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        console.log("Received request to update conduct and performance:", req.body);
        
        const { conduct, performance } = req.body;
        
        // Validate input
        if (!conduct && !performance) {
            return res.status(400).json({ 
                message: 'Vui lòng cung cấp ít nhất một trường để cập nhật (hạnh kiểm hoặc học lực)' 
            });
        }
        
        // Build update object
        const updateData = {};
        if (conduct !== undefined) {
            updateData.conduct = conduct;
        }
        if (performance !== undefined) {
            updateData.academic_performance = performance;
        }
        
        // Find and update student by ID
        const student = await Student.findByIdAndUpdate(
            studentId,
            updateData,
            { 
                new: true, 
                runValidators: true, 
                select: '-password' 
            }
        );
        
        if (!student) {
            return res.status(404).json({ 
                message: 'Học sinh không tồn tại' 
            });
        }
        
        // Log activity
        await logActivity({
            userId: req.user ? req.user.userId : 'system',
            role: req.user ? req.user.role : 'teacher',
            action: `Cập nhật hạnh kiểm và học lực cho học sinh: ${student.name} (ID: ${studentId})`
        });
        
        res.status(200).json({ 
            message: 'Cập nhật hạnh kiểm và học lực thành công',
            student: {
                id: student._id,
                name: student.name,
                conduct: student.conduct,
                academic_performance: student.academic_performance
            }
        });
        
    } catch (error) {
        console.error('Lỗi cập nhật hạnh kiểm và học lực:', error);
        res.status(500).json({ 
            message: 'Lỗi server khi cập nhật hạnh kiểm và học lực',
            error: error.message 
        });
    }
};


// ==================== ADMIN STUDENT MANAGEMENT FUNCTIONS ====================

const AdminGetStudentData = async (req, res) => {
    try {
        const students = await Student.find()
            .populate({
                path: 'classid',
                model: 'Class'
            });
        
        res.status(200).json({
            success: true,
            students: students   
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu học sinh:', error);  
        res.status(500).json({ 
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const AdminGetStudentByID = async (req, res) => {
    try {
        const studentId = req.params.id;
        const student = await Student.findById(studentId)
            .populate({
                path: 'classid',
                model: 'Class'
            });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy học sinh"
            });
        }   
        res.status(200).json({
            success: true,
            student: student   
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu học sinh theo ID:', error);  
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const EditStudentByID = async (req, res) => {
    try {
        const studentId = req.params.id;
        const updateData = req.body;
        console.log("Cập nhật dữ liệu:", updateData);  
        const updatedStudent = await Student.findByIdAndUpdate(studentId, updateData, { new: true });
        const class_student = await ClassStudent.findOneAndUpdate(
            { studentid: studentId },
            { classid: updateData.classid },
            { new: true }
        );
        if (!updatedStudent) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy học sinh"
            });
        }
        res.status(200).json({
            success: true,
            student: updatedStudent   
        });
    }
    catch (error) {
        console.error('Lỗi khi cập nhật dữ liệu học sinh theo ID:', error);  
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const DeleteStudentByID = async (req, res) => { 
    try {
        const studentId = req.params.id;
        const deletedStudent = await Student.findByIdAndDelete(studentId);
        const class_student = await ClassStudent.deleteMany({ studentid: studentId });

        if (!deletedStudent && class_student.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy học sinh"
            });
        }
        res.status(200).json({
            success: true,
            message: "Xóa học sinh thành công"   
        });
    }
    catch (error) {
        console.error('Lỗi khi xóa học sinh theo ID:', error);  
        res.status(500).json({  
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const GetStudentByClassId = async (req, res) => {
    try {
        const classId = req.params.classId;
        console.log("Lấy học sinh cho classId:", classId);
        const students = await ClassStudent.find({ classID: classId }).populate({ path: 'studentID', model: 'Student' });
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy học sinh trong lớp này"
            });
        }
        res.status(200).json({
            success: true,
            students: students   
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu học sinh theo classId:', error);  
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const createManyStudentsToClass = async (req, res) => {
    try {
        let students = req.body.students || req.body;
        const classid = req.body.classid || req.body.classId || req.body.class;

        if (!classid) {
            return res.status(400).json({ message: "classid is required" });
        }

        if (!Array.isArray(students)) {
            return res.status(400).json({
                message: "Expected an array of students",
                receivedType: typeof students
            });
        }

        if (students.length === 0) {
            return res.status(400).json({ message: "Students array is empty" });
        }

        const hashedStudents = await Promise.all(
            students.map(async (student) => {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(student.password, salt);
                return {
                    ...student,
                    password: hashedPassword
                };
            })
        );

        const result = await Student.insertMany(hashedStudents);

        const classStudentDocs = result.map((stu) => ({
            classid: classid,
            studentid: stu._id
        }));

        const classStudentResult = await ClassStudent.insertMany(classStudentDocs);

        res.status(200).json({
            success: true,
            insertedStudents: result.length,
            insertedClassStudents: classStudentResult.length,
            message: "Students and class-student relations created successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create students", error });
    }
};

const AdminAddStudentsAccountsToClass = async (req, res) => {
    try {
        const { students, classid } = req.body;
        if (!classid || !students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "classid và danh sách học sinh là bắt buộc"
            });
        }
        const hashedStudents = await Promise.all(
            students.map(async (student) => {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(student.password, salt);
                return {
                    name: student.name,
                    email: student.email,
                    password: hashedPassword,
                    age: student.age || 15,
                    gender: student.gender || 'Nam',
                    avatar: student.avatar || '',
                    classid: classid,
                    grade_avg: student.grade_avg || 0,
                    conduct: student.conduct || 'Chưa đánh giá',
                    hocluc: student.hocluc || 'Chưa đánh giá'
                };
            })
        );    
        const insertedStudents = await Student.insertMany(hashedStudents);
        const classStudentDocs = insertedStudents.map((stu) => ({
            classID: classid,
            studentID: stu._id
        }));    
        const classStudentResult = await ClassStudent.insertMany(classStudentDocs);    
        if (classStudentResult.length === 0 && insertedStudents.length > 0) {
            return res.status(500).json({
                success: false,
                message: "Không thể thêm học sinh vào lớp"
            });
        }

        res.status(201).json({
            success: true,
            students: insertedStudents
        }); 
    } catch (error) {
        console.error('Lỗi khi thêm tài khoản học sinh vào lớp:', error);  
        res.status(500).json({  
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};


// ==================== EXPORTS ====================
// Export local functions and re-export from other controllers

module.exports = {
    // Student Authentication
    registerStudent,
    loginStudent,
    
    // Student Profile
    getStudentDataById,
    getAllStudents,
    
    // Student Settings
    updateAccountSettings,
    changePassword,
    updateStudentConductAndPerformance,
    
    // Test functions (from test_controller)
    getStudentClassTest: testController.StudentGetClassTest,
    GetTestDetailById: testController.GetTestDetailById,
    GetTestGradingById: testController.GetTestGradingById,
    GetRecentInCorrectAnswers: testController.GetRecentInCorrectAnswers,
    getAllSubjectsGrade: testController.getAllSubjectsGrade,
    getTestBySubject: testController.getTestBySubject,
    // Lesson functions (from lesson_controller)
    getLessonBySubjectforStudent: lessonController.getLessonBySubjectforStudent,
    getStudentLessons: lessonController.getStudentLessons,
    searchLessonsAndTests: lessonController.searchLessonsAndTests,
    searchTeachersByQuery: lessonController.searchTeachersByQuery,
    TeacherContact: lessonController.TeacherContact,
    
    // AI functions (from AI_controller)
    Ai_Daily_Generate_Question_Answer: AI_controller.StudentAiDailyGenerateQuestionAnswer,
    DailyTestSubjectChange: AI_controller.DailyTestSubjectChange,
    GetDailyQuestionAnswer: AI_controller.GetDailyQuestionAnswer,
    Ai_Auto_Grade_And_Save: AI_controller.Ai_Auto_Grade_And_Save,
    
    // Schedule function (from schedule_controller)
    getStudentSchedule: scheduleController.getStudentSchedule,
    
    // Admin functions for Student Management
    AdminGetStudentData,
    AdminGetStudentByID,
    EditStudentByID,
    DeleteStudentByID,
    GetStudentByClassId,
    createManyStudentsToClass,
    AdminAddStudentsAccountsToClass
};

