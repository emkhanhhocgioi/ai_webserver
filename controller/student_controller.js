const Student = require('../schema/student');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TestScheme = require('../schema/test_schema')
const Teacher = require('../schema/teacher')
const ClassStudent = require('../schema/class_student')
const Question = require('../schema/test_question')
const TestAnswer = require('../schema/test_answer')
const Lesson = require('../schema/class_lesson')
const TeachingSchedule = require('../schema/teaching_schedule')
const TimeSlot = require('../schema/time_slot_schema')

const answerController = require('./answer_controller');
const AI_controller = require('./AI_controller');
const { logActivity } = require('../service/user_activity_service');


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
        
        // Log activity
        await logActivity({
            userId: studentId,
            role: 'student',
            action: `Tìm kiếm bài học và bài kiểm tra: "${query}"`
        });
        
        res.status(200).json({ lessons, tests });
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

// Function đăng ký tài khoản học sinh
const registerStudent = async (req, res) => {
    try {
        const { name, email, password, className, grade } = req.body;

        // Kiểm tra email đã tồn tại
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: "Email đã được sử dụng" });
        }

        // Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo học sinh mới
        const newStudent = new Student({
            name,
            email,
            password: hashedPassword,
            class: className,
            grade
        });

        // Lưu vào database
        await newStudent.save();

        res.status(201).json({
            message: "Tạo tài khoản thành công",
            student: {
                id: newStudent._id,
                name: newStudent.name,
                email: newStudent.email,
                class: newStudent.class,
                grade: newStudent.grade
            }
        });

    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Log the login attempt
        console.log("=== LOGIN ATTEMPT ===");
        console.log("Email trying to login:", email);
        
        // Find student by email (case-insensitive to avoid issues)
        const student = await Student.findOne({ email: email.toLowerCase().trim() });
        
        if (!student) {
            console.log("No student found with email:", email);
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }
        
        // Log found student details
        console.log("=== STUDENT FOUND ===");
        console.log("Student ID:", student._id.toString());
        console.log("Student Name:", student.name);
        console.log("Student Email:", student.email);
        
        // Verify password
        const validPassword = await bcrypt.compare(password, student.password);
        if (!validPassword) {
            console.log("Invalid password for email:", email);
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }
        
        // Check if lastLogin is more than 24 hours ago
        const now = new Date();
        const lastLogin = student.lastLogin;
        const hoursSinceLastLogin = lastLogin ? (now - lastLogin) / (1000 * 60 * 60) : 25; // Default to 25 if no lastLogin
        
        // Update last login time
        student.lastLogin = now;
        await student.save();
        
        // Create token with student ID
        const studentId = student._id.toString();
        const token = jwt.sign(
            { 
              userId: studentId,
              email: student.email,
              role: 'student'
            },
            process.env.JWT_SECRET || 'your_secret_key_here',
            { expiresIn: '24h' }
        );
        
        console.log("=== LOGIN SUCCESS ===");
        console.log("Generated token for student ID:", studentId);
        
        // Decode token to verify
        const decoded = jwt.decode(token);
        console.log("Token payload:", JSON.stringify(decoded, null, 2));

        // Generate daily question if more than 24 hours since last login
        if (hoursSinceLastLogin >= 24) {
            console.log("Generating daily question - Last login was", hoursSinceLastLogin.toFixed(2), "hours ago");
            const subject = student.dailyQuestionSubject || 'Toán'; // Default to Toán if not set
            
            // Call in background without blocking the login response
            getRecentTestData(studentId)
                .then(recentTests => AI_controller.Ai_Daily_Generate_Question_Answer(subject, recentTests))
                .then(response => {
                    if (response) {
                        // Save the daily question to student profile
                        Student.findById(studentId).then(studentDoc => {
                            if (studentDoc) {
                                studentDoc.dailyPracticeQuestion.push({
                                    question: response.question,
                                    answer: response.answer,
                                    ai_score: response.ai_score,
                                    improvement_suggestions: response.improvement_suggestions
                                });
                                studentDoc.save().then(() => {
                                    console.log("Daily question generated and saved successfully");
                                }).catch(err => {
                                    console.error("Error saving daily question:", err);
                                });
                            }
                        }).catch(err => {
                            console.error("Error fetching student for daily question:", err);
                        });
                    }
                })
                .catch(error => {
                    console.error("Error generating daily question:", error);
                });
        }

        res.status(200).json({
            message: "Đăng nhập thành công",
            token,
            student: {
              id: studentId,
              name: student.name,
              email: student.email,
              classid: student.classid
          }
        });

    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// Student data controller
