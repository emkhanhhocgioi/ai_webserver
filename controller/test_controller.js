const TestScheme = require('../schema/test_schema')
const Teacher = require('../schema/teacher')
const ClassStudent = require('../schema/class_student')
const Question = require('../schema/test_question')
const TestAnswer = require('../schema/test_answer')
const Class = require('../schema/class_schema')
const Student = require('../schema/student')
const SubjectClass = require('../schema/subject_teacher')
const mongoose = require('mongoose')
const { logActivity } = require('../service/user_activity_service');
const AI_controller = require('./AI_controller');
const { CreateTestNotification } = require('./notifications_controller');


// student test data 

const getStudentClassTest = async (req, res) => {
    try {
        const { studentid } = req.params;
        const classStudent = await ClassStudent.findOne({ studentID: studentid });
        if (!classStudent) {
            return res.status(404).json({ message: "Lớp học sinh không tìm thấy" });
        }
        const tests = await TestScheme.find({ classID: classStudent.classID, status: 'open'});
        res.status(200).json(tests);
    } catch (error) {
        console.error('Lỗi lấy bài kiểm tra:', error);
        res.status(500).json({ message: "Lỗi server" });
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
        
        const ClassTests = await TestScheme.find({ classID: classId })
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
};

const getTestReportById = async (req, res) => {
    // TODO: Implement test report by test ID
    res.status(501).json({
        success: false,
        message: "Chức năng đang được phát triển"
    });
};

const getStudentTestPerformance = async (req, res) => {
    // TODO: Implement student test performance report
    res.status(501).json({
        success: false,
        message: "Chức năng đang được phát triển"
    });
};

const getOverallTestStatistics = async (req, res) => {
    // TODO: Implement overall test statistics
    res.status(501).json({
        success: false,
        message: "Chức năng đang được phát triển"
    });
};
// Get tests for student's class (with auth)
const StudentGetClassTest = async (req, res) => {
    try {
        const studentid = req.user.userId;
        console.log("Fetching tests for student ID:", studentid);

        const classStudent = await ClassStudent.findOne({ studentID: studentid });
        if (!classStudent) {
            return res.status(404).json({ message: "Lớp học sinh không tìm thấy" });
        }

        // Use .lean() to get plain objects we can mutate safely and fetch tests in parallel
        const tests = await TestScheme.find({ classID: classStudent.classID, status: 'open' }).lean();

        const enrichedTests = await Promise.all(tests.map(async (test) => {
            const existingAnswer = await TestAnswer.findOne({ 
                testID: test._id, 
                studentID: studentid 

            });
            test.hasSubmitted = !!existingAnswer;
            test.isGraded=  !!existingAnswer?.isgraded || false;
            return test;
        }));

        res.status(200).json(enrichedTests);
    } catch (error) {
        console.error('Lỗi lấy bài kiểm tra:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const GetTestDetailById = async (req, res) => {
    try {
        let status = false;
        const { testId } = req.params;
        const test = await TestScheme.findById(testId);
        const studentid = req.user.userId;

        if (!test) {
            return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
        }

        // Lấy tất cả câu hỏi của bài kiểm tra
        const questions = await Question.find({ testid: testId }).select('-solution');
        const answer = await TestAnswer.findOne({ testID: testId, studentID: studentid });
        if (answer) {
            status = true;
        }

        res.status(200).json({ 
            test,
            questions,
            status,
        });
    } catch (error) {
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy chi tiết bài kiểm tra' });
        console.error('Lỗi khi lấy chi tiết bài kiểm tra:', error);
    }
};

const GetTestGradingById = async (req, res) => {
    try {
        const { testId } = req.params;
        const test = await TestScheme.findById(testId);
        const studentid = req.user.userId;
        if (!test) {
            return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
        }   
        // Lấy tất cả câu hỏi của bài kiểm tra
        const questions = await Question.find({ testid: testId }).select('-solution');
        const answer = await TestAnswer.findOne({ testID: testId, studentID: studentid });
        res.status(200).json({ 
            test,
            questions,
            answer
        });
    } catch (error) {
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy chi tiết bài kiểm tra' });
        console.error('Lỗi khi lấy chi tiết bài kiểm tra:', error);
    }
};

const GetRecentInCorrectAnswers = async (req, res) => {
    try {
        const studentid = req.user.userId;
        const { subject, testid } = req.body;
        console.log("Fetching recent incorrect answers for student ID:", studentid, "subject:", subject, "testid:", testid); 
        
        // Populate questionID để lấy chi tiết câu hỏi
        const Answers = await TestAnswer.find({ studentID: studentid, testID: testid })
            .populate({
                path: 'answers.questionID',
                select: 'question questionType solution options'
            })
            .populate('testID', 'testtitle subject');
           
        console.log("Recent Answers fetched:", Answers.length);
        
        if(!Answers || Answers.length === 0){
            return res.status(200).json({ 
                message: 'Không tìm thấy câu trả lời sai gần đây',
                incorrectAnswers: []
            });
        }
        
        // Lấy tất cả câu trả lời sai với chi tiết đầy đủ
        const incorrectAnswersDetails = [];
        
        for (const answer of Answers) {
            const incorrectQuestions = answer.answers.filter(a => !a.isCorrect && a.questionID);
            
            if (incorrectQuestions.length > 0) {
                const testInfo = {
                    testId: answer.testID._id,
                    testTitle: answer.testID.testtitle,
                    testSubject: answer.testID.subject,
                    submissionTime: answer.submissionTime,
                    incorrectQuestions: incorrectQuestions.map(iq => ({
                        questionId: iq.questionID._id,
                        question: iq.questionID.question,
                        questionType: iq.questionID.questionType,
                        options: iq.questionID.options,
                        solution: iq.questionID.solution,
                        studentAnswer: iq.answer,
                        isCorrect: iq.isCorrect
                    }))
                };
                
                incorrectAnswersDetails.push(testInfo);
            }
        }
        
        // Thống kê loại câu hỏi sai
        const questTypes = Array.from(new Set(
            incorrectAnswersDetails.flatMap(test => 
                test.incorrectQuestions.map(iq => iq.questionType).filter(Boolean)
            )
        ));
        
        console.log("Incorrect Question Types:", questTypes);
        console.log("Total incorrect questions:", incorrectAnswersDetails.reduce((sum, test) => sum + test.incorrectQuestions.length, 0));
        
        const responseai = await AI_controller.GetRecentInCorrectAnswers(incorrectAnswersDetails, questTypes,subject);
        if(!responseai){
            return res.status(500).json({ message: 'Lỗi khi lấy câu trả lời sai từ AI' });
        }
        res.status(200).json({ 
            message: 'Lấy danh sách câu trả lời sai thành công',
            data: responseai
        });
        
    } catch (error) {
        console.error('Error fetching incorrect answers:', error);
        res.status(500).json({ message: 'Lỗi khi lấy câu trả lời sai' });
    }
};

// Student grade controller
const getAllSubjectsGrade = async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        // Hàm chuẩn hóa tên môn học
        const normalizeSubject = (subject) => {
            return subject.toLowerCase().trim().replace(/\s+/g, ' ');
        };
        
        // Lấy lớp của học sinh
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: 'Không tìm thấy lớp của học sinh' });
        }

        // Lấy tất cả câu trả lời đã nộp và đã chấm
        const answers = await TestAnswer.find({ 
            studentID: studentId, 
            submit: true, 
            isgraded: true 
        })
            .select('teacherGrade')
            .populate('testID', 'subject');

        // Tính tổng và số lượng cho mỗi môn
        const gradeMap = {};
        answers.forEach(answer => {
            if (answer.testID && answer.testID.subject && answer.teacherGrade !== undefined) {
                const normalizedKey = normalizeSubject(answer.testID.subject);
                if (!gradeMap[normalizedKey]) {
                    gradeMap[normalizedKey] = {
                        total: 0,
                        count: 0,
                        originalName: answer.testID.subject
                    };
                }
                gradeMap[normalizedKey].total += answer.teacherGrade;
                gradeMap[normalizedKey].count += 1;
            }
        });

        // Lấy danh sách tất cả môn hiện có trong lớp
        const subjectsRaw = await TestScheme.distinct('subject', { classID: classStudent.classID });
        
        // Loại bỏ trùng lặp bằng cách chuẩn hóa
        const subjectMap = new Map();
        subjectsRaw.forEach(subject => {
            const normalizedKey = normalizeSubject(subject);
            if (!subjectMap.has(normalizedKey)) {
                subjectMap.set(normalizedKey, subject);
            }
        });

        // Tính điểm trung bình cho mỗi môn
        const grades = Array.from(subjectMap.keys()).map(normalizedKey => {
            const originalName = subjectMap.get(normalizedKey);
            const gradeInfo = gradeMap[normalizedKey];
            
            if (gradeInfo && gradeInfo.count > 0) {
                return {
                    subject: originalName,
                    average: parseFloat((gradeInfo.total / gradeInfo.count).toFixed(2)),
                    testCount: gradeInfo.count
                };
            }
            
            return {
                subject: originalName,
                average: null,
                testCount: 0
            };
        });

        // Sắp xếp theo tên môn học
        grades.sort((a, b) => a.subject.localeCompare(b.subject, 'vi'));

        return res.status(200).json(grades);
        
    } catch (error) {
        console.error('Lỗi lấy điểm học sinh:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// ==================== TEACHER TEST FUNCTIONS ====================

// Teacher Test - Get class tests
const TeacherGetClassTest = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.userId;
    const teacherSubject = await Teacher.findById(teacherId).select('subject');
    if (!teacherSubject) {
      return res.status(404).json({ message: 'Giáo viên không tồn tại' });
    }
    const tests = await TestScheme.find({ classID: classId , subject: teacherSubject.subject });
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

const TeacherCreateTest = async (req, res) => {
  try {
    const teacherID = req.user.userId;
    const { classID, testtitle,lessonID, subject, closeDate } = req.body;
    console.log("Creating test with data:", req.body);  
    const newTest = new TestScheme({
      classID,
      teacherID,
      lessonID,
      testtitle,
      subject,
      closeDate: closeDate,
    });
    await newTest.save();
    
    // Log activity
    await logActivity({
      userId: teacherID,
      role: 'teacher',
      action: `Tạo bài kiểm tra: "${testtitle}"`,
      testId: newTest._id
    });
    
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
    }
    
    res.status(201).json({ message: 'Bài kiểm tra được tạo thành công', test: newTest });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo bài kiểm tra' });
    console.error('Lỗi khi tạo bài kiểm tra:', error);
  }
};

const TeacherEditTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    const { testtitle, lessonID, subject, closeDate, status } = req.body;
    
    const updateData = {
      ...(testtitle && { testtitle }),
      ...(lessonID && { lessonID }),
      ...(subject && { subject }),
      ...(closeDate && { closeDate }),
      ...(status && { status })
    };
    
    console.log("Updating test ID:", testId, "with data:", updateData);
    const updatedTest = await TestScheme.findByIdAndUpdate(testId, updateData, { new: true });
    if (!updatedTest) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }
    
    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Chỉnh sửa bài kiểm tra: "${updatedTest.testtitle}"`,
      testId: testId
    });
    
    res.status(200).json({  
      message: 'Bài kiểm tra đã được cập nhật thành công',
      test: updatedTest
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật bài kiểm tra' });
    console.error('Lỗi khi cập nhật bài kiểm tra:', error);
  }
};

const TeacherDeleteTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    const deletedTest = await TestScheme.findByIdAndDelete(testId);
    if (!deletedTest) {
      return res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
    }
    const testAwnsers = await TestAnswer.deleteMany({ testID: testId });
    if (testAwnsers.deletedCount === 0) {
      console.log('Không tìm thấy câu trả lời nào để xóa cho bài kiểm tra này');
    }
    if(deletedTest && testAwnsers){ 
      res.status(200).json({ message: 'Bài kiểm tra đã được xóa thành công' });
    }
    
    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Xóa bài kiểm tra: "${deletedTest.testtitle}"`,
      testId: testId
    });
    
  
  } catch (error) { 
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa bài kiểm tra' });
    console.error('Lỗi khi xóa bài kiểm tra:', error);
  }
};

