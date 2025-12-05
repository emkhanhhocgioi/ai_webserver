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
const { uploadToCloudinary,deleteImageFromCloudinary } = require('../midlewares/upload');
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
    
    const classDocs = await SubjectClass.find({ 
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

    const tests = await Test.find({ classID: classId });
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
    const { classID, testtitle, subject, participants,test_time, closeDate } = req.body;
    console.log("Creating test with data:", req.body);  
    const newTest = new Test({
      classID,
      teacherID,
      testtitle,
      subject,
      participants,
      test_time,
      closeDate: closeDate,
    });
    await newTest.save();
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
        answers: answerData
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
    const submittedAnswers = await TestAnswer.find({ testID: testId, submit: true }).populate('studentID').populate('testID')
    .populate('answers.questionID', 'question'); 
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
    const { difficult, question, questionType, grade, solution } = req.body;
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
  TeacherGradingAsnwer

};
