const Class = require('../schema/class_schema')
const ClassStudent = require('../schema/class_student')
const Subject_Teacher = require('../schema/subject_teacher')
const Teacher = require('../schema/teacher')
const mongoose = require("mongoose");

// Create a new class
const createClass = async (req, res) => {
    try {
        const { class_code, class_subject, class_year, class_teacher, class_avarage_grade } = req.body;
        console.log('Request body:', req.body);

        // Validate required fields
        if (!class_code || !class_subject || !class_year || !class_teacher || class_avarage_grade === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: class_code, class_subject, class_year, class_teacher, class_avarage_grade'
            });
        }

        // Create new class instance
        const newClass = new Class({
            class_code: class_code.trim(),
            class_subject: class_subject.trim(),
            class_year: class_year.trim(),
            class_student_count: 0,
            class_teacher: class_teacher.trim(),
            class_avarage_grade: Number(class_avarage_grade)
        });

        // Save to database
        const savedClass = await newClass.save();

        res.status(201).json({
            success: true,
            message: 'Class created successfully',
            data: savedClass
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'Error creating class',
            error: error.message
        });
    }
};

// Get classes by teacher
const getTeacherClass = async (req, res) => {
    try {
        const { teacher_id } = req.params;
        console.log(teacher_id)
        // Validate teacher
        if (!teacher_id) {
            return res.status(400).json({
                success: false,
                message: 'class_teacher is required'
            });
        }

        // Find all classes by teacher
        const classes = await Class.find({ class_teacher : teacher_id });

        if (!classes || classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No classes found for this teacher'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Classes retrieved successfully',
            data: classes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving classes',
            error: error.message
        });
    }
};
const getAllClass = async (req, res) => {
    try {
      
        // Find all classes by teacher
        const classes = await Class.find();

        if (!classes || classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No classes found for this teacher'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Classes retrieved successfully',
            data: classes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving classes',
            error: error.message
        });
    }
};


// Delete a class by ID
const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const userInfo = req.user || JSON.parse(req.headers.user || '{}');

        // Validate ID
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Class ID is required'
            });
        }

        // Find the class
        const classToDelete = await Class.findById(id);

        if (!classToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Check if user is the teacher of this class
        if (classToDelete.class_teacher !== userInfo.userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Only the class teacher can delete this class'
            });
        }

        // Delete the class
        const deletedClass = await Class.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Class deleted successfully',
            data: deletedClass
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting class',
            error: error.message
        });
    }
};


const studentEnroll = async (req,res) => {

    try {
        const {studentid , classid } = req.body;
        
        
        const isExist = await ClassStudent.findOne({studentID : studentid  , classID : classid})
        
        if(isExist){
         res.status(409).json({
            success: false,
            message: "File đã tồn tại trong hệ thống."
        });
        }
        
        const doc = new ClassStudent({
            studentID: studentid,
            classID: classid,
            timeJoin: new Date()
        })

        const savedDoc = await doc.save();

        return res.status(200).json({
            success: true,
            message: "Enroll thành công.",
            data: savedDoc
        });
    } catch (error) {
         console.error("Error enroll:", error);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });
    }

}
const AdminGetClassData = async (req, res) => {
    try {
         // Lấy danh sách lớp kèm thông tin giáo viên
         const classes = await Class.find()
              .populate({ path: 'class_teacher', model: 'Teacher' });

         // Tính số học sinh trong từng lớp bằng aggregation trên Class_student
         const counts = await ClassStudent.aggregate([
              { $group: { _id: "$classID", count: { $sum: 1 } } }
         ]);

         // Chuyển kết quả thành map để tra nhanh
         const countMap = {};
         counts.forEach(c => {
              countMap[c._id.toString()] = c.count;
         });

         // Gắn studentCount vào từng tài liệu lớp
         const classesWithCount = classes.map(cls => {
              const obj = cls.toObject();
              obj.studentCount = countMap[cls._id.toString()] || 0;
              return obj;
         });

         res.status(200).json({
              success: true,
              data: classesWithCount
         });

    } catch (error) {
         console.error('Lỗi khi lấy dữ liệu lớp học:', error);
         res.status(500).json({
              success: false,
              message: "Lỗi server",
              error: error.message
         });
    }
};

