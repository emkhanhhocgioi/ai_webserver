const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const transporter = require('../service/nodemailer');
const Teacher = require('../schema/teacher');
const Classes = require('../schema/class_schema');
const ClassStudent = require('../schema/class_student');
const SubjectClass = require('../schema/subject_teacher');
const Student = require('../schema/student');
const TestAnswer = require('../schema/test_answer');
const { logActivity } = require('../service/user_activity_service');

// Import from other controllers
const testController = require('./test_controller');
const lessonController = require('./lesson_controller');
const questionController = require('./question_controller');
const scheduleController = require('./schedule_controller');

// ==================== TEACHER AUTHENTICATION ====================

const register = async (req, res) => {
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
      yearsOfExperience
    } = req.body;

    // Kiểm tra xem email đã tồn tại chưa
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email này đã được đăng ký' });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 12);

    // Tạo giáo viên mới
    const teacher = new Teacher({
      name,
      email,
      password: hashedPassword,
      age,
      gender,
      subject,
      classInCharge,
      phoneNumber,
      yearsOfExperience
    });

    // Lưu vào database
    await teacher.save();

   
    res.status(201).json({
      message: 'Đăng ký thành công',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email
      },
    });

  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng ký' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    // Tìm giáo viên theo email
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, teacher.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { 
        userId: teacher._id.toString(),
        email: teacher.email,
        urole: 'teacher',
        iat: Date.now()
      },
      process.env.JWT_SECRET || 'you_secret_key_here',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email
      },
      token
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng nhập' });
  }
};

// ==================== TEACHER CLASS FUNCTIONS ====================

const TeacherGetClass = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    console.log("Fetching classes for teacher ID:", teacherId);
    const classDoc = await Classes.find({class_teacher: teacherId});
    
    if (!classDoc || classDoc.length === 0) {
      return res.status(404).json({ message: 'lớp không tồn tại' });
    }

    // Extract all class IDs from the found classes
    const classIds = classDoc.map(cls => cls._id);
    
    // Find all class-student relationships for these classes and populate student data
    const classStudentDocs = await ClassStudent.find({ classID: { $in: classIds } }).populate('studentID');
    
    // Merge classes with their students
    const mergedResults = classDoc.map(cls => { 
      const studentsInClass = classStudentDocs.filter(cs => cs.classID.toString() === cls._id.toString());
      return {
        ...cls.toObject(),
        students: studentsInClass
      };
    });

    res.status(200).json({ class: mergedResults });

  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy lớp học của giáo viên' });
    console.error('Lỗi lấy lớp học của giáo viên:', error);
  }
};

const TeacherGetSubjectClass = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    console.log("Fetching classes for teacher ID:", teacherId);
    
    let classDocs = await SubjectClass.find({ 
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
    }).populate('classid');

    // Extract class ids (populated or raw)
    const classIds = classDocs
      .map(cd => cd.classid ? (cd.classid._id || cd.classid) : null)
      .filter(Boolean);

    // Aggregate student counts per classID from ClassStudent
    const studentCounts = classIds.length
      ? await ClassStudent.aggregate([
        { $match: { classID: { $in: classIds } } },
        { $group: { _id: "$classID", count: { $sum: 1 } } }
      ])
      : [];
    
    const Test = require('../schema/test_schema');
    const TestCount = classIds.length ?
      await Test.aggregate([
        { $match: { classID: { $in: classIds }, teacherID: new mongoose.Types.ObjectId(teacherId) } },
        { $group: { _id: "$classID", count: { $sum: 1 } } }
      ])
      : [];

    console.log("Student Counts:", studentCounts);
    console.log("Test Counts:", TestCount);

    // Attach studentCount to each classDoc
    classDocs = classDocs.map(cd => {
      const cid = cd.classid ? (cd.classid._id || cd.classid) : null;
      const sc = studentCounts.find(s => s._id && cid && s._id.toString() === cid.toString());
      const tc = TestCount.find(t => t._id && cid && t._id.toString() === cid.toString());
      return {
      ...cd.toObject(),
      studentCount: sc ? sc.count : 0,
      testCount: tc ? tc.count : 0
      };
    });

    if (!classDocs || classDocs.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học nào' });
    }

    // Tạo mảng kết quả với thông tin lớp học và môn học tương ứng
    const result = classDocs.map(classDoc => {
      // Tìm môn học mà giáo viên đang dạy trong lớp này
      const subjects = [];
      const subjectFields = {
        toan: 'Toán',
        ngu_van: 'Ngữ văn',
        tieng_anh: 'Tiếng Anh',
        vat_ly: 'Vật lý',
        hoa_hoc: 'Hóa học',
        sinh_hoc: 'Sinh học',
        lich_su: 'Lịch sử',
        dia_ly: 'Địa lý',
        giao_duc_cong_dan: 'Giáo dục công dân',
        cong_nghe: 'Công nghệ',
        tin_hoc: 'Tin học',
        the_duc: 'Thể dục',
        am_nhac: 'Âm nhạc',
        my_thuat: 'Mỹ thuật'
      };

      for (const [field, subjectName] of Object.entries(subjectFields)) {
        if (classDoc[field]?.toString() === teacherId.toString()) {
          subjects.push(subjectName);
        }
      }

      return {
        classId: classDoc.classid?._id,
        class_code: classDoc.classid?.class_code,
        class_year: classDoc.classid?.class_year,
        studentCount: classDoc.studentCount || 0,
        testCount: classDoc.testCount || 0,
        subjects: subjects
      };
    });

    res.status(200).json({ 
      message: 'Lấy danh sách lớp học thành công',
      data: result 
    });

  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy lớp học môn của giáo viên' });
    console.error('Lỗi lấy lớp học môn của giáo viên:', error);
  }
};

