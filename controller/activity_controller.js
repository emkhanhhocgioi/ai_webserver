const UserActivity = require('../schema/user_activities');
const Class_student = require('../schema/class_student');
const Student = require('../schema/student');

// ==================== USER ACTIVITY LOG FUNCTIONS ====================

const getUserActivityById = async (req, res) => {
    try {
        const activityId = req.params.id;
        
        if (!activityId) {
            return res.status(400).json({
                success: false,
                message: "Activity ID là bắt buộc"
            });
        }

        const activity = await UserActivity.findById(activityId)
            .populate('teacherId', 'name email')
            .populate('studentId', 'name email')
            .populate('testId', 'title')
            .populate('lessonId', 'title');
        
        if (!activity) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hoạt động"
            });
        }

        res.status(200).json({
            success: true,
            activity: activity
        });
    } catch (error) {
        console.error('Lỗi khi lấy hoạt động theo ID:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

const getUserActivitiesLogs = async (req, res) => {
    try {
        const { 
            role,           // Filter by user role
            userId,         // Filter by specific user
            action,         // Filter by action type
            startDate,      // Filter by date range
            endDate,
            page = 1,       // Pagination
            limit = 50
        } = req.query;

        // Build filter query
        const filter = {};
        
        if (role) {
            filter.role = role;
        }
        
        if (userId) {
            filter.$or = [
                { teacherId: userId },
                { studentId: userId }
            ];
        }
        
        if (action) {
            filter.action = action;
        }
        
        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Calculate skip for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count for pagination
        const total = await UserActivity.countDocuments(filter);

        // Get activities with pagination
        const activities = await UserActivity.find(filter)
            .populate('teacherId', 'name email')
            .populate('studentId', 'name email')
            .populate('testId', 'title')
            .populate('lessonId', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                activities: activities,
                pagination: {
                    total: total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hoạt động:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

const ExportUserActivityLogsToCSV = async (req, res) => {
    try {
        const { 
            role,
            userId,
            action,
            startDate,
            endDate
        } = req.query;

        // Build filter query (same as getUserActivitiesLogs)
        const filter = {};
        
        if (role) {
            filter.role = role;
        }
        
        if (userId) {
            filter.$or = [
                { teacherId: userId },
                { studentId: userId }
            ];
        }
        
        if (action) {
            filter.action = action;
        }
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Get all activities matching the filter
        const activities = await UserActivity.find(filter)
            .populate('teacherId', 'name email')
            .populate('studentId', 'name email')
            .populate('testId', 'title')
            .populate('lessonId', 'title')
            .sort({ createdAt: -1 });

        if (activities.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không có dữ liệu để xuất"
            });
        }

        // Create CSV header
        const csvHeader = 'ID,Role,User,Email,Action,Test,Lesson,Created At\n';
        
        // Create CSV rows
        const csvRows = activities.map(activity => {
            const userId = activity.role === 'teacher' ? activity.teacherId : activity.studentId;
            const userName = userId ? userId.name : 'N/A';
            const userEmail = userId ? userId.email : 'N/A';
            const testTitle = activity.testId ? activity.testId.title : 'N/A';
            const lessonTitle = activity.lessonId ? activity.lessonId.title : 'N/A';
            const createdAt = new Date(activity.createdAt).toISOString();
            
            return `"${activity._id}","${activity.role}","${userName}","${userEmail}","${activity.action}","${testTitle}","${lessonTitle}","${createdAt}"`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Set headers for CSV download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="user_activities_${timestamp}.csv"`);
        
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Lỗi khi xuất CSV:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

// ==================== CLASS PERFORMANCE REPORT FUNCTION ====================

const generateClassPerformanceReport = async (classId) => {
    try {
        // Lấy tất cả học sinh trong lớp
        const classStudents = await Class_student.find({ classID: classId }).populate('studentID');
        if (classStudents.length === 0) {
            return { success: false, message: "Không tìm thấy học sinh trong lớp này" };
        }
        // Tính toán điểm trung bình và xếp loại học lực, hạnh kiểm
        const reportData = classStudents.map(cs => {
            const student = cs.studentID;
            return {
                studentId: student._id,
                studentName: student.name,
                studentEmail: student.email,
                averageGrade: student.grade_avg || 0,
                conduct: student.conduct || 'Chưa đánh giá',
                performance: student.hocluc || 'Chưa đánh giá'
            };
        });
        return { success: true, data: reportData };
    } catch (error) {
        console.error('Lỗi khi tạo báo cáo hiệu suất lớp:', error);
        return {
            success: false,
            message: "Lỗi server",
            error: error.message
        };
    }
};

module.exports = {
    getUserActivityById,
    getUserActivitiesLogs,
    ExportUserActivityLogsToCSV,
    generateClassPerformanceReport
};