const AdminGetClassByID = async (req, res) => {
    try {
        const classId = req.params.id;
        const classData = await Class.findById(classId)
            .populate({ path: 'class_teacher', model: 'Teacher' }); 
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học"
            });
        }
        const classSubjectTeacher = await getClassSubjectTeacher(classId);
        const classStudentCount = await ClassStudent.countDocuments({ classID: classId });
        const mergedClassData = { ...classData.toObject(), subjectTeacher: classSubjectTeacher.data,studentCount: classStudentCount };
        res.status(200).json({
            success: true,
            class: mergedClassData,
            
        });
    } catch (error) {   
        console.error('Lỗi khi lấy dữ liệu lớp học theo ID:', error);  
        res.status(500).json({
            success: false, 
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const AdminCreateClass = async (req, res) => {   
    try {
        const { class_code, class_year, teacher_id } = req.body;

        if (!class_code || !class_year || !teacher_id) {
            return res.status(400).json({
                success: false,
                message: "class_code, class_year và teacher_id là bắt buộc"
            });
        }
        const classData = { class_code, class_year, class_teacher: teacher_id };    
        const newClass = new Class(classData);
        const newSubjectTeacher = new Subject_Teacher({
            classid: newClass._id,
        });
        await newSubjectTeacher.save();
        const TeacherInCharge = await Teacher.findByIdAndUpdate(teacher_id, { 
            $set: { isClassTeacher: true } }
        );
        
        if (!TeacherInCharge) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giáo viên"
            });
        }   
        await newClass.save();  
        res.status(201).json({
            success: true,
            class: newClass   
        });
    } catch (error) {
        console.error('Lỗi khi tạo lớp học mới:', error);  
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const adminDeleteClassByID = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const classId = req.params.id;

        // 1. Xóa lớp
        const deletedClass = await Class.findByIdAndDelete(classId, { session });
        if (!deletedClass) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học"
            });
        }

        // 2. Xóa học sinh trong lớp
        await ClassStudent.deleteMany(
            { classID: classId },
            { session }
        );

        // 3. Xóa phân công môn học
        await Subject_Teacher.deleteMany(
            { classid: classId },
            { session }
        );

        // 4. Cập nhật giáo viên chủ nhiệm
        if (deletedClass.class_teacher) {
            // Kiểm tra xem giáo viên còn phụ trách lớp nào khác không
            const otherClasses = await Class.findOne(
                { class_teacher: deletedClass.class_teacher },
                null,
                { session }
            );

            if (!otherClasses) {
                await Teacher.findByIdAndUpdate(
                    deletedClass.class_teacher,
                    { $set: { isClassTeacher: false } },
                    { session }
                );
            }
        }

        // ✅ Nếu TẤT CẢ thành công → commit
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Xóa lớp học thành công"
        });

    } catch (error) {
        // ❌ Nếu có lỗi → rollback toàn bộ
        await session.abortTransaction();
        session.endSession();

        console.error("Lỗi khi xóa lớp học:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

const AdminUpdateClassByID = async (req, res) => {
    try {
        const classId = req.params.id;
        const updateData = req.body;    
        console.log("Cập nhật dữ liệu lớp học:", updateData);
        const updatedClass = await Class.findByIdAndUpdate(classId, updateData, { new: true });    
        if (!updatedClass) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học"
            });
        }
        res.status(200).json({
            success: true,
            class: updatedClass   
        });
    }   
    catch (error) {
        console.error('Lỗi khi cập nhật dữ liệu lớp học theo ID:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

const createSubjectTeaccherForDTBClass = async (req, res) => {
    try {
        const classExisting = await Class.find();
        classExisting.forEach(async (cls) => {
            const newSubjectTeacher = new Subject_Teacher({
                classid: cls._id,
            });
            await newSubjectTeacher.save();
        });
        res.status(201).json({
            success: true,
            message: "Tạo subject_teacher mặc định cho lớp thành công"
        });
    } catch (err) {
        throw err;
    }
};

const getClassSubjectTeacher = async (classid) => {
    try {
        if (!classid) {
            return { success: false, message: "classid is required" };
        }

        // Kiểm tra lớp có tồn tại không
        const classExists = await Class.findById(classid);
        if (!classExists) {
            return { success: false, message: "Không tìm thấy lớp học" };
        }

        const subjectTeacher = await Subject_Teacher.findOne({ classid: classid })
            .populate('classid')
            .populate('toan')
            .populate('ngu_van')
            .populate('tieng_anh')
            .populate('vat_ly')
            .populate('hoa_hoc')
            .populate('sinh_hoc')
            .populate('lich_su')
            .populate('dia_ly')
            .populate('giao_duc_cong_dan')
            .populate('cong_nghe')
            .populate('tin_hoc')
            .populate('the_duc')
            .populate('am_nhac')
            .populate('my_thuat');

        if (!subjectTeacher) {
            return { success: false, message: "Không tìm thấy thông tin phân công giáo viên môn học" };
        }

        return { success: true, data: subjectTeacher };

    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu subject_teacher theo classId:', error);
        return {
            success: false,
            message: "Lỗi server",
            error: error.message
        };
    }
};

const addSubjectTeacherForClass = async (req, res) => {
    try {
        const { subjectField, teacherId } = req.body;
        const { classid } = req.params;
        
        if (!classid || !subjectField || !teacherId) {
            return res.status(400).json({
                success: false,
                message: "classid, subjectField và teacherId là bắt buộc"
            });
        }

        const validSubjects = [
            'toan', 'ngu_van', 'tieng_anh', 'vat_ly', 'hoa_hoc', 
            'sinh_hoc', 'lich_su', 'dia_ly', 'giao_duc_cong_dan',
            'cong_nghe', 'tin_hoc', 'the_duc', 'am_nhac', 'my_thuat'
        ];

        if (!validSubjects.includes(subjectField)) {
            return res.status(400).json({
                success: false,
                message: `Môn học không hợp lệ. Các môn hợp lệ: ${validSubjects.join(', ')}`
            });
        }

        // Kiểm tra giáo viên có tồn tại không
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giáo viên"
            });
        }

        // Kiểm tra lớp có tồn tại không
        const classExists = await Class.findById(classid);
        if (!classExists) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học"
            });
        }

        // Tìm và cập nhật subject_teacher
        const updateData = {};
        updateData[subjectField] = teacherId;

        const subjectTeacher = await Subject_Teacher.findOneAndUpdate(
            { classid: classid },
            { $set: updateData },
            { new: true, upsert: true }
        ).populate('classid');

        res.status(200).json({
            success: true,
            message: `Đã thêm giáo viên ${teacher.name} vào môn ${subjectField} cho lớp ${classExists.class_code}`,
            data: subjectTeacher
        });

    } catch (error) {
        console.error('Lỗi khi thêm giáo viên vào môn học:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

module.exports = {
    createClass,
    deleteClass,
    studentEnroll,
    getTeacherClass,
    getAllClass,
    // Admin functions for Class Management
    AdminGetClassData,
    AdminGetClassByID,
    AdminCreateClass,
    adminDeleteClassByID,
    AdminUpdateClassByID,
    createSubjectTeaccherForDTBClass,
    addSubjectTeacherForClass,
    getClassSubjectTeacher
};

// ==================== ADMIN CLASS MANAGEMENT FUNCTIONS ====================