// ==================== TEACHER SETTINGS ====================

const updateAccountSettings = async (req, res) => {
    try {
      
        const teacherId = req.user.userId;
        const { notifications, darkMode, TestReminder } = req.body;
        console.log("Updating account settings for teacher ID:", teacherId);

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
        }

        // Initialize accountSettings if it doesn't exist
        if (!teacher.accountSettings) {
            teacher.accountSettings = {
                notifications: true,
                darkMode: false,
                TestReminder: true
            };
        }

        // Update account settings
        if (notifications !== undefined) {
            teacher.accountSettings.notifications = notifications;
        }
        if (darkMode !== undefined) {
            teacher.accountSettings.darkMode = darkMode;
        }
        if (TestReminder !== undefined) {
            teacher.accountSettings.TestReminder = TestReminder;
        }

        await teacher.save();

        // Log activity
        await logActivity({
            userId: teacherId,
            role: 'teacher',
            action: 'Cập nhật cài đặt tài khoản'
        });

        res.status(200).json({
            message: 'Cập nhật cài đặt thành công',
            accountSettings: teacher.accountSettings
        });
    } catch (error) {
        console.error('Lỗi cập nhật cài đặt:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const changePassword = async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, teacher.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        teacher.password = hashedPassword;
        await teacher.save();

        // Log activity
        await logActivity({
            userId: teacherId,
            role: 'teacher',
            action: 'Thay đổi mật khẩu'
        });

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// ==================== TEACHER MAILING FUNCTIONS ====================

const teacherMailHomeroomClass = async (req, res) => {
  try {
    const { message, title } = req.body;
    const teacherId = req.user.userId;

    if (!title || !message) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề và nội dung thư' });
    }

    // Find homeroom class
    const homeroomClasses = await Classes.find({ class_teacher: teacherId });
    if (!homeroomClasses || homeroomClasses.length === 0) {
      return res.status(404).json({ message: 'Giáo viên không có lớp chủ nhiệm' });
    }

    // Get all class IDs
    const classIds = homeroomClasses.map(cls => cls._id);

    // Get all students from homeroom classes
    const classStudents = await ClassStudent.find({ classID: { $in: classIds } })
      .populate('studentID', 'email name');

    if (!classStudents || classStudents.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh nào trong lớp chủ nhiệm' });
    }

    // Get unique student emails
    const studentEmails = [...new Set(
      classStudents
        .filter(cs => cs.studentID && cs.studentID.email)
        .map(cs => cs.studentID.email)
    )];

    if (studentEmails.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy email học sinh nào' });
    }

    // Get teacher info
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    // Send email to all students
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: studentEmails.join(','),
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Gửi từ: ${teacher.name} (Giáo viên chủ nhiệm)<br>
            Email: ${teacher.email}<br>
            Lớp: ${homeroomClasses.map(c => c.class_code).join(', ')}
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // Log activity
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Gửi thư chủ nhiệm đến ${studentEmails.length} học sinh: "${title}"`
    });

    res.status(200).json({ 
      message: 'Gửi thư thành công',
      sentTo: studentEmails.length,
      classes: homeroomClasses.map(c => c.class_code),
      students: studentEmails
    });

  } catch (error) {
    console.error('Lỗi khi gửi email cho lớp chủ nhiệm của giáo viên:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi gửi thư' });
  }
};

const teacherMailSubjectClass = async (req, res) => {
  try {
    const { message, title } = req.body;
    const teacherId = req.user.userId;

    if (!title || !message) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề và nội dung thư' });
    }

    // Find all classes where this teacher teaches any subject
    const subjectClasses = await SubjectClass.find({ 
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
    }).populate('classid');

    if (!subjectClasses || subjectClasses.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học nào' });
    }

    // Get all unique student emails
    const studentEmails = new Set();
    for (const subjectClass of subjectClasses) {
      if (!subjectClass.classid) continue;
      
      const classStudents = await ClassStudent.find({ classID: subjectClass.classid._id })
        .populate('studentID', 'email name');
      
      classStudents.forEach(cs => {
        if (cs.studentID && cs.studentID.email) {
          studentEmails.add(cs.studentID.email);
        }
      });
    }

    const emailArray = Array.from(studentEmails);

    if (emailArray.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy email học sinh nào' });
    }

    // Get teacher info
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    // Send email to all students
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailArray.join(','),
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Gửi từ: ${teacher.name} (Giáo viên môn ${teacher.subject})<br>
            Email: ${teacher.email}
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // Log activity
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Gửi thư đến ${emailArray.length} học sinh: "${title}"`
    });

    res.status(200).json({ 
      message: 'Gửi thư thành công',
      sentTo: emailArray.length,
      students: emailArray
    });

  } catch (error) {
    console.error('Lỗi khi gửi email cho lớp học môn của giáo viên:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi gửi thư' });
  }
};