const TeacherGetTestDetailById = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await TestScheme.findById(testId).populate('teacherID', 'name email')
    .populate('lessonID', 'title');

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

const TeacherGradingAnswer = async (req, res) => {
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
    
    // Log activity
    const teacherId = req.user.userId;
    await logActivity({
      userId: teacherId,
      role: 'teacher',
      action: `Chấm điểm bài làm của học sinh`,
      testId: updatedAnswer.testID
    });
    
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

const TeacherGetSubmittedAnswers = async (req, res) => {
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

// Teacher Analytics
const TeacherClassAverageGrades = async (req, res) => {  
  try {
    const teacherId = req.user.userId;
    
    if(!teacherId){
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

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
    });

    const classIds = subjectClasses.map(sc => sc.classid);

    const classAverages = [];
    for (const classId of classIds) {
      const tests = await TestScheme.find({ classID: classId });
      let totalGrades = 0;
      let gradeCount = 0;
      let maxGrade = null;
      let minGrade = null;

      for (const test of tests) {
        const answers = await TestAnswer.find({ testID: test._id, isgraded: true });
        for (const answer of answers) {
          const g = Number(answer.teacherGrade);
          if (!Number.isFinite(g)) continue;
          totalGrades += g;
          gradeCount += 1;
          if (maxGrade === null || g > maxGrade) maxGrade = g;
          if (minGrade === null || g < minGrade) minGrade = g;
        }
      }

      const averageGrade = gradeCount > 0 ? (totalGrades / gradeCount) : 0;
      
      // Get students with average grades below 4.0
      const classStudents = await ClassStudent.find({ classID: classId }).populate('studentID', 'name email');
      const studentsBelow40 = [];
      
      for (const classStudent of classStudents) {
        if (!classStudent.studentID) continue;
        
        const studentId = classStudent.studentID._id;
        const testIds = tests.map(t => t._id);
        const studentAnswers = await TestAnswer.find({ 
          testID: { $in: testIds }, 
          studentID: studentId,
          isgraded: true 
        });
        
        let studentTotal = 0;
        let studentCount = 0;
        
        for (const answer of studentAnswers) {
          const grade = Number(answer.teacherGrade);
          if (Number.isFinite(grade)) {
            studentTotal += grade;
            studentCount += 1;
          }
        }
        
        const studentAverage = studentCount > 0 ? (studentTotal / studentCount) : 0;
        
        if (studentAverage < 4.0 && studentCount > 0) {
          studentsBelow40.push({
            studentId: studentId,
            studentName: classStudent.studentID.name,
            studentEmail: classStudent.studentID.email,
            averageGrade: studentAverage,
            testCount: studentCount
          });
        }
      }
      
      classAverages.push({
        classId,
        averageGrade,
        highestGrade: maxGrade,
        lowestGrade: minGrade,
        gradedCount: gradeCount,
        studentsBelow40: studentsBelow40
      });
    }
    
    res.status(200).json({ classAverages });
    
  } catch (error) {
    res.status(500).json({ message: 'Error calculating class average grades' });
    console.error('Error calculating class average grades:', error);
  }
};

const getTestBySubject = async (req, res) => {
  try {
    const studentid = req.user.userId;
    const { subject } = req.params;
    const classStudent = await ClassStudent.findOne({ studentID: studentid });

    const tests = await TestScheme.find({ subject: subject , classID: classStudent.classID });
    console.log("Tests fetched for subject:", subject, tests);
    res.status(200).json(tests);

  } catch (error) { 
    res.status(500).json({ message: "Lỗi server" });
  }
};
const TeacherTestsAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    if(!teacherId){
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

    // Get all classes where this teacher teaches
    const classSubjects = await SubjectClass.find({ 
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

    const classIds = classSubjects.map(cs => cs.classid).filter(Boolean);
    
    // Get all tests assigned by this teacher
    const allTests = await TestScheme.find({ teacherID: teacherId });
    const totalTestsAssigned = allTests.length;
    
    // Calculate submitted and unsubmitted counts
    let totalSubmitted = 0;
    let totalUnsubmitted = 0;
    
    for (const test of allTests) {
      const classId = test.classID;
      
      // Get number of students in this class
      const studentCount = await ClassStudent.countDocuments({ classID: classId });
      
      // Get number of submitted answers for this test
      const submittedCount = await TestAnswer.countDocuments({ 
        testID: test._id, 
        submit: true 
      });
      
      totalSubmitted += submittedCount;
      
      // Unsubmitted = total students - submitted
      const unsubmittedForThisTest = studentCount - submittedCount;
      totalUnsubmitted += unsubmittedForThisTest > 0 ? unsubmittedForThisTest : 0;
    }

    res.status(200).json({
      message: 'Test analytics fetched successfully',
      analytics: {
        totalTestsAssigned: totalTestsAssigned,
        totalSubmitted: totalSubmitted,
        totalUnsubmitted: totalUnsubmitted
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching test analytics' });
    console.error('Error fetching test analytics:', error);
  }
};

module.exports = { 
    getStudentClassTest,
    // Admin Test Report functions
    getTestReportByClass,
    getTestReportById,
    getStudentTestPerformance,
    getOverallTestStatistics,
    // Student Test functions
    StudentGetClassTest,
    GetTestDetailById,
    GetTestGradingById,
    GetRecentInCorrectAnswers,
    getAllSubjectsGrade,
    getTestBySubject,
    // Teacher Test functions
    TeacherGetClassTest,
    TeacherCreateTest,
    TeacherEditTestById,
    TeacherDeleteTestById,
    TeacherGetTestDetailById,
    TeacherGradingAnswer,
    TeacherGetSubmittedAnswers,
    TeacherClassAverageGrades,
    TeacherTestsAnalytics
};

