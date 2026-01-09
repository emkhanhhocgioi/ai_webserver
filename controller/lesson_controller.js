const Lesson = require('../schema/class_lesson')
const ClassStudent = require('../schema/class_student')
const TestScheme = require('../schema/test_schema')
const Teacher = require('../schema/teacher')
const { logActivity } = require('../service/user_activity_service');
const { uploadToCloudinary, deleteImageFromCloudinary } = require('../midlewares/upload');
const TestAnswer = require('../schema/test_answer');

// Create a new lesson
const createLesson = async (req, res) => {
    try {
        const { classid, teacherid, name, timeCreated, desc ,  metadata } = req.body;

        if (!classid || !teacherid || !name || !desc || !metadata) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newLesson = new Lesson({
            classid,
          
            teacherid,
            name,
            timeCreated: timeCreated || new Date(),
            desc,
            metadata: " "
        });

        const savedLesson = await newLesson.save();
        res.status(201).json({
            message: 'Lesson created successfully',
            lesson: savedLesson
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error creating lesson',
            error: error.message
        });
    }
};

// Get all lessons
const getAllLessons = async (req, res) => {
    try {
        const lessons = await Lesson.find()
            .populate('classid')
            .populate('teacherid');
        res.status(200).json({
            message: 'Lessons retrieved successfully',
            lessons: lessons
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error retrieving lessons',
            error: error.message
        });
    }
};

// Get lesson by ID
const getLessonById = async (req, res) => {
    try {
        const { id } = req.params;
        const lesson = await Lesson.findById(id)
            .populate('classid')
            .populate('teacherid');
        
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        res.status(200).json({
            message: 'Lesson retrieved successfully',
            lesson: lesson
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error retrieving lesson',
            error: error.message
        });
    }
};

// Update lesson
const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { classid, teacherid, name, desc, metadata } = req.body;

        const updatedLesson = await Lesson.findByIdAndUpdate(
            id,
            {
                classid,
                teacherid,
                name,
                desc,
                metadata
            },
            { new: true, runValidators: true }
        );

        if (!updatedLesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        res.status(200).json({
            message: 'Lesson updated successfully',
            lesson: updatedLesson
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error updating lesson',
            error: error.message
        });
    }
};

// Delete lesson
const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedLesson = await Lesson.findByIdAndDelete(id);

        if (!deletedLesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        res.status(200).json({
            message: 'Lesson deleted successfully',
            lesson: deletedLesson
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error deleting lesson',
            error: error.message
        });
    }
};
// ==================== STUDENT LESSON FUNCTIONS ====================

const getStudentLessons = async (req, res) => {
    try {
        const studentId = req.user.userId;
        // Find the class ID for the student
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: 'Lớp học sinh không tìm thấy' });
        }
        const classId = classStudent.classID;

        // Find lessons for the class
        const lessons = await Lesson.find({ classId });
        res.status(200).json({ lessons });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lessons' });
        console.error('Error fetching lessons:', error);
    }
};
const getLessonBySubjectforStudent = async (req, res) => {
    try {
        const studentId = req.user.userId;  
        const { subject } = req.params;
        // Find the class ID for the student
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: 'Lớp học sinh không tìm thấy' });
        }
        const classId = classStudent.classID;

        // Find lessons for the class and subject
        const lessons = await Lesson.find({ classId, subject: subject }).select('title');
        res.status(200).json({ lessons });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lessons by subject' });
        console.error('Error fetching lessons by subject:', error);
    }
};

// Search for lesson or test by query
const searchLessonsAndTests = async (req, res) => {
    try {
        const { query } = req.query;
        const studentId = req.user.userId;
        // Find the class ID for the student
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: 'Lớp học sinh không tìm thấy' });
        }
        const classId = classStudent.classID;

        // Search for lessons
        const lessons = await Lesson.find({ 
            classId,
            $or: [  
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } }
            ]
        });
        // Search for tests
        const tests = await TestScheme.find({ 
            classID: classId,
            $or: [  
                { testtitle: { $regex: query, $options: 'i' } },
            ]
        });
        
        // Check submission and grading status for each test
        const testsWithStatus = await Promise.all(tests.map(async (test) => {
            const testAnswer = await TestAnswer.findOne({ 
                testID: test._id, 
                studentID: studentId 
            });
            
            return {
                ...test.toObject(),
                status: {
                    submitted: !!testAnswer, // true if testAnswer exists
                    graded: testAnswer?.isgraded // true if score exists
                }
            };
        }));
        
        // Log activity
        await logActivity({
            userId: studentId,
            role: 'student',
            action: `Tìm kiếm bài học và bài kiểm tra: "${query}"`
        });
        
        res.status(200).json({ lessons, tests: testsWithStatus });
    } catch (error) {
        res.status(500).json({ message: 'Error searching lessons and tests' });
        console.error('Error searching lessons and tests:', error);
    }
};

