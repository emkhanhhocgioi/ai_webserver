const TeachingSchedule = require('../schema/teaching_schedule');
const TimeSlot = require('../schema/time_slot_schema');
const Teacher = require('../schema/teacher');
const Class = require('../schema/class_schema');
const ClassStudent = require('../schema/class_student');
const { logActivity } = require('../service/user_activity_service');

// ==================== SCHEDULE MANAGEMENT FUNCTIONS ====================

const assignTeacherToTimeSlot = async (req, res) => {
    try {
        const { teacherId, classId, timeSlotId, semester } = req.body;

        // Validate required fields
        if (!teacherId || !classId || !timeSlotId || !semester) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ thông tin: teacherId, classId, timeSlotId, semester"
            });
        }

        // Check if teacher exists
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giáo viên"
            });
        }

        // Check if class exists
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học"
            });
        }

        // Check if timeslot exists
        const timeSlot = await TimeSlot.findById(timeSlotId);
        if (!timeSlot) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy khung giờ"
            });
        }

        // Check for teacher schedule conflict
        const teacherConflict = await TeachingSchedule.findOne({
            teacherId: teacherId,
            timeSlotId: timeSlotId,
            semester: semester
        });

        if (teacherConflict) {
            return res.status(409).json({
                success: false,
                message: "Giáo viên đã có lịch dạy vào khung giờ này trong học kỳ này"
            });
        }   

        // Check for class schedule conflict
        const classConflict = await TeachingSchedule.findOne({
            classId: classId,
            timeSlotId: timeSlotId,
            semester: semester
        });

        if (classConflict) {
            return res.status(409).json({
                success: false,
                message: "Lớp học đã có lịch học vào khung giờ này trong học kỳ này"
            });
        }

        // Create new teaching schedule
        const newSchedule = new TeachingSchedule({
            teacherId,
            classId,
            timeSlotId,
            semester
        });

        await newSchedule.save();

        // Populate the schedule with full details
        const populatedSchedule = await TeachingSchedule.findById(newSchedule._id)
            .populate('teacherId', 'name email subject')
            .populate('classId', 'class_code class_year')
            .populate('timeSlotId', 'dayOfWeek startTime endTime');

        res.status(201).json({
            success: true,
            message: "Gán giáo viên vào khung giờ thành công",
            schedule: populatedSchedule
        });

    } catch (error) {
        console.error('Lỗi khi gán giáo viên vào khung giờ:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

const getClassSchedule = async (req, res) => {
    try {
        const { classId } = req.params;
        const { semester } = req.query;

        // Validate classId
        if (!classId) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp classId"
            });
        }

        // Check if class exists
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học"
            });
        }

        // Build query
        const query = { classId: classId };
        if (semester) {
            query.semester = semester;
        }

        // Get all teaching schedules for the class
        const schedules = await TeachingSchedule.find(query)
            .populate('teacherId', 'name email subject')
            .populate('timeSlotId', 'dayOfWeek startTime endTime')
            .sort({ 'timeSlotId.dayOfWeek': 1, 'timeSlotId.startTime': 1 });
         
        console.log("Lịch trình lớp học:", schedules);
        
        // Organize schedule by day of week
        const organizedSchedule = {
            Mon: [],
            Tue: [],
            Wed: [],
            Thu: [],
            Fri: [],
            Sat: [],
            Sun: []
        };

        schedules.forEach(schedule => {
            if (schedule.timeSlotId && schedule.timeSlotId.dayOfWeek) {
                organizedSchedule[schedule.timeSlotId.dayOfWeek].push({
                    scheduleId: schedule._id,
                    teacher: {
                        id: schedule.teacherId?._id,
                        name: schedule.teacherId?.name,
                        email: schedule.teacherId?.email
                    },
                    subject: schedule.teacherId?.subject, // Lấy trực tiếp từ teacherId
                    timeSlot: {
                        startTime: schedule.timeSlotId.startTime,
                        endTime: schedule.timeSlotId.endTime
                    },
                    semester: schedule.semester
                });
            }
        });

        res.status(200).json({
            success: true,
            class: {
                id: classData._id,
                class_code: classData.class_code,
                class_year: classData.class_year
            },
            totalSchedules: schedules.length,
            schedules: organizedSchedule
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch trình lớp học:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

const getTimeSlot = async (req, res) => {
    try {
        const timeSlots = await TimeSlot.find({});
        res.status(200).json({ success: true, data: timeSlots });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
const getStudentSchedule = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { semester } = req.query;

        // Find student's class
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp của học sinh"
            });
        }

        const classId = classStudent.classID;

        // Build query
        const query = { classId: classId };
        if (semester) {
            query.semester = semester;
        }

        // Get all teaching schedules for the class
        const schedules = await TeachingSchedule.find(query)
            .populate('teacherId', 'name email subject phoneNumber')
            .populate('timeSlotId', 'dayOfWeek startTime endTime session period')
            .populate('classId', 'class_code class_year')
            .sort({ 'timeSlotId.dayOfWeek': 1, 'timeSlotId.startTime': 1 });

        // Organize schedule by day of week
        const organizedSchedule = {
            Mon: [],
            Tue: [],
            Wed: [],
            Thu: [],
            Fri: [],
            Sat: [],
            Sun: []
        };

        schedules.forEach(schedule => {
            if (schedule.timeSlotId && schedule.timeSlotId.dayOfWeek) {
                organizedSchedule[schedule.timeSlotId.dayOfWeek].push({
                    scheduleId: schedule._id,
                    teacher: {
                        id: schedule.teacherId?._id,
                        name: schedule.teacherId?.name,
                        email: schedule.teacherId?.email,
                        phoneNumber: schedule.teacherId?.phoneNumber
                    },
                    subject: schedule.teacherId?.subject,
                    timeSlot: {
                        startTime: schedule.timeSlotId.startTime,
                        endTime: schedule.timeSlotId.endTime,
                        session: schedule.timeSlotId.session,
                        period: schedule.timeSlotId.period
                    },
                    semester: schedule.semester
                });
            }
        });

        // Log activity
        await logActivity({
            userId: studentId,
            role: 'student',
            action: `Xem lịch học${semester ? ' học kỳ ' + semester : ''}`
        });

        res.status(200).json({
            success: true,
            class: {
                id: schedules[0]?.classId?._id || classId,
                class_code: schedules[0]?.classId?.class_code,
                class_year: schedules[0]?.classId?.class_year
            },
            totalSchedules: schedules.length,
            schedules: organizedSchedule
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch học:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch học",
            error: error.message
        });
    }
};
// ==================== TEACHER SCHEDULE FUNCTION ====================

