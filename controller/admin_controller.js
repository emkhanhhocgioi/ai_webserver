const Admin = require('../schema/admin_schema.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import controllers
const studentController = require('./student_controller');
const classController = require('./class_controller');
const teacherController = require('./teacher_controller');
const testController = require('./test_controller');
const activityController = require('./activity_controller');
const scheduleController = require('./schedule_controller');


// ==================== ADMIN AUTHENTICATION ====================

// Admin Login
const adminLogin = async (req, res) => {    
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email: email });    
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không đúng"
            });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không đúng"
            });
        }

        // Tạo JWT token
        const secret = process.env.JWT_SECRET || 'your_jwt_secret';
        const token = jwt.sign(
            { 
                id: admin._id, 
                email: admin.email,
                urole: 'admin'
            },
            secret,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name
            },
            token: token
        });
    } catch (error) {
        console.error('Lỗi khi đăng nhập admin:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};


// ==================== EXPORTS ====================
// Export admin login and re-export all other controller functions

module.exports = {
    // Admin Authentication
    adminLogin,
    
    // Student Management (from student_controller)
    AdminGetStudentData: studentController.AdminGetStudentData,
    AdminGetStudentByID: studentController.AdminGetStudentByID,
    EditStudentByID: studentController.EditStudentByID,
    DeleteStudentByID: studentController.DeleteStudentByID,
    GetStudentByClassId: studentController.GetStudentByClassId,
    createManyStudentsToClass: studentController.createManyStudentsToClass,
    AdminAddStudentsAccountsToClass: studentController.AdminAddStudentsAccountsToClass,
    
    // Class Management (from class_controller)
    AdminGetClassData: classController.AdminGetClassData,
    AdminGetClassByID: classController.AdminGetClassByID,
    AdminCreateClass: classController.AdminCreateClass,
    adminDeleteClassByID: classController.adminDeleteClassByID,
    AdminUpdateClassByID: classController.AdminUpdateClassByID,
    createSubjectTeaccherForDTBClass: classController.createSubjectTeaccherForDTBClass,
    addSubjectTeacherForClass: classController.addSubjectTeacherForClass,
    getClassSubjectTeacher: classController.getClassSubjectTeacher,
    
    // Teacher Management (from teacher_controller)
    AdminGetTeacherData: teacherController.AdminGetTeacherData,
    AdminCreateTeacherAccount: teacherController.AdminCreateTeacherAccount,
    AdminGetTeacherById: teacherController.AdminGetTeacherById,
    AdminDeleteTeacherByID: teacherController.AdminDeleteTeacherByID,
    AdminUpdateTeacherByID: teacherController.AdminUpdateTeacherByID,
    
    // Test Reports (from test_controller)
    getTestReportByClass: testController.getTestReportByClass,
    getTestReportById: testController.getTestReportById,
    getStudentTestPerformance: testController.getStudentTestPerformance,
    getOverallTestStatistics: testController.getOverallTestStatistics,
    
    // User Activity & Reports (from activity_controller)
    getUserActivityById: activityController.getUserActivityById,
    getUserActivitiesLogs: activityController.getUserActivitiesLogs,
    ExportUserActivityLogsToCSV: activityController.ExportUserActivityLogsToCSV,
    generateClassPerformanceReport: activityController.generateClassPerformanceReport,
    
    // Schedule Management (from schedule_controller)
    assignTeacherToTimeSlot: scheduleController.assignTeacherToTimeSlot,
    getClassSchedule: scheduleController.getClassSchedule,
    getTimeSlot: scheduleController.getTimeSlot
};