const getStudentDataById = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const student = await Student.findById(studentId).select('-password');

        if (!student) {
            return res.status(404).json({ message: "Học sinh không tìm thấy" });
        }   
        res.status(200).json(student);
    } catch (error) {
        console.error('Lỗi lấy thông tin học sinh:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// Student test controller 
const getStudentClassTest = async (req, res) => {
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
            const isubmited = await answerController.GetAnswerStatus(studentid, test._id);
            return {
                ...test,
                isSubmited: !!(isubmited && isubmited.submit),
                isSubmitedTime: isubmited && isubmited.submitTime ? isubmited.submitTime : null,
                isGraded: isubmited && isubmited.isgraded ? isubmited.isgraded : false
            };
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
    const questions = await Question.find({ testid: testId }).select('-solution'); // Loại bỏ trường correctAnswer
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
        const { subject } = req.body;

        let Answers = await TestAnswer.find({ studentID: studentid, submit: true })
            .populate({ path: 'testID', match: { subject } })
            .sort({ createdAt: -1 })
            .limit(3);

        // Lọc bỏ các doc KHÔNG có testID hợp lệ
        Answers = Answers.filter(a => a.testID);
        // Lọc ra những answer có câu trả lời sai
        const incorrectAnswers = Answers.filter(answer => Array.isArray(answer.answers) && answer.answers.some(ans => ans.isCorrect === false));

        // Xử lý song song để lấy questionType cho từng câu trả lời sai
        const results = await Promise.all(incorrectAnswers.map(async (answer) => {
            const incorrectQuestions = answer.answers.filter(ans => ans.isCorrect === false);
            const questionIds = incorrectQuestions.map(ans => ans.questionID);

            // Lấy các question documents tương ứng
            const questions = await Question.find({ _id: { $in: questionIds } }).select('subjectQuestionType');
            console.log("Fetched Questions for incorrect answers:", questions);
            // Map id -> questionType
            const qTypeMap = {};
            questions.forEach(q => {
                qTypeMap[q._id.toString()] = q.subjectQuestionType;
            });

            // Gắn questionType vào từng câu trả lời sai
            const incorrectWithTypes = incorrectQuestions.map(ans => ({
                questionID: ans.questionID,
                questionType: qTypeMap[ans.questionID.toString()] || null,
                userAnswer: ans.answer,
                isCorrect: ans.isCorrect
            }));

            return {
                testID: answer.testID._id,
                testTitle: answer.testID.title || null,
                submittedAt: answer.createdAt,
                incorrectQuestions: incorrectWithTypes
            };
        }));

        // Tập hợp danh sách questionType duy nhất (nếu cần)
        const questTypes = Array.from(new Set(results.flatMap(r => r.incorrectQuestions.map(iq => iq.questionType).filter(Boolean))));
        
        // Tạo prompt tùy chỉnh (có thể để trống hoặc thêm yêu cầu cụ thể)
        const customPrompt = 'Hãy tập trung vào các dạng bài mà học sinh thường gặp khó khăn.';
        
        const responseAi = await AI_controller.GetRecentInCorrectAnswers(questTypes);
        res.status(200).json({ questTypes, responseAi });  
        // return res.status(200).json({results,questTypes });
    } catch (error) {
        console.error('Error fetching incorrect answers:', error);
        res.status(500).json({ message: 'Error fetching incorrect answers' });
    }
};
// Student grade controller
const getAllSubjectsGrade = async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        // Hàm chuẩn hóa tên môn học
        const normalizeSubject = (subject) => {
            if (!subject) return 'unknown';
            return subject.trim().toLowerCase();
        };
        
        // Lấy lớp của học sinh để biết các môn có trong lớp
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({ message: "Lớp học sinh không tìm thấy" });
        }

        // Lấy tất cả câu trả lời đã nộp và đã chấm
        const answers = await TestAnswer.find({ 
            studentID: studentId, 
            submit: true, 
            isgraded: true 
        })
            .select('teacherGrade')
            .populate('testID', 'subject');

        // Tính tổng và số lượng cho mỗi môn (dùng key chuẩn hóa)
        const gradeMap = {};
        answers.forEach(answer => {
            const subject = answer.testID && answer.testID.subject ? answer.testID.subject : 'Unknown';
            const normalizedKey = normalizeSubject(subject);
            
            if (!gradeMap[normalizedKey]) {
                gradeMap[normalizedKey] = { 
                    originalName: subject, // Giữ tên gốc để hiển thị
                    totalGrade: 0, 
                    count: 0 
                };
            }
            
            const gradeValue = typeof answer.teacherGrade === 'number' 
                ? answer.teacherGrade 
                : Number(answer.teacherGrade) || 0;
                
            gradeMap[normalizedKey].totalGrade += gradeValue;
            gradeMap[normalizedKey].count += 1;
        });

        // Lấy danh sách tất cả môn hiện có trong lớp
        const subjectsRaw = await TestScheme.distinct('subject', { classID: classStudent.classID });
        
        // Loại bỏ trùng lặp bằng cách chuẩn hóa
        const subjectMap = new Map();
        subjectsRaw.forEach(subject => {
            const normalizedKey = normalizeSubject(subject);
            // Chỉ lưu lần đầu tiên gặp (hoặc có thể ưu tiên tên có dấu)
            if (!subjectMap.has(normalizedKey)) {
                subjectMap.set(normalizedKey, subject);
            } else {
                // Ưu tiên tên có độ dài dài hơn (thường là có dấu đầy đủ)
                const existing = subjectMap.get(normalizedKey);
                if (subject.length > existing.length) {
                    subjectMap.set(normalizedKey, subject);
                }
            }
        });

        // Tạo danh sách môn học unique
        const uniqueSubjects = Array.from(subjectMap.keys());

        // Tính điểm trung bình cho mỗi môn
        const grades = uniqueSubjects.map(normalizedKey => {
            const displayName = subjectMap.get(normalizedKey);
            
            if (gradeMap[normalizedKey] && gradeMap[normalizedKey].count > 0) {
                return {
                    subject: gradeMap[normalizedKey].originalName || displayName,
                    averageGrade: Math.round((gradeMap[normalizedKey].totalGrade / gradeMap[normalizedKey].count) * 100) / 100
                };
            } else {
                return {
                    subject: displayName,
                    averageGrade: 0
                };
            }
        });

        // Sắp xếp theo tên môn học
        grades.sort((a, b) => a.subject.localeCompare(b.subject, 'vi'));

        console.log("Calculated Grades:", grades);

        return res.status(200).json(grades);
        
    } catch (error) {
        console.error('Lỗi lấy điểm học sinh:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Function lấy tất cả thông tin học sinh (không bao gồm password)
const getAllStudents = async (req, res) => {
    try {
        const students = await Student.find({}).select('-password');
        
        res.status(200).json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách học sinh:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

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

const getRecentTestData = async (studentId) => {
    try {
        // Lấy tất cả câu trả lời đã nộp của học sinh, sắp xếp theo thời gian tạo giảm dần và giới hạn 3 bản ghi
        const recentAnswers = await TestAnswer.find({ studentID: studentId, submit: true })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('testID');
        return recentAnswers;
    } catch (error) {
        console.error('Lỗi lấy dữ liệu bài kiểm tra gần đây:', error);
        throw error;
    }
};

const DailyTestSubjectChange = async (req,res) => {
    try {
        const studentid = req.user.userId;
        const {subject} = req.body;
        const student = await Student.findById(studentid);
        if (!student) {
            return res.status(404).json({ message: "Học sinh không tìm thấy" });
        }
        student.dailyQuestionSubject = subject;
        await student.save();
        res.status(200).json({ message: "Thay đổi môn câu hỏi hàng ngày thành công", dailyQuestionSubject: subject });
    }catch (error) {    
        console.error('Lỗi thay đổi môn câu hỏi hàng ngày:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
}
const Ai_Daily_Generate_Question_Answer = async (req, res) => {   
    try {
        const studentid = req.user.userId;
        const {subject} = req.body;
        console.log("Received subject:", subject);
        console.log("Received student ID:", studentid);
        const recentTests =  await getRecentTestData(studentid);
        console.log("Recent Tests Data:", recentTests);
        
        const response = await AI_controller.Ai_Daily_Generate_Question_Answer(subject, recentTests);
        if (!response) {
            return res.status(500).json({ error: 'Failed to generate question and answer.' });
        }
        console.log("AI Response:", response);
        const student = await Student.findById(studentid);
        // Lưu câu hỏi hàng ngày vào hồ sơ học sinh
        student.dailyPracticeQuestion.push({
            question: response.question,
            answer: response.answer,
            ai_score: response.ai_score,
            improvement_suggestions: response.improvement_suggestions
        });
        await student.save();
        res.status(200).json(response);
    }catch (error) {
        console.error('Error generating question and answer:', error);
        res.status(500).json({ error: 'Failed to generate question and answer.' });        
    }
};
const GetDailyQuestionAnswer = async (req, res) => {
    try {
        const studentid = req.user.userId;
        const student = await Student.findById(studentid);
        if (!student) {
            return res.status(404).json({ message: "Học sinh không tìm thấy" });
        }
        res.status(200).json(student.dailyPracticeQuestion);

    } catch (error) {
        res.status(500).json({ message: "Lỗi server" });
        console.error('Lỗi lấy câu hỏi hàng ngày:', error);
    }
}

const Ai_Auto_Grade_And_Save = async (req, res) => {
    try {
        const { exercise_question, student_answer, subject, question, save_to_daily } = req.body;
        const studentid = req.user.userId;
        
        console.log("Received answer text for grading:", student_answer);
        console.log("Subject for grading:", subject);
        console.log("Exercise question:", exercise_question);
        
        // Map subject Vietnamese to English
        const subjectmap = {
            'Toán': 'math',
            'Ngữ Văn': 'van',
            'Vật Lý': 'physics',
            'Hóa Học': 'chemistry',
            'Sinh Học': 'biology',
            'Tiếng Anh': 'english',
            'Lịch Sử': 'history',
            'Địa Lý': 'geography'
        };
        const reqsubject = subjectmap[subject] || subject;
        
        // Call AI grading service
        const axios = require('axios');
        const response = await axios.post('http://localhost:8000/auto-grading', {
            exercise_question,
            student_answer,
            subject: reqsubject,
        });
        
        const gradingResult = response.data;
        
        // If save_to_daily is true, save the score to daily practice question
        if (save_to_daily && question) {
            const student = await Student.findById(studentid);
            if (!student) {
                return res.status(404).json({ 
                    message: "Học sinh không tìm thấy",
                    gradingResult 
                });
            }
            
            // Find the question in dailyPracticeQuestion array
            const dailyQuestion = student.dailyPracticeQuestion.find(q => q.question === question);
            if (dailyQuestion) {
                dailyQuestion.ai_score = gradingResult.question_score || gradingResult.score;
                dailyQuestion.improvement_suggestions = gradingResult.improvement_suggestion || gradingResult.improvement_suggestions;
                await student.save();
                
                return res.status(200).json({ 
                    ...gradingResult,
                    message: "Chấm điểm và lưu thành công"
                });
            } else {
                return res.status(404).json({ 
                    message: "Câu hỏi hàng ngày không tìm thấy",
                    gradingResult 
                });
            }
        }
        
        // Return grading result without saving
        res.status(200).json(gradingResult);
        
    } catch (error) {
        console.error('Error auto grading and saving:', error);
        res.status(500).json({ 
            message: "Lỗi server",
            error: error.message 
        });
    }
}

// Get student's class schedule
const getStudentSchedule = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { semester } = req.query;

        // Find student's class
        const classStudent = await ClassStudent.findOne({ studentID: studentId });
        if (!classStudent) {
            return res.status(404).json({
                success: false,
                message: "Học sinh chưa được phân vào lớp nào"
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


// Student account settings
const updateAccountSettings = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { notifications, darkMode, TestReminder } = req.body;
        console.log("Updating account settings for student ID:", studentId);
        console.log("New settings:", { notifications, darkMode, TestReminder });

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Học sinh không tồn tại' });
        }

        // Initialize accountSettings if it doesn't exist
        if (!student.accountSettings) {
            student.accountSettings = {
                notifications: true,
                darkMode: false,
                TestReminder: true
            };
        }

        // Update account settings
        if (notifications !== undefined) {
            student.accountSettings.notifications = notifications;
        }
        if (darkMode !== undefined) {
            student.accountSettings.darkMode = darkMode;
        }
        if (TestReminder !== undefined) {
            student.accountSettings.TestReminder = TestReminder;
        }

        await student.save();

        // Log activity
        await logActivity({
            userId: studentId,
            role: 'student',
            action: 'Cập nhật cài đặt tài khoản'
        });

        res.status(200).json({
            message: 'Cập nhật cài đặt thành công',
            accountSettings: student.accountSettings
        });
    } catch (error) {
        console.error('Lỗi cập nhật cài đặt:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

// Change password
const changePassword = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Học sinh không tồn tại' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, student.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        student.password = hashedPassword;
        await student.save();

        // Log activity
        await logActivity({
            userId: studentId,
            role: 'student',
            action: 'Thay đổi mật khẩu'
        });

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

const updateStudentConductAndPerformance = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        console.log("Received request to update conduct and performance:", req.body);
        console.log("Student ID:", studentId);
        
        const { conduct, performance } = req.body;
        
        // Validate input
        if (!conduct && !performance) {
            return res.status(400).json({ 
                message: 'Vui lòng cung cấp ít nhất một trường để cập nhật (hạnh kiểm hoặc học lực)' 
            });
        }
        
        // Build update object
        const updateData = {};
        if (conduct !== undefined) {
            updateData.conduct = conduct;
        }
        if (performance !== undefined) {
            updateData.academic_performance = performance;
        }
        
        // Find and update student by ID
        const student = await Student.findByIdAndUpdate(
            studentId,
            updateData,
            { 
                new: true, 
                runValidators: true, 
                select: '-password' 
            }
        );
        
        if (!student) {
            return res.status(404).json({ 
                message: 'Học sinh không tồn tại' 
            });
        }
        
        // Log activity
        await logActivity({
            userId: req.user ? req.user.userId : 'system',
            role: req.user ? req.user.role : 'teacher',
            action: `Cập nhật hạnh kiểm và học lực cho học sinh: ${student.name} (ID: ${studentId})`
        });
        
        console.log(`Cập nhật hạnh kiểm và học lực cho học sinh ID: ${studentId} thành công.`);
        
        res.status(200).json({ 
            message: 'Cập nhật hạnh kiểm và học lực thành công',
            student: {
                id: student._id,
                name: student.name,
                conduct: student.conduct,
                academic_performance: student.academic_performance
            }
        });
        
    } catch (error) {
        console.error('Lỗi cập nhật hạnh kiểm và học lực:', error);
        res.status(500).json({ 
            message: 'Lỗi server khi cập nhật hạnh kiểm và học lực',
            error: error.message 
        });
    }
};


module.exports = {
    registerStudent,
    loginStudent,
    getStudentDataById,
    getAllStudents,
    getStudentClassTest,
    GetTestDetailById,
    GetTestGradingById,
    getStudentLessons,
    GetRecentInCorrectAnswers,
    getAllSubjectsGrade,
    searchLessonsAndTests,
    searchTeachersByQuery,
    TeacherContact,
    Ai_Daily_Generate_Question_Answer,
    DailyTestSubjectChange,
    GetDailyQuestionAnswer,
    Ai_Auto_Grade_And_Save,
    getStudentSchedule,
    updateAccountSettings,
    changePassword,
    updateStudentConductAndPerformance
};