const getTeacherSchedule = async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const { semester } = req.query;

        // Build query
        const query = { teacherId: teacherId };
        if (semester) {
            query.semester = semester;
        }

        // Get all teaching schedules for the teacher
        const schedules = await TeachingSchedule.find(query)
            .populate('classId', 'class_code class_year class_grade')
            .populate('timeSlotId', 'dayOfWeek startTime endTime session period')
            .sort({ 'timeSlotId.dayOfWeek': 1, 'timeSlotId.startTime': 1 });

        if (!schedules || schedules.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lịch dạy"
            });
        }

        // Get teacher's subject
        const teacher = await Teacher.findById(teacherId).select('name subject email');
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thông tin giáo viên"
            });
        }

        // Organize schedule by day of week
        const organizedSchedule = {
            Mon: [],
            Tue: [],
            Wed: [],
            Thu: [],
            Fri: [],
            Sat: [],
            Sun: []
        };

        schedules.forEach(schedule => {
            if (schedule.timeSlotId && schedule.timeSlotId.dayOfWeek) {
                organizedSchedule[schedule.timeSlotId.dayOfWeek].push({
                    scheduleId: schedule._id,
                    class: {
                        id: schedule.classId?._id,
                        class_code: schedule.classId?.class_code,
                        class_year: schedule.classId?.class_year,
                        class_grade: schedule.classId?.class_grade
                    },
                    subject: teacher.subject,
                    timeSlot: {
                        startTime: schedule.timeSlotId.startTime,
                        endTime: schedule.timeSlotId.endTime,
                        session: schedule.timeSlotId.session,
                        period: schedule.timeSlotId.period
                    },
                    semester: schedule.semester
                });
            }
        });

        // Log activity
        await logActivity({
            userId: teacherId,
            role: 'teacher',
            action: `Xem lịch dạy${semester ? ' học kỳ ' + semester : ''}`
        });

        res.status(200).json({
            success: true,
            teacher: {
                id: teacher._id,
                name: teacher.name,
                subject: teacher.subject,
                email: teacher.email
            },
            totalSchedules: schedules.length,
            schedules: organizedSchedule
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch dạy:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch dạy",
            error: error.message
        });
    }
};

// ==================== STUDENT SCHEDULE FUNCTION ====================




module.exports = {
    assignTeacherToTimeSlot,
    getClassSchedule,
    getTimeSlot,
    // Student Schedule function
    getStudentSchedule,
    // Teacher Schedule function
    getTeacherSchedule
};

