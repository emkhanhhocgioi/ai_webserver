const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Teacher = require('../schema/teacher');
const Classes = require('../schema/class_schema');
const ClassStudent = require('../schema/class_student');
const SubjectClass = require('../schema/subject_teacher');
const Student = require('../schema/student');
const Test = require('../schema/test_schema');
const Question = require('../schema/test_question');
const TestAnswer = require('../schema/test_answer');
const Lesson = require('../schema/class_lesson');
const { uploadToCloudinary,deleteImageFromCloudinary } = require('../midlewares/upload');
const { CreateTestNotification } = require('./notifications_controller');
// Controller functions
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

// Teacher Class
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

// Teacher Subject Class

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

    // Attach studentCount to each classDoc
    classDocs = classDocs.map(cd => {
      const cid = cd.classid ? (cd.classid._id || cd.classid) : null;
      const sc = studentCounts.find(s => s._id && cid && s._id.toString() === cid.toString());
      return {
      ...cd.toObject(),
      studentCount: sc ? sc.count : 0
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

// Teacher Test
const getClassTest = async (req, res) => {
  try {
    
    const { classId } = req.params;
    
    const teacherId = req.user.userId;
    const teacherSubject = await Teacher.findById(teacherId).select('subject');
    if (!teacherSubject) {
      return res.status(404).json({ message: 'Giáo viên không tồn tại' });
    }
    const tests = await Test.find({ classID: classId , subject: teacherSubject.subject });
    const submitCounts = await TestAnswer.aggregate([
      { $match: { testID: { $in: tests.map(test => test._id) }, submit: true } },
      { $group: { _id: "$testID", count: { $sum: 1 } } }
    ]);
    const mergedResults = tests.map(test => {
      const submitCount = submitCounts.find(sc => sc._id.toString() === test._id.toString());
      return {
        ...test.toObject(),
        submittedCount: submitCount ? submitCount.count : 0
      };
    });

    if (!tests || tests.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra cho lớp này' });
    }
    
    res.status(200).json({  tests: mergedResults });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi trong bài kiểm tra giáo viên' });
    console.error('Lỗi trong bài kiểm tra giáo viên:', error);
  }
};
const CreateTest = async (req, res) => {
  try {
    const teacherID = req.user.userId;
    const { classID, testtitle, subject, closeDate } = req.body;
    console.log("Creating test with data:", req.body);  
    const newTest = new Test({
      classID,
      teacherID,
      testtitle,
      subject,
      closeDate: closeDate,
    });
    await newTest.save();
    
    // Tạo và gửi thông báo cho học sinh
    try {
      const wsService = req.app.get('wsService');
      await CreateTestNotification(
        teacherID,
        classID,
        newTest._id,
        testtitle,
        subject,
        closeDate,
        wsService
      );
      console.log('Test notification sent successfully');
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Không throw error để không ảnh hưởng đến việc tạo test
    }
    
    res.status(201).json({ message: 'Bài kiểm tra được tạo thành công', test: newTest });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo bài kiểm tra' });
    console.error('Lỗi khi tạo bài kiểm tra:', error);
  }
};
const EditTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    const updateData = req.body;  
    console.log("Updating test ID:", testId, "with data:", updateData);
    const updatedTest = await Test.findByIdAndUpdate(testId, updateData, { new: true });
    if (!updatedTest) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }
    res.status(200).json({  
      message: 'Bài kiểm tra đã được cập nhật thành công',
      test: updatedTest
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật bài kiểm tra' });
    console.error('Lỗi khi cập nhật bài kiểm tra:', error);
  }
};
const DeleteTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    const deletedTest = await Test.findByIdAndDelete(testId);
    if (!deletedTest) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }
    res.status(200).json({ message: 'Bài kiểm tra đã được xóa thành công' });
  } catch (error) { 
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa bài kiểm tra' });
    console.error('Lỗi khi xóa bài kiểm tra:', error);
  }
};
const GetTestDetailById = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }

    // Lấy tất cả câu hỏi của bài kiểm tra
    const questions = await Question.find({ testid: testId });

    res.status(200).json({ 
      test,
      questions 
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy chi tiết bài kiểm tra' });
    console.error('Lỗi khi lấy chi tiết bài kiểm tra:', error);
  }
};
const TeacherGradingAsnwer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { teacherGrade, teacherComments, answerData } = req.body;
    console.log("Grading answer with data:", req.body);
    console.log("Answer ID:", answerId);
    console.log("Answer Data received:", JSON.stringify(answerData, null, 2));
    
    const updatedAnswer = await TestAnswer.findByIdAndUpdate(
      answerId,
      { 
        teacherGrade, 
        teacherComments,
        answers: answerData,
        isgraded: true
      },
      { new: true }
    );
    
    if (!updatedAnswer) {
      return res.status(404).json({ message: 'Câu trả lời không tồn tại' });
    }
    
    console.log("Updated answer:", updatedAnswer);
    
    res.status(200).json({
      message: 'Câu trả lời đã được chấm điểm thành công',
      answer: updatedAnswer
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi chấm điểm câu trả lời' });
    console.error('Lỗi khi chấm điểm câu trả lời:', error);
  }
};

