const { default: mongoose } = require('mongoose');
const Question = require('../schema/test_question');
const Test = require('../schema/test_schema');
const { uploadToCloudinary, deleteImageFromCloudinary } = require('../midlewares/upload');
const { logActivity } = require('../service/user_activity_service');

const addQuestion = async (req, res) =>{
    try {
        const  {testid , difficult ,question,questionType ,grade, solution,metadata} = req.body
         
        if(!testid || !difficult || !question || !questionType || !grade || !solution   ){
             return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }
        const questiondocs = new Question({
            testid,
            difficult,
            question,
            questionType,
            grade,
            solution,
            metadata,
            
        })
        await questiondocs.save();
         
        if(questiondocs){
            res.status(200).json({
                success: true,
                message: 'success',
               
            })
        }
    } catch (error) {
        console.log(error)
          return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
    
}


const editQuestion = async (req, res) => {
    try {
        const { 
            questionId,  // ID của câu hỏi cần update
            testid, 
            difficult, 
            question, 
            questionType, 
            grade, 
            solution, 
            metadata, 
         
        } = req.body;

        // Validate dữ liệu đầu vào
        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: 'Question ID là bắt buộc'
            });
        }

        // Kiểm tra câu hỏi có tồn tại không
        const existingQuestion = await Question.findById(questionId);
        if (!existingQuestion) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy câu hỏi'
            });
        }

        // Chuẩn bị dữ liệu cập nhật (chỉ update các trường được gửi lên)
        const updateData = {};
        if (testid !== undefined) updateData.testid = testid;
        if (difficult !== undefined) updateData.difficult = difficult;
        if (question !== undefined) updateData.question = question;
        if (questionType !== undefined) updateData.questionType = questionType;
        if (grade !== undefined) updateData.grade = grade;
        if (solution !== undefined) updateData.solution = solution;
        if (metadata !== undefined) updateData.metadata = metadata;
       

        // Thêm thời gian cập nhật
        updateData.updatedAt = new Date();

        // Cập nhật câu hỏi
        const updatedQuestion = await Question.findByIdAndUpdate(
            questionId,
            { $set: updateData },
            { 
                new: true,  // Trả về document sau khi update
                runValidators: true  // Chạy validation của schema
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Cập nhật câu hỏi thành công',
            data: updatedQuestion
        });

    } catch (error) {
        console.error('Error updating question:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật câu hỏi',
            error: error.message
        });
    }
};
const deleteMultipleQuestions = async (req, res) => {
    try {
        const { questionIds } = req.body; // Array of IDs

        // Validate
        if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Danh sách question IDs là bắt buộc'
            });
        }

        // Xóa nhiều câu hỏi
        const result = await Question.deleteMany({
            _id: { $in: questionIds }
        });

        return res.status(200).json({
            success: true,
            message: `Đã xóa ${result.deletedCount} câu hỏi`,
            data: {
                deletedCount: result.deletedCount
            }
        });

    } catch (error) {
        console.error('Error deleting questions:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa câu hỏi',
            error: error.message
        });
    }
};


