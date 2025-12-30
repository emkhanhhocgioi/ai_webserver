
const Teacher = require('../schema/teacher.js');
const Student = require('../schema/student.js');
const Subject_Teacher = require('../schema/subject_teacher.js');
const Class_student = require('../schema/class_student.js');
const Class = require('../schema/class_schema.js');
const Admin = require('../schema/admin_schema.js');
const UserActivity = require('../schema/user_activities.js');
const Test = require('../schema/test_schema.js');
const TestAnswer = require('../schema/test_answer.js');
const Question = require('../schema/test_question.js');
const TeachingSchedule = require('../schema/teaching_schedule.js');
const TimeSlot = require('../schema/time_slot_schema.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Student_Management Service APIs
const adminLogin = async (req, res) => {    
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email: email });    
        if (!admin) {   
            return res.status(404).json({   
                success: false,
                message: "Admin không tồn tại"  
            });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Mật khẩu không đúng"
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


const createManyStudentsToClass = async (req, res) => {
    try {

        let students = req.body.students || req.body;
        const classid = req.body.classid || req.body.classId || req.body.class;

        if (!classid) {
            return res.status(400).json({ message: "classid is required in body" });
        }

        console.log("Received data:", students);
        console.log("Is array?", Array.isArray(students));

        if (!Array.isArray(students)) {
            if (req.body.email && req.body.name && !req.body.students) {
                students = [req.body];
            } else {
                return res.status(400).json({ message: "Students array is required. Expected format: {students: [...]}" });
            }
        }

        if (students.length === 0) {
            return res.status(400).json({ message: "Students array cannot be empty" });
        }

        console.log("Creating", students.length, "students");

        const hashedStudents = await Promise.all(
            students.map(async (student) => {
                const studentData = { ...student, classid: classid }; // Ensure classid is set
                if (student.password) {
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(student.password, salt);
                    return { ...studentData, password: hashedPassword };
                }
                return studentData;
            })
        );

        // Insert students
        const result = await Student.insertMany(hashedStudents);

        // Create Class_student entries for each inserted student
        const classStudentDocs = result.map((stu) => ({
            classid: classid,
            studentid: stu._id
        }));

        // If you want different field names to match your schema, adjust keys above (e.g. classId/student or class/studentId)
        const classStudentResult = await Class_student.insertMany(classStudentDocs);

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
}
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
                message: "Học sinh không tồn tại"
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
        const class_student = await Class_student.findOneAndUpdate(
            { studentid: studentId },
            { classid: updateData.classid },
            { new: true }
        );
        if (!updatedStudent) {
            return res.status(404).json({
                success: false,
                message: "Học sinh không tồn tại"
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
        const class_student = await Class_student.deleteMany({ studentid: studentId });

        if (!deletedStudent && class_student.deletedCount === 0) {  
            return res.status(404).json({
                success: false,
                message: "Học sinh không tồn tại"
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
const GetStudentByClassId   = async (req, res) => {
    try {
        const classId = req.params.classId;
        console.log("Lấy học sinh cho classId:", classId);
        const students = await Class_student.find({ classID: classId }).populate({ path: 'studentID', model: 'Student' });
        if (students.length === 0) {
            return res.status(404).json({   
                success: false,
                message: "Không có học sinh nào trong lớp này"
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


// Class_Management Service APIs
const AdminGetClassData = async (req, res) => {
    try {
         // Lấy danh sách lớp kèm thông tin giáo viên
         const classes = await Class.find()
              .populate({ path: 'class_teacher', model: 'Teacher' });

         // Tính số học sinh trong từng lớp bằng aggregation trên Class_student
         const counts = await Class_student.aggregate([
              { $group: { _id: "$classID", count: { $sum: 1 } } }
         ]);

         // Chuyển kết quả thành map để tra nhanh
         const countMap = {};
         counts.forEach(c => {
              if (c._id) countMap[c._id.toString()] = c.count;
         });

         // Gắn studentCount vào từng tài liệu lớp
         const classesWithCount = classes.map(cls => {
              const obj = cls.toObject ? cls.toObject() : { ...cls };
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
                message: "Lớp học không tồn tại"
            });
        }
        const classSubjectTeacher =  await getClassSubjectTeacher(classId);
        const mergedClassData = { ...classData.toObject(), subjectTeacher: classSubjectTeacher.data };
        res.status(200).json({
            success: true,
            class: mergedClassData   
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
        const { class_code, class_year, teacher_id } =  req.body;

        if (!class_code || !class_year || !teacher_id) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: class_code, class_year, teacher_id"
            });
        }
        const classData = { class_code, class_year, class_teacher: teacher_id };    
        const newClass = new Class(classData);
        const newSubjectTeacher = new Subject_Teacher({
            classid: newClass._id,
        });
        await newSubjectTeacher.save();
        const TeacherInCharge = await Teacher.findByIdAndUpdate(teacher_id, { 
            $push: { isClassTeacher: true } }
        );
        
        if (!TeacherInCharge) {
            return res.status(404).json({
                success: false,
                message: "Giáo viên không tồn tại"
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
    try {
        const classId = req.params.id;
        const deletedClass = await Class.findByIdAndDelete(classId);    
        if (!deletedClass) {
            return res.status(404).json({
                success: false,
                message: "Lớp học không tồn tại"
            });
        }   
        res.status(200).json({
            success: true,
            message: "Xóa lớp học thành công"   
        });
    }
    catch (error) {
        console.error('Lỗi khi xóa lớp học theo ID:', error);  
        res.status(500).json({  
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
                message: "Lớp học không tồn tại"
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
const AdminAddStudentsAccountsToClass = async (req, res) => {

    try {
        const { students, classid } = req.body;
        console.log("Thêm học sinh vào lớp:", { students });
        if (!classid || !students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc hoặc định dạng không đúng: classid, students (mảng không rỗng)"
            });
        }
        const hashedStudents = await Promise.all(
            students.map(async (student) => {
                const { name, email, password, DOB, parentContact, avatar, academic_performance, conduct, averageScore } = student;
                if (!name || !email || !password || !DOB || !parentContact) {
                    throw new Error("Mỗi học sinh phải có name, email, password, DOB và parentContact");
                }   
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                return { 
                    name, 
                    email, 
                    password: hashedPassword, 
                    classid,
                    DOB,
                    parentContact,
                    avatar,
                    academic_performance,
                    conduct,
                    averageScore
                };
            })
        );    
        const insertedStudents = await Student.insertMany(hashedStudents);
        const classStudentDocs = insertedStudents.map((stu) => ({
            classID: classid,
            studentID: stu._id
        }));    
        const classStudentResult = await Class_student.insertMany(classStudentDocs);    
        if (classStudentResult.length !== insertedStudents.length) {
            console.warn("Số lượng Class_student tạo không khớp với số học sinh đã chèn");
        }
        if (classStudentResult.length === 0 && insertedStudents.length > 0) {
            return res.status(500).json({
                success: false,
                message: "Không thể thêm tài khoản học sinh vào lớp"
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
   
const createSubjectTeaccherForDTBClass = async (req,res) => {
    try {
       
        // Nếu đã có document cho class này thì trả về luôn
        const classExisting = await Class.find();
        classExisting.forEach(async (cls) => {
             const newst = new Subject_Teacher({
                 classid: cls._id
             });
             await newst.save();
             
        }
        );
        res.status(201).json({
            success: true,
            message: "Tạo subject_teacher mặc định cho lớp thành công"
        });
    } catch (err) {
        // ném lỗi lên caller để caller xử lý
        throw err;
    }
};

const getClassSubjectTeacher = async (classid) => {
    try {
        if (!classid) {
            return { success: false, message: "classid là bắt buộc" };
        }

        // Kiểm tra lớp có tồn tại không
        const classExists = await Class.findById(classid);
        if (!classExists) {
            return { success: false, message: "Lớp học không tồn tại" };
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
            return { success: false, message: "Không tìm thấy phân công giáo viên cho lớp này" };
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
const addSubjectTeacherForClass = async (req,res) => {
    try {
        const { subjectField , teacherId} = req.body;
        const { classid } = req.params;
        
        if (!classid || !subjectField || !teacherId) {
            return res.status(400).json({   
                success: false,
                message: "classid, subject và teacher_id là bắt buộc"
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
                message: "Môn học không hợp lệ"
            });
        }

        // Kiểm tra giáo viên có tồn tại không
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Giáo viên không tồn tại"
            });
        }

        // Kiểm tra lớp có tồn tại không
        const classExists = await Class.findById(classid);
        if (!classExists) {
            return res.status(404).json({
                success: false,
                message: "Lớp học không tồn tại"
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

// Teacher_Management Service APIs
const AdminGetTeacherData = async (req, res) => {
    try {
        const teachers = await Teacher.find();
        res.status(200).json({
            success: true,
            data: {
            teachers : teachers
            }
      
        });
    }
    catch (error) {
        console.error('Lỗi khi lấy dữ liệu giáo viên:', error);  
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
};

const AdminCreateTeacherAccount = async (req,res) => {
    try {
        const {
            name,
            email,
            password,
            age,
            gender,
            subject,
            classInCharge,
            phoneNumber,
            yearsOfExperience,
            avatar
        } = req.body;

        // Validate required fields
        if (!name || !email || !password || age === undefined || age === null || !gender || !subject) {
            throw new Error("Thiếu thông tin bắt buộc: name, email, password, age, gender, subject");
        }

        // Ensure age is a number
        const numericAge = Number(age);
        if (Number.isNaN(numericAge)) {
            throw new Error("Trường age phải là số");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newTeacher = new Teacher({
            name,
            email,
            password: hashedPassword,
            age: numericAge,
            gender,
            subject,
            classInCharge: classInCharge || null,
            phoneNumber: phoneNumber || null,
            yearsOfExperience: yearsOfExperience !== undefined ? Number(yearsOfExperience) : null,
            avatar: avatar || null
        });

        const savedTeacher = await newTeacher.save();
        res.status(201).json({
            success: true,
            teacher: savedTeacher
        });
    } catch (error) {
        console.error('Lỗi khi tạo tài khoản giáo viên:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

const AdminGetTeacherById = async (req, res) => {
    try {
        const teacherId = req.params.id;    
        const teacher = await Teacher.findById(teacherId);  
        if (!teacher) { 
            return res.status(404).json({
                success: false,
                message: "Giáo viên không tồn tại"
            });
        }   
        res.status(200).json({
            success: true,
            teacher: teacher   
        });
    }
    catch (error) { 
        console.error('Lỗi khi lấy dữ liệu giáo viên theo ID:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }   
};
const AdminDeleteTeacherByID = async (req, res) => {
    try {
        const teacherId = req.params.id;
        const deletedTeacher = await Teacher.findByIdAndDelete(teacherId);
        
        // Xóa giáo viên khỏi class_teacher
        const ClassWithTeacher = await Class.updateMany(
            { class_teacher: teacherId },
            { $set: { class_teacher: null } }
        );
        
        // Xóa giáo viên khỏi tất cả các môn học trong Subject_Teacher
        const SubjectClassWithTeacher = await Subject_Teacher.updateMany(
            { 
                $or: [
                    { toan: teacherId },
                    { ngu_van: teacherId },
                    { tieng_anh: teacherId },
                    { vat_ly: teacherId },
                    { hoa_hoc: teacherId },
                    { sinh_hoc: teacherId },
                    { lich_su: teacherId },
                    { dia_ly: teacherId },
                    { giao_duc_cong_dan: teacherId },
                    { cong_nghe: teacherId },
                    { tin_hoc: teacherId },
                    { the_duc: teacherId },
                    { am_nhac: teacherId },
                    { my_thuat: teacherId }
                ]
            },
            {
                $set: {
                    toan: null,
                    ngu_van: null,
                    tieng_anh: null,
                    vat_ly: null,
                    hoa_hoc: null,
                    sinh_hoc: null,
                    lich_su: null,
                    dia_ly: null,
                    giao_duc_cong_dan: null,
                    cong_nghe: null,
                    tin_hoc: null,
                    the_duc: null,
                    am_nhac: null,
                    my_thuat: null
                }
            }
        );
                        
        if (!deletedTeacher) {
            return res.status(404).json({
                success: false,
                message: "Giáo viên không tồn tại"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Xóa giáo viên thành công",
            deletedClasses: ClassWithTeacher.modifiedCount,
            deletedSubjectTeachers: SubjectClassWithTeacher.modifiedCount
        });
    }   
    catch (error) { 
        console.error('Lỗi khi xóa giáo viên theo ID:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }   
};
const AdminUpdateTeacherByID = async (req , res) => {
    try {
        const teacherId = req.params.id;
        const updateData = req.body;    
        console.log("Cập nhật dữ liệu giáo viên:", updateData);
        const updatedTeacher = await Teacher.findByIdAndUpdate(teacherId, updateData, { new: true });
        res.status(200).json({
            success: true,
            teacher: updatedTeacher
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật giáo viên theo ID:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};


// Report functions
const generateClassPerformanceReport = async (classId) => {
    try {
        // Lấy tất cả học sinh trong lớp
        const classStudents = await Class_student.find({ classID: classId }).populate('studentID');
        if (classStudents.length === 0) {
            return { success: false, message: "Không có học sinh trong lớp này" };
        }
        // Tính toán điểm trung bình và xếp loại học lực, hạnh kiểm
        const reportData = classStudents.map(cs => {
            const student = cs.studentID;
            let academicPerformance = 'Chưa đánh giá';
            let conduct = 'Chưa đánh giá';
            if (student.academic_performance) {
                academicPerformance = student.academic_performance;
            }
            if (student.conduct) {
                conduct = student.conduct;
            }
            return {
                studentId: student._id,
                name: student.name,
                averageScore: student.averageScore || 0,    
                academicPerformance: academicPerformance,
                conduct: conduct
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

const getUserActivityById = async (req, res) => {
    try {
        const activityId = req.params.id;
        
        if (!activityId) {
            return res.status(400).json({
                success: false,
                message: "ID hoạt động là bắt buộc"
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
}
const getUserActivitiesLogs = async (req, res) => {
    try {
        const { 
            role,           // Filter by role: 'student' or 'teacher'
            userId,         // Filter by specific user ID (teacher or student)
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
            // Check both teacherId and studentId
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
}
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

const getTestReportByClass = async (req, res) => {
    try {
        const classId = req.params.classId; 

        if (!classId) {
            return res.status(400).json({
                success: false,
                message: "classId là bắt buộc"
            });
        }
        
        const ClassTests = await Test.find({ classID: classId })
            .populate('teacherID', 'name email');
        
        console.log("Bài kiểm tra trong lớp:", ClassTests);
        
        if (ClassTests.length === 0) {
            return res.status(404).json({
                success: false, 
                message: "Không có bài kiểm tra nào trong lớp này"
            });
        }
        
        const testReports = [];
        let allScores = []; 
        let totalAttempts = 0;
        let completedAttempts = 0;
        
        for (const test of ClassTests) {
            const testId = test._id;
            const testTitle = test.testtitle;
            const testSubject = test.subject;
            const createDate = test.createDate;
            const closeDate = test.closeDate;
            const status = test.status;

            // Lấy tất cả kết quả bài kiểm tra cho bài kiểm tra này
            const testResults = await TestAnswer.find({ testID: testId })
                .populate('studentID', 'name email');
            
            totalAttempts += testResults.length;
            
            // Thu thập điểm và đếm bài hoàn thành
            const resultsWithScores = testResults.map(result => {
                // Ưu tiên teacherGrade, nếu không có thì dùng AIGrade
                const score = result.teacherGrade || result.AIGrade || 0;
                
                if (result.submit && result.isgraded) {
                    allScores.push(score);
                    completedAttempts++;
                }
                
                return {
                    studentId: result.studentID?._id,
                    studentName: result.studentID?.name,
                    studentEmail: result.studentID?.email,
                    teacherGrade: result.teacherGrade,
                    AIGrade: result.AIGrade,
                    teacherComments: result.teacherComments,
                    submissionTime: result.submissionTime,
                    submit: result.submit,
                    isgraded: result.isgraded,
                    score: score,
                    totalQuestions: result.answers?.length || 0,
                    correctAnswers: result.answers?.filter(a => a.isCorrect).length || 0
                };
            });
            
            testReports.push({
                testId,
                testTitle,
                testSubject,
                createDate,
                closeDate,
                status,
                teacher: test.teacherID,
                results: resultsWithScores
            });
        }
        
        // Tính toán summary metrics
        const summary = {
            totalAttempts,
            completedAttempts,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passRate: 0
        };
        
        if (allScores.length > 0) {
            const sum = allScores.reduce((acc, score) => acc + score, 0);
            summary.averageScore = parseFloat((sum / allScores.length).toFixed(2));
            summary.highestScore = Math.max(...allScores);
            summary.lowestScore = Math.min(...allScores);
            
            // Tính pass rate (điểm >= 5.0 là đạt)
            const passedCount = allScores.filter(score => score >= 5.0).length;
            summary.passRate = parseFloat(((passedCount / allScores.length) * 100).toFixed(2));
        }
        
        // Tính toán score distribution
        const scoreDistribution = [
            { range: "0-2", count: 0 },
            { range: "2-4", count: 0 },
            { range: "4-6", count: 0 },
            { range: "6-8", count: 0 },
            { range: "8-10", count: 0 }
        ];
        
        allScores.forEach(score => {
            if (score >= 0 && score < 2) {
                scoreDistribution[0].count++;
            } else if (score >= 2 && score < 4) {
                scoreDistribution[1].count++;
            } else if (score >= 4 && score < 6) {
                scoreDistribution[2].count++;
            } else if (score >= 6 && score < 8) {
                scoreDistribution[3].count++;
            } else if (score >= 8 && score <= 10) {
                scoreDistribution[4].count++;
            }
        });
        
        res.status(200).json({
            success: true,
            data: {
                summary,
                scoreDistribution,
                tests: testReports
            }
        });
        
    } catch (error) {   
        console.error('Lỗi khi lấy báo cáo bài kiểm tra theo lớp:', error);  
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message 
        });
    }
}
const getTestReportById = async (req, res) => {
}
const getStudentTestPerformance = async (req, res) => {
}
const getOverallTestStatistics = async (req, res) => {
};

// Schedule Management APIs
const assignTeacherToTimeSlot = async (req, res) => {
    try {
        const { teacherId, classId, timeSlotId, semester } = req.body;

        // Validate required fields
        if (!teacherId || !classId || !timeSlotId || !semester) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ thông tin: teacherId, classId,  timeSlotId, semester"
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

const getTimeSlot =  async (req, res) => {
    try {
        const timeSlots = await TimeSlot.find({});
        res.status(200).json({ success: true, data: timeSlots });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    adminLogin,
    AdminGetStudentData,
    createManyStudentsToClass,
    AdminGetStudentByID,
    AdminGetClassData,
    EditStudentByID,
    DeleteStudentByID,
    AdminGetTeacherData,
    AdminCreateClass,
    adminDeleteClassByID,
    AdminGetClassByID,
    AdminUpdateClassByID,
    AdminAddStudentsAccountsToClass,
    GetStudentByClassId,
    createSubjectTeaccherForDTBClass,
    addSubjectTeacherForClass,
    getClassSubjectTeacher,
    AdminCreateTeacherAccount,
    AdminGetTeacherById,
    AdminDeleteTeacherByID,
    AdminUpdateTeacherByID,
    generateClassPerformanceReport,
    getUserActivityById,
    getUserActivitiesLogs,
    ExportUserActivityLogsToCSV,
    // Test Report APIs
    getTestReportByClass,
    getTestReportById,
    getStudentTestPerformance,
    getOverallTestStatistics,
    // Schedule Management APIs
    assignTeacherToTimeSlot,
    getClassSchedule,
    getTimeSlot
}