const teacherMailToStudent = async (req, res) => {
  try {
    const { studentEmail, title, message } = req.body;
    const teacherId = req.user.userId;
    if (!studentEmail || !title || !message) {
      return res.status(400).json({ message: 'Vui lòng nhập email học sinh, tiêu đề và nội dung thư' });
    }
    // Get teacher info
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }
    // Send email to the student
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: studentEmail, 
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>  
          <p style="color: #666; line-height: 1.6;">${message}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Gửi từ: ${teacher.name} (Giáo viên môn ${teacher.subject})<br>
            Email: ${teacher.email}
          </p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    // Log activity
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Gửi thư đến học sinh ${studentEmail}: "${title}"`
    });
    res.status(200).json({ 
      message: 'Gửi thư thành công',
      sentTo: studentEmail
    });
  } catch (error) {
    console.error('Lỗi khi gửi email cho học sinh:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi gửi thư' });
  }
};

// ==================== TEACHER GRADE FUNCTIONS ====================

const getStudentAverageGradeBySubject = async (req, res) => {
  try {
    const { studentId, subject } = req.query;
    
    if (!studentId || !subject) {
      return res.status(400).json({ message: 'studentId and subject are required' });
    }
    
    const { getStudentAvarageSubjectGrade } = require('./answer_controller');
    const averageGrade = await getStudentAvarageSubjectGrade(studentId, subject);
    
    res.status(200).json({ 
      message: 'Average grade retrieved successfully',
      studentId,
      subject,
      averageGrade 
    });
  } catch (error) {
    console.error('Error getting student average grade:', error);
    res.status(500).json({ message: 'Error getting student average grade: ' + error.message });
  }
};

const updateClassStudentsAverageGrade = async (req, res) => {
  try {
    const { classId, subject } = req.body;
    
    if (!classId || !subject) {
      return res.status(400).json({ message: 'classId and subject are required' });
    }
    
    const { updateAllStudentsAverageGrade } = require('./answer_controller');
    await updateAllStudentsAverageGrade(classId, subject);
    
    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Cập nhật điểm trung bình môn ${subject} cho lớp ${classId}`
    });
    
    res.status(200).json({ 
      message: 'All students average grades updated successfully',
      classId,
      subject
    });
  } catch (error) {
    console.error('Error updating students average grades:', error);
    res.status(500).json({ message: 'Error updating students average grades: ' + error.message });
  }
};