const fetchTestQuestion = async (req, res) => {
    try {
        const { testid } = req.params;

        // Validate param
        if (!testid) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: testid"
            });
        }

        // Convert to ObjectId
        let testidObj;
        try {
            testidObj = new mongoose.Types.ObjectId(testid);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid testid format"
            });
        }

        // Query DB
        const docs = await Question.find({ testid: testidObj });

        return res.status(200).json({
            success: true,
            data: docs
        });

    } catch (error) {
        console.error("Fetch test question error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
// ==================== TEACHER QUESTION FUNCTIONS ====================

const TeacherCreateQuestion = async (req, res) => {
  try {
    const { testId } = req.params;
    const { difficult, question, questionType, subjectQuestionType, grade, solution } = req.body;
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
        const uploadResult = await uploadToCloudinary(
          req.file.buffer, 
          req.file.originalname,
          'questionImages'
        );
        metadata = uploadResult.secure_url;
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

    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Tạo câu hỏi cho bài kiểm tra`,
      testId: testId
    });

    res.status(201).json({ 
      message: 'Câu hỏi được tạo thành công', 
      question: newQuestion 
    });

  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo câu hỏi' });
    console.error('Lỗi khi tạo câu hỏi:', error);
  }
};

const TeacherCreateQuestions = async (req, res) => {
  try {
    const { testId } = req.params;

    // Handle both array and object with questions property
    let questionsData;
    if (Array.isArray(req.body)) {
      questionsData = req.body;
    } else if (req.body.questions) {
      questionsData = typeof req.body.questions === 'string' 
        ? JSON.parse(req.body.questions) 
        : req.body.questions;
    } else {
      return res.status(400).json({ message: 'Dữ liệu câu hỏi không hợp lệ' });
    }

    console.log('questionsData parsed:', questionsData);
    console.log('Number of questions:', questionsData.length);
    
    const createdQuestions = [];
    const files = req.files || [];

    // Kiểm tra bài test tồn tại
    const test = await Test.findById(testId);
    if (!test) {
      console.error('❌ Test không tồn tại:', testId);
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }

    for (let i = 0; i < questionsData.length; i++) {
      const questionData = questionsData[i];
      console.log(`\n🟡 [QUESTION ${i + 1}] Dữ liệu ban đầu:`, questionData);

      const {
        difficult,
        question,
        questionType,
        subjectQuestionType,
        grade,
        solution,
        options
      } = questionData;

      let metadata = questionData.metadata || null;

      // Tìm file tương ứng với câu hỏi
      const fileForQuestion = files.find(
        f => f.fieldname === `file_${i}`
      );

      if (fileForQuestion) {
        console.log(`🟡 [QUESTION ${i + 1}] Có file upload:`, {
          filename: fileForQuestion.originalname,
          size: fileForQuestion.size
        });

        try {
          const uploadResult = await uploadToCloudinary(
            fileForQuestion.buffer,
            fileForQuestion.originalname
          );
          metadata = uploadResult.secure_url;

          console.log(`🟢 [QUESTION ${i + 1}] Upload thành công:`, metadata);
        } catch (uploadError) {
          console.error(`🔴 [QUESTION ${i + 1}] Lỗi upload ảnh:`, uploadError);
        }
      } else {
        console.log(`⚪ [QUESTION ${i + 1}] Không có file upload`);
      }

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

      console.log(`🟡 [QUESTION ${i + 1}] Trước khi save DB`);

      await newQuestion.save();

      console.log(`🟢 [QUESTION ${i + 1}] Đã lưu DB với ID:`, newQuestion._id);

      createdQuestions.push(newQuestion);
    }

    console.log('✅ Tạo câu hỏi hoàn tất');

    res.status(201).json({
      message: 'Các câu hỏi được tạo thành công',
      questions: createdQuestions
    });

  } catch (error) {
    console.error('🔥 Lỗi tổng khi tạo câu hỏi:', error);
    res.status(500).json({
      message: 'Đã xảy ra lỗi khi tạo các câu hỏi'
    });
  }
};

const TeacherDeleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const deletedQuestion = await Question.findByIdAndDelete(questionId);

    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Câu hỏi không tồn tại' });
    }
    
    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Xóa câu hỏi`,
      testId: deletedQuestion.testid
    });
    
    res.status(200).json({ message: 'Câu hỏi đã được xóa thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa câu hỏi' });
    console.error('Lỗi khi xóa câu hỏi:', error);
  }
};

const TeacherUpdateQuestion = async (req, res) => {
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
        }
      }
      
      // Upload ảnh mới
      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer, 
          req.file.originalname,
          'questionImages'
        );
        updateData.metadata = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Lỗi upload ảnh:', uploadError);
        return res.status(500).json({ message: 'Lỗi khi upload ảnh câu hỏi' });
      }
    } else if (updateData.metadata === undefined) {
      // Nếu không có file mới và metadata không được gửi trong body, giữ nguyên metadata cũ
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
    
    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Cập nhật câu hỏi`,
      testId: updatedQuestion.testid
    });
    
    res.status(200).json({
      message: 'Câu hỏi đã được cập nhật thành công',
      question: updatedQuestion
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật câu hỏi' });
    console.error('Lỗi khi cập nhật câu hỏi:', error);
  }
};

module.exports = {addQuestion,
    deleteMultipleQuestions,
    editQuestion,
   fetchTestQuestion,
   // Teacher Question functions
   TeacherCreateQuestion,
   TeacherCreateQuestions,
   TeacherDeleteQuestion,
   TeacherUpdateQuestion
};