// Teacher Answer

const getSubmittedAnswers = async (req, res) => {
  try {
    const { testId } = req.params;  
    const submittedAnswers = await TestAnswer.find({ testID: testId, submit: true }).populate('studentID','name avatar' ).populate('testID',
    'subject'
    )
    .populate('answers.questionID', 'question questionType'); 
    res.status(200).json({ submittedAnswers });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy câu trả lời đã nộp' });
    console.error('Lỗi khi lấy câu trả lời đã nộp:', error);
  }
};


// test question management
const CreateQuestion = async (req, res) => {
  try {
    const { testId } = req.params;
    const { difficult, question, questionType,subjectQuestionType, grade, solution } = req.body;
    let { metadata, options } = req.body;

    // Parse options if it's a JSON string
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = [];
      }
    }

    // Kiểm tra xem bài test có tồn tại không
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }

    // Xử lý upload file nếu có
    if (req.file) {
      try {
        const imageUrl = await uploadToCloudinary(
          req.file.buffer, 
          req.file.originalname,
          'questionImages'
        );
        metadata = imageUrl;
      } catch (uploadError) {
        console.error('Lỗi upload ảnh:', uploadError);
        return res.status(500).json({ message: 'Lỗi khi upload ảnh câu hỏi' });
      }
    } else {
      metadata = null;
    }

    // Tạo câu hỏi mới
    const newQuestion = new Question({
      testid: testId,
      difficult,
      question,
      questionType,
      subjectQuestionType,
      grade,
      solution,
      metadata,
      options
    });

    await newQuestion.save();

    res.status(201).json({ 
      message: 'Câu hỏi được tạo thành công', 
      question: newQuestion 
    });

  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo câu hỏi' });
    console.error('Lỗi khi tạo câu hỏi:', error);
  }
};
const CreateQuestions = async (req, res) => {
  try {
    const { testId } = req.params;
    const questionsData = req.body.questions; // Mảng các câu hỏi 
    const createdQuestions = [];
    const files = req.files || []; // Array of uploaded files

    // Kiểm tra xem bài test có tồn tại không
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }
    
    for (let i = 0; i < questionsData.length; i++) {
      const questionData = questionsData[i];
      const { difficult, question, questionType, grade, solution, options } = questionData;
      let metadata = questionData.metadata;
      
      // Check if there's a corresponding file for this question
      const fileForQuestion = files.find(f => f.fieldname === `file_${i}`);
      
      if (fileForQuestion) {
        try {
          const uploadResult = await uploadToCloudinary(fileForQuestion.buffer, fileForQuestion.originalname);
          metadata = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('Lỗi khi upload ảnh:', uploadError);
          metadata = questionData.metadata || null;
        }
      }
      
      const newQuestion = new Question({
        testid: testId,
        difficult,
        question,
        questionType,
        grade,  
        solution,
        metadata,
        options
      });
      await newQuestion.save();
      createdQuestions.push(newQuestion);
    }
    res.status(201).json({ 
      message: 'Các câu hỏi được tạo thành công', 
      questions: createdQuestions 
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo các câu hỏi' });
    console.error('Lỗi khi tạo các câu hỏi:', error);
  }
};
const DeleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const deletedQuestion = await Question.findByIdAndDelete(questionId);

    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Câu hỏi không tồn tại' });
    }
    res.status(200).json({ message: 'Câu hỏi đã được xóa thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa câu hỏi' });
    console.error('Lỗi khi xóa câu hỏi:', error);
  }
};
const UpdateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const updateData = { ...req.body };
    
    // Parse options if it's a JSON string
    if (typeof updateData.options === 'string') {
      try {
        updateData.options = JSON.parse(updateData.options);
      } catch (e) {
        updateData.options = [];
      }
    }
    const isExistingQuestion = await Question.findById(questionId);
    if (!isExistingQuestion) {
      return res.status(404).json({ message: 'Câu hỏi không tồn tại' });
    }
    
    // Xử lý upload file mới nếu có
    if (req.file) {
      // Xóa ảnh cũ nếu tồn tại
      if (isExistingQuestion.metadata) {
        try {
          await deleteImageFromCloudinary(isExistingQuestion.metadata);
          console.log('Old image deleted successfully from Cloudinary');
        } catch (deleteError) {
          console.error('Lỗi khi xóa ảnh cũ:', deleteError);
          // Tiếp tục upload ảnh mới ngay cả khi xóa ảnh cũ thất bại
        }
      }
      
      // Upload ảnh mới
      try {
        const imageUrl = await uploadToCloudinary(
          req.file.buffer, 
          req.file.originalname,
          'questionImages'
        );
        updateData.metadata = imageUrl;
      } catch (uploadError) {
        console.error('Lỗi upload ảnh:', uploadError);
        return res.status(500).json({ message: 'Lỗi khi upload ảnh câu hỏi' });
      }
    } else if (updateData.metadata === undefined) {
      // Nếu không có file mới và metadata không được gửi trong body, giữ nguyên metadata cũ
      // Không làm gì
    } else if (updateData.metadata === '' || updateData.metadata === 'null') {
      // Nếu muốn xóa metadata
      if (isExistingQuestion.metadata) {
        try {
          await deleteImageFromCloudinary(isExistingQuestion.metadata);
          console.log('Image deleted from Cloudinary');
        } catch (deleteError) {
          console.error('Lỗi khi xóa ảnh:', deleteError);
        }
      }
      updateData.metadata = null;
    }
    
    const updatedQuestion = await Question.findByIdAndUpdate(questionId, updateData, { new: true });
    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Câu hỏi không tồn tại' });
    }
    res.status(200).json({
      message: 'Câu hỏi đã được cập nhật thành công',
      question: updatedQuestion
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật câu hỏi' });
    console.error('Lỗi khi cập nhật câu hỏi:', error);
  }
};