const searchTeachersByQuery = async (req, res) => {
    try {
        const { query } = req.query;
        // Search for teachers  
        const teachers = await Teacher.find({ 
            $or: [  
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        });
        
        // Log activity
        const studentId = req.user.userId;
        await logActivity({
            userId: studentId,
            role: 'student',
            action: `Tìm kiếm giáo viên: "${query}"`
        });
        
        res.status(200).json({ teachers });
    } catch (error) {
        res.status(500).json({ message: 'Error searching teachers' });
        console.error('Error searching teachers:', error);
    }
};

// Teacher_contact routes
const TeacherContact = async (req, res) => {
    try {
        // Find teachers for the class
        const teachers = await Teacher.find({ });
   
        res.status(200).json({ teachers });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teacher contacts' });
        console.error('Error fetching teacher contacts:', error);
    }
};

// ==================== TEACHER LESSON FUNCTIONS ====================

const TeacherCreateLesson = async (req, res) => {
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
    
    // Log activity
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Tạo bài học: "${title}"`,
      lessonId: newLesson._id
    });
    
    res.status(201).json({ message: 'Lesson created successfully', lesson: newLesson });
  } catch (error) {
    res.status(500).json({ message: 'Error creating lesson' });
    console.error('Error creating lesson:', error);
  }
};

const TeacherGetLessons = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const { classId } = req.query;
    
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

const TeacherGetLessonsById = async (req, res) => {
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

const TeacherDeleteLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!lessonId) {
      return res.status(400).json({ message: 'Lesson ID is required' });
    }
    
    // First, find the lesson to get its metadata
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) { 
      return res.status(404).json({ message: 'Lesson not found' }); 
    }
    
    // Delete file from Cloudinary if metadata exists
    if (lesson.lessonMetadata) {
      const response = await deleteImageFromCloudinary(lesson.lessonMetadata);
      if (response) {
        console.log('Lesson file deleted successfully from Cloudinary');
      }
    }
    
    // Delete the lesson from database
    await Lesson.findByIdAndDelete(lessonId);
    
    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Xóa bài học: "${lesson.title}"`,
      lessonId: lessonId
    });
    
    res.status(200).json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lesson' });
    console.error('Error deleting lesson:', error);
  }
};

const TeacherUpdateLesson = async (req, res) => {
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
    
    const updatedLesson = await Lesson.findByIdAndUpdate(lessonId, updateData, { new: true });
    if (!updatedLesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Log activity
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Cập nhật bài học: "${updatedLesson.title}"`,
      lessonId: lessonId
    });
    
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
const asignedTestToLesson = async (req, res) => {
    try {
        const { lessonId, testId } = req.body;
        const lesson = await Lesson.findByIdAndUpdate(
            lessonId,
            { $push: { tests: testId } },
            { new: true }
        );
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }   
        res.status(200).json({
            message: 'Test assigned to lesson successfully',
            lesson: lesson
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error assigning test to lesson',
            error: error.message
        });
    }   
};




module.exports = {
    createLesson,
    getAllLessons,
    getLessonById,
    updateLesson,
    deleteLesson,
    // Student Lesson functions
    getStudentLessons,
    getLessonBySubjectforStudent,
    searchLessonsAndTests,
    searchTeachersByQuery,
    TeacherContact,
    // Teacher Lesson functions
    TeacherCreateLesson,
    TeacherGetLessons,
    TeacherGetLessonsById,
    TeacherDeleteLessonById,
    TeacherUpdateLesson,
    asignedTestToLesson
};