const getClassStudentsAllSubjectsAverage = async (req, res) => {
  try {
    const { classId } = req.query;
    
    if (!classId) {
      return res.status(400).json({ message: 'classId is required' });
    }

    // Get all students in the class
    const classStudents = await ClassStudent.find({ classID: classId })
      .populate('studentID', 'name _id')
      .lean();
    
    if (!classStudents || classStudents.length === 0) {
      return res.status(404).json({ message: 'No students found in this class' });
    }

    const studentIds = classStudents.map(cs => cs.studentID._id);

    // Use aggregation to get all graded answers with test info
    const gradedAnswers = await TestAnswer.aggregate([
      {
        $match: {
          studentID: { $in: studentIds },
          isgraded: true
        }
      },
      {
        $lookup: {
          from: 'tests',
          localField: 'testID',
          foreignField: '_id',
          as: 'test'
        }
      },
      {
        $unwind: '$test'
      },
      {
        $project: {
          studentID: 1,
          subject: '$test.subject',
          grade: {
            $ifNull: ['$teacherGrade', '$AIGrade']
          }
        }
      },
      {
        $match: {
          grade: { $ne: null }
        }
      }
    ]);

    // Build result for each student
    const results = classStudents.map(cs => {
      const student = cs.studentID;
      const studentAnswers = gradedAnswers.filter(
        ans => ans.studentID.toString() === student._id.toString()
      );

      // Group by subject
      const subjectMap = {};
      
      for (const answer of studentAnswers) {
        const subject = answer.subject;
        if (!subjectMap[subject]) {
          subjectMap[subject] = [];
        }
        subjectMap[subject].push(answer.grade);
      }

      // Calculate averages per subject
      const subjects = [];
      let totalScore = 0;
      let subjectCount = 0;

      for (const [subjectName, grades] of Object.entries(subjectMap)) {
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
        subjects.push({
          subjectName,
          averageScore: Math.round(avg * 100) / 100
        });
        totalScore += avg;
        subjectCount++;
      }

      const overallAverage = subjectCount > 0
        ? Math.round((totalScore / subjectCount) * 100) / 100
        : "Chưa có";

      return {
        studentId: student._id,
        studentName: student.name,
        subjects: subjects.length > 0 ? subjects : [],
        overallAverage
      };
    });

    res.status(200).json({
      message: 'Class students average grades retrieved successfully',
      data: results
    });

  } catch (error) {
    console.error('Error getting class students average grades:', error);
    res.status(500).json({ message: 'Error retrieving class students average grades: ' + error.message });
  }
};

// ==================== ADMIN TEACHER MANAGEMENT FUNCTIONS ====================