// Lesson Management

const createLesson = async (req, res) => {
  try {
    const { title, classId, subject } = req.body;
    const teacherId = req.user.userId;
    let lessonMetadata = null;
    let fileType = null;
    if (req.file) {
      try {
        fileType = req.file.mimetype;
        lessonMetadata = await uploadToCloudinary(
          req.file.buffer,
          req.file.originalname,
          'lessonMaterials'
        );
      } catch (uploadError) {
        console.error('Error uploading lesson file:', uploadError);
        return res.status(500).json({ message: 'Error uploading lesson file' });
      }
    }
    
    const newLesson = new Lesson({
      title,
      classId,
      teacherId,
      subject,
      lessonMetadata,
      fileType: fileType
    });
    
    await newLesson.save();
    res.status(201).json({ message: 'Lesson created successfully', lesson: newLesson });
  } catch (error) {
    res.status(500).json({ message: 'Error creating lesson' });
    console.error('Error creating lesson:', error);
  }
}

const getTeacherLessons = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const { classId } = req.query; // Get classId from query params
    
    // Build query object
    const query = { teacherId };
    if (classId) {
      query.classId = classId;
    }
    
    const lessons = await Lesson.find(query);
    
    if (!lessons || lessons.length === 0) {
      return res.status(200).json({ message: 'No lessons found for this teacher', lessons: [] });
    }
    
    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lessons' });
    console.error('Error fetching lessons:', error);
  }
};

const TeacherGetLessonsById= async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId).populate('classId').populate('teacherId', 'name');

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    } 
    res.status(200).json({ lesson });
  }
  catch (error) {
    res.status(500).json({ message: 'Error fetching lesson details' });
    console.error('Error fetching lesson details:', error);
  }
};

const DeleteLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const deletedLesson = await Lesson.findByIdAndDelete(lessonId);
    if (!deletedLesson) { 
      return res.status(404).json({ message: 'Lesson not found' }); 
    }
    res.status(200).json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lesson' });
    console.error('Error deleting lesson:', error);
  }
};
const UpdateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, classId, teacherId, subject } = req.body;
    
    const isExistingLesson = await Lesson.findById(lessonId);
    if (!isExistingLesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Prepare update data
    const updateData = {
      title,
      classId,
      teacherId,
      subject
    };
    
    // Handle new file upload if exists
    if (req.file) {
      // Delete old file if exists    
      if (isExistingLesson.lessonMetadata) {
        try {
          await deleteImageFromCloudinary(isExistingLesson.lessonMetadata); 
          console.log('Old lesson file deleted successfully from Cloudinary');
        } catch (deleteError) {
          console.error('Error deleting old lesson file:', deleteError);
        }
      } 
      // Upload new file
      try {
        const fileUrl = await uploadToCloudinary(
          req.file.buffer, 
          req.file.originalname,
          'lessonMaterials'
        );
        updateData.lessonMetadata = fileUrl;
      }
      catch (uploadError) {
        console.error('Error uploading lesson file:', uploadError); 
        return res.status(500).json({ message: 'Error uploading lesson file' });
      } 
    }
    // If no new file uploaded, keep the existing metadata
    // Don't delete or modify lessonMetadata unless explicitly uploading a new file
    const updatedLesson = await Lesson.findByIdAndUpdate(lessonId, updateData, { new: true });
    if (!updatedLesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    } 
    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      lesson: updatedLesson
    });
  }
  catch (error) {
    res.status(500).json({ message: 'Error updating lesson' });
    console.error('Error updating lesson:', error);
  }
};



module.exports = {
  register,
  login,
  TeacherGetClass,
  TeacherGetSubjectClass,
  getClassTest,
  CreateTest,
  GetTestDetailById,
  CreateQuestion,
  DeleteQuestion,
  UpdateQuestion,
  DeleteTestById,
  EditTestById,
  getSubmittedAnswers,
  TeacherGradingAsnwer,
  CreateQuestions,
  createLesson,
  getTeacherLessons ,
  DeleteLessonById,
  UpdateLesson,
  TeacherGetLessonsById

};
