const Notification = require('../schema/notification_schema');
const Student = require('../schema/student');
const Teacher = require('../schema/teacher');
const ClassStudent = require('../schema/class_student');
const ClassSubject = require('../schema/subject_teacher');


// Teacher Notifications
const CreateTestNotification = async (teacherId, classId, testId, testTitle, subject, closeDate, wsService = null) => {
    try {
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            throw new Error('Teacher not found');
        }
        
        // Lấy danh sách học sinh trong lớp
        const classStudents = await ClassStudent.find({ classID: classId });
        
        if (!classStudents || classStudents.length === 0) {
            console.log('No students found in class');
            return null;
        }
        
        // Lấy danh sách ID học sinh
        const studentIds = classStudents.map(cs => cs.studentID);
        
        // Tạo thông báo
        const notification = new Notification({
            title: `Bài kiểm tra mới: ${testTitle}`,
            message: `Giáo viên ${teacher.name} đã tạo bài kiểm tra ${testTitle} (${subject}). Hạn nộp: ${new Date(closeDate).toLocaleString('vi-VN')}`,
            type: 'NEW_TEST',
            recipients: studentIds,
            sender: teacherId,
            relatedId: testId,
            relatedModel: 'Test',
            important: true
        });
        
        await notification.save();
        console.log(`Notification created for ${studentIds.length} students`);
        
        // Broadcast notification via WebSocket if service is available
        if (wsService && typeof wsService.broadcastNotificationToStudents === 'function') {
            wsService.broadcastNotificationToStudents(studentIds, notification);
        }
        
        return notification;
        
    } catch (error) {
        console.error('Error creating test notification:', error);
        throw error;
    }
};

// Student Notifications

const getStudentNotifications = async (req, res) => {
    try {
        const studentId = req.user.userId;  
        const notifications = await Notification.find({ recipients: studentId })
            .populate('sender', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }   
};

const markNotificationAsRead = async (req, res) => {
    try {
        const notificationId = req.params.notificationId;
        const studentId = req.user.userId;
        
        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { $addToSet: { isReadBy: studentId } },
            { new: true }
        );   
        
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }   
        
        res.status(200).json({ notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
};

module.exports = {
    CreateTestNotification,
    getStudentNotifications,
    markNotificationAsRead
};