const AdminGetTeacherData = async (req, res) => {
    try {
        const teachers = await Teacher.find();
        res.status(200).json({
            success: true,
            data: {
                teachers: teachers
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

const AdminCreateTeacherAccount = async (req, res) => {
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
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Ensure age is a number
        const numericAge = Number(age);
        if (Number.isNaN(numericAge)) {
            return res.status(400).json({ message: 'Age must be a number' });
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
            phoneNumber: phoneNumber || '',
            yearsOfExperience: yearsOfExperience || 0,
            avatar: avatar || ''
        });

        await newTeacher.save();

        res.status(201).json({
            success: true,
            message: 'Teacher account created successfully',
            teacher: newTeacher
        });
    } catch (error) {
        console.error('Error creating teacher account:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating teacher account',
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
                message: "Không tìm thấy giáo viên"
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
        
        // Xóa giáo viên
        const deletedTeacher = await Teacher.findByIdAndDelete(teacherId);
        
        if (!deletedTeacher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giáo viên"
            });
        }

        // Cập nhật các lớp có giáo viên này làm giáo viên chủ nhiệm
        const ClassWithTeacher = await Classes.updateMany(
            { class_teacher: teacherId },
            { $set: { class_teacher: null } }
        );

        // Cập nhật các Subject_Teacher có giáo viên này
        const SubjectClassWithTeacher = await SubjectClass.updateMany(
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

const AdminUpdateTeacherByID = async (req, res) => {
    try {
        const teacherId = req.params.id;
        const updateData = req.body;    
        console.log("Cập nhật dữ liệu giáo viên:", updateData);
        const updatedTeacher = await Teacher.findByIdAndUpdate(teacherId, updateData, { new: true });
        if (!updatedTeacher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giáo viên"
            });
        }
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


const GetTeacherById = async (req,res) => {
    try {
        const teacherId = req.user.userId;
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giáo viên"
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
}




// ==================== TEST NOTIFICATION ====================

const testBroadcastNotification = async (req, res) => {
  try {
    // Get WebSocket service instance
    const wsService = req.app.get('wsService');
    
    if (!wsService) {
      return res.status(500).json({
        success: false,
        message: 'WebSocket service không khả dụng'
      });
    }

    // Test data for a single student
    const title = 'test thông báo';
    const message = 'test thông báo';
    const testStudentId = '692fb1de9572f2c8b7204de4';
    
    const testNotification = {
      title: title,
      message: message,
      type: 'new_notification',
      createdAt: new Date(),
      senderId: req.user?.userId,
      senderName: req.user?.name || 'Test Sender'
    };
    
    // Broadcast the notification to a single student
    const sentCount = wsService.broadcastNotificationToStudents([testStudentId], testNotification);
    
    return res.status(200).json({
      success: true,
      message: 'Notification sent to student',
      sentCount,
      studentId: testStudentId,
      notification: testNotification
    });
  } catch (error) {
    console.error('Error in testBroadcastNotification:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi gửi notification',
      error: error.message
    });
  }
};

module.exports = {
  // Authentication
  register,
  login,
  GetTeacherById,
  // Settings
  updateAccountSettings,
  changePassword,
  // Class functions
  TeacherGetClass,
  TeacherGetSubjectClass,
  // Test functions (from test_controller)
  getClassTest: testController.TeacherGetClassTest,
  CreateTest: testController.TeacherCreateTest,
  GetTestDetailById: testController.TeacherGetTestDetailById,
  EditTestById: testController.TeacherEditTestById,
  DeleteTestById: testController.TeacherDeleteTestById,
  TeacherGradingAsnwer: testController.TeacherGradingAnswer,
  getSubmittedAnswers: testController.TeacherGetSubmittedAnswers,
  ClassAvarageGrades: testController.TeacherClassAverageGrades,
  TestsAnylytics: testController.TeacherTestsAnalytics,
  // Question functions (from question_controller)
  CreateQuestion: questionController.TeacherCreateQuestion,
  CreateQuestions: questionController.TeacherCreateQuestions,
  DeleteQuestion: questionController.TeacherDeleteQuestion,
  UpdateQuestion: questionController.TeacherUpdateQuestion,
  // Lesson functions (from lesson_controller)
  createLesson: lessonController.TeacherCreateLesson,
  getTeacherLessons: lessonController.TeacherGetLessons,
  TeacherGetLessonsById: lessonController.TeacherGetLessonsById,
  DeleteLessonById: lessonController.TeacherDeleteLessonById,
  UpdateLesson: lessonController.TeacherUpdateLesson,
  AsignedTestToLesson: lessonController.asignedTestToLesson,
  // Schedule function (from schedule_controller)
  getTeacherSchedule: scheduleController.getTeacherSchedule,
  // Mailing functions
  teacherMailSubjectClass,
  teacherMailHomeroomClass,
  teacherMailToStudent,
  // Grade functions
  getStudentAverageGradeBySubject,
  updateClassStudentsAverageGrade,
  getClassStudentsAllSubjectsAverage,
  // Admin functions for Teacher Management
  AdminGetTeacherData,
  AdminCreateTeacherAccount,
  AdminGetTeacherById,
  AdminDeleteTeacherByID,
  AdminUpdateTeacherByID,
  // Test functions
  testBroadcastNotification
};

