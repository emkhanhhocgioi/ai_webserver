const axios = require('axios');
const Student = require('../schema/student');
const Answer = require('../schema/test_answer');
const Test = require('../schema/test_schema');
const Lesson = require('../schema/class_lesson');

const Ai_Generate_Question_Answer = async (req, res) => {   
    try {
        const {prompt } = req.body;
        console.log("Received prompt:", prompt);
        const max_tokens = 256;
        const temperature = 0.7;

        const response = await axios.post('http://localhost:8000/generate', {
            prompt,
            max_tokens,
            temperature
        });
        res.status(200).json(response.data);
       
    } catch (error) {
        console.error('Error generating question and answer:', error);
        res.status(500).json({ error: 'Failed to generate question and answer.' });        
    }
};

// Tạo đề toán
const Ai_Generate_math_Question_Answer = async (req, res) => {   
    try {
        const {prompt } = req.body;
        console.log("Received prompt:", prompt);
        const max_tokens = 256;
        const temperature = 0.7;
        const response = await axios.post('http://localhost:8000/generate_math', {
            problem_statement:prompt,
          
        });
        res.status(200).json(response.data);       
    } catch (error) {
        console.error('Error generating math question and answer:', error);
        res.status(500).json({ error: 'Failed to generate math question and answer.' });        
    }
};




const Ai_Generate_Base_on_TeacherComment = async (req, res) => {
    try {
        const studentid = req.user.userId;
        const {subject ,lessonid} = req.body;
        console.log("Received subject:", subject);
        console.log("Received lesson ID:", lessonid);
        console.log("Received student ID:", studentid);
        

        //3 test từ lessonid
        const test = await Test.find({ lessonID: lessonid }).limit(3);
        console.log("Fetched Tests:", test);
        
        const testAnswers = [];
        for (const t of test) {
            const answer = await Answer.findOne({ testID: t._id, studentID: studentid, isgraded: true, teacherComments: { $ne: '' } });
            if (answer) {
                testAnswers.push(answer);
            }
        }
        const lessonTitle = await Lesson.findById(lessonid).select('title');
        const listComments = testAnswers.map(ans => ans.teacherComments).join('\n');
        console.log("Compiled Teacher Comments:", listComments);
       

       
      
        const response = await axios.post('http://localhost:8000/analyze-teacher-feedback', {
            teacher_comment: listComments,
            subject: subject,
            lesson: lessonTitle ? lessonTitle.title : 'Unknown Lesson',
            test_answers: testAnswers
        });
        res.status(200).json(response.data);       
    } catch (error) {
        console.error('Error generating based on teacher comment:', error);
        res.status(500).json({ error: 'Failed to generate based on teacher comment.' });        
    }
};
const AI_Grading_essay = async (req, res) => {
    try {
        const { exercise_question, student_answer } = req.body;
        console.log("Received answer text for grading:", student_answer);
       

        const response = await axios.post('http://localhost:8000/grade-essay', {
            exercise_question,
            student_answer,
        });
        res.status(200).json(response.data);       
    } catch (error) {
        console.error('Error grading essay:', error);
        res.status(500).json({ error: 'Failed to grade essay.' });        
    }
};

const GetRecentInCorrectAnswers = async (recent_tests , questionTypes,subject) => {
    try {

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
        const response = await axios.post('http://localhost:8000/recent-test', {
            recent_tests,
            questionTypes,
            subject: reqsubject
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching incorrect answers:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Ai question Generate 
const ai_qa_gen = async (req, res) => {   
    try {
        const {prompt,subject } = req.body;
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
        console.log("Received prompt:", prompt);
        const response = await axios.post('http://localhost:8000/generate_question', {
            prompt,
            subject: reqsubject
        });
        console.log("AI QA Generation Response:", response.data);
        res.status(200).json(response.data);       
    } catch (error) {
        console.error('Error generating English question and answer:', error);
        res.status(500).json({ error: 'Failed to generate English question and answer.' });        
    }
};

const Ai_auto_grade = async (req, res) => {
    try {
        const { exercise_question, student_answer ,subject} = req.body;
        console.log("Received answer text for grading:", student_answer);
        console.log("Subject for grading:", subject);
        console.log("Exercise question:", exercise_question);
        
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
        const response = await axios.post('http://localhost:8000/auto-grading', {
            exercise_question,
            student_answer,
            subject: reqsubject,
        });
        res.status(200).json(response.data);       
    } catch (error) {
        console.error('Error auto grading essay:', error);
        res.status(500).json({ error: 'Failed to auto grade essay.' });        
    }
};
const Ai_Auto_Grading_from_file = async (req, res) => {
    try {
        const { exercise_question, student_answer_file_url,subject } = req.body;
        console.log("Received answer file URL for grading:", student_answer_file_url);
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
        const response = await axios.post('http://localhost:8000/auto-grading/file', {
            exercise_question,
            fileUrl: student_answer_file_url,
            subject: reqsubject,
        });
        res.status(200).json(response.data);       
    } catch (error) {
        console.error('Error grading essay from file:', error);
        res.status(500).json({ error: 'Failed to grade essay from file.' });        
    }
};
const AI_Auto_Grading_from_image = async (req, res) => {
    try {
        const { exercise_question, student_answer_image_url,subject } = req.body;
        console.log("Received answer image URL for grading:", req.body);
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
        const response = await axios.post('http://localhost:8000/auto-grading/image', {
            exercise_question,
            fileUrl: student_answer_image_url,
            subject: reqsubject,
        });
        res.status(200).json(response.data);       
    } catch (error) {

        res.status(500).json({ error: 'Failed to grade essay from image.' });        
    }   
};

const Ai_Daily_Generate_Question_Answer = async (subject, recentTests) => {
    try {
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
        
        // Extract test information từ recentTests
        const testInfo = recentTests.map(test => ({
            subject: test.testID?.subject || '',
            title: test.testID?.testtitle || '',
            score: test.teacherGrade || 0,
            submissionTime: test.submissionTime
        }));
        
        console.log("Sending to AI:", { subject: reqsubject, recentTests: testInfo });
        
        const response = await axios.post('http://localhost:8000/performance/question-generation', {
            subject: reqsubject,
            recent_tests: testInfo
        });
        
        return response.data;
    } catch (error) {
        console.error('Error generating daily question:', error);
        throw error;
    }
};
const StudentAiDailyGenerateQuestionAnswer = async (req, res) => {   
    try {
        const studentid = req.user.userId;
        const { subject } = req.body;
        console.log("Received subject:", subject);
        console.log("Received student ID:", studentid);
        
        // Get recent test data
     
        const recentTests = await TestAnswer.find({ studentID: studentid, submit: true })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('testID');
        
        console.log("Recent Tests Data:", recentTests);
        
        const response = await Ai_Daily_Generate_Question_Answer(subject, recentTests);
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
    } catch (error) {
        console.error('Error generating question and answer:', error);
        res.status(500).json({ error: 'Failed to generate question and answer.' });        
    }
};

const DailyTestSubjectChange = async (req, res) => {
    try {
        const studentid = req.user.userId;
        const { subject } = req.body;
        const student = await Student.findById(studentid);
        if (!student) {
            return res.status(404).json({ message: "Học sinh không tồn tại" });
        }
        student.dailyQuestionSubject = subject;
        await student.save();
        res.status(200).json({ message: "Thay đổi môn câu hỏi hàng ngày thành công", dailyQuestionSubject: subject });
    } catch (error) {    
        console.error('Lỗi thay đổi môn câu hỏi hàng ngày:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const GetDailyQuestionAnswer = async (req, res) => {
    try {
        const studentid = req.user.userId;
        const student = await Student.findById(studentid);
        if (!student) {
            return res.status(404).json({ message: "Học sinh không tồn tại" });
        }
        res.status(200).json(student.dailyPracticeQuestion);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server" });
        console.error('Lỗi lấy câu hỏi hàng ngày:', error);
    }
};

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
        const response = await axios.post('http://localhost:8000/auto-grading', {
            exercise_question,
            student_answer,
            subject: reqsubject,
        });
        
        const gradingResult = response.data;
        
        // If save_to_daily is true, save the score to daily practice question
        if (save_to_daily && question) {
            const student = await Student.findById(studentid);
            if (student && student.dailyPracticeQuestion) {
                // Find the matching question and update it
                const questionIndex = student.dailyPracticeQuestion.findIndex(
                    q => q.question === question
                );
                
                if (questionIndex !== -1) {
                    student.dailyPracticeQuestion[questionIndex].student_answer = student_answer;
                    student.dailyPracticeQuestion[questionIndex].ai_score = gradingResult.score || gradingResult.ai_score;
                    student.dailyPracticeQuestion[questionIndex].improvement_suggestions = gradingResult.feedback || gradingResult.improvement_suggestions;
                    student.dailyPracticeQuestion[questionIndex].graded_at = new Date();
                    await student.save();
                    
                    return res.status(200).json({
                        ...gradingResult,
                        saved_to_daily: true,
                        message: "Đã chấm điểm và lưu vào câu hỏi hàng ngày"
                    });
                }
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
};

const Ai_recent_test_grading_and_feedback = async (req,res) => {
    try {
        const { grading_datas, subject } = req.body;
        console.log("Received recent tests for grading and feedback:", grading_datas);
        console.log("Subject:", subject);
        

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

        const response = await axios.post('http://localhost:8000/recent-test-grading', {
            questions: grading_datas,
            subject: reqsubject
        });

        res.status(200).json(response.data);
        
    } catch (error) {
        console.error('Error grading recent tests and providing feedback:', error);
        res.status(500).json({ error: 'Failed to grade recent tests and provide feedback.', details: error.message });
    }
}
const Teacher_AI_grading_Base_on_rubic = async (req, res) => {
    try {
        const { answerid, rubric_criteria, subject } = req.body;
        console.log("Received answer ID for rubric grading:", answerid);
        console.log("Rubric criteria:", rubric_criteria);
        console.log("Subject:", subject);

        // Lấy thông tin bài làm của học sinh từ database
   
    

        const testAnswer = await Answer.findById(answerid)
            .populate('testID')
            .populate('studentID')
            .populate({
                path: 'answers.questionID',
                model: 'Question'
            });

        if (!testAnswer) {
            return res.status(404).json({ error: 'Không tìm thấy bài làm.' });
        }

        // Chuẩn bị dữ liệu câu hỏi và câu trả lời
        const questionsAndAnswers = testAnswer.answers.map(ans => ({
            question: ans.questionID?.question || '',
            questionType: ans.questionID?.questionType || '',
            solution: ans.questionID?.solution || '',
            grade: ans.questionID?.grade || 0,
            studentAnswer: ans.answer || '',
            isCorrect: ans.isCorrect || false
        }));

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
        const reqsubject = subjectmap[subject] || subject || testAnswer.testID?.subject || 'van';

        // Gửi request tới AI service
        const response = await axios.post('http://localhost:8000/grade-with-rubric', {
            test_title: testAnswer.testID?.testtitle || 'Bài kiểm tra',
            subject: reqsubject,
            questions_and_answers: questionsAndAnswers,
            rubric_criteria: rubric_criteria,
            student_name: testAnswer.studentID?.name || 'Học sinh'
        });

        // Lưu điểm AI vào database
        if (response.data.success && response.data.grading_result) {
            testAnswer.AIGrade = response.data.grading_result.total_score || 0;
            await testAnswer.save();
        }

        res.status(200).json(response.data);
    }
    catch (error) {
        console.error('Error grading with rubric:', error);
        res.status(500).json({ error: 'Failed to grade with rubric.', details: error.message });
    }
};
module.exports = {
    Ai_Generate_Question_Answer,
    Ai_Generate_Base_on_TeacherComment,
    AI_Grading_essay,
    GetRecentInCorrectAnswers,
    Ai_Generate_math_Question_Answer,
    ai_qa_gen,
    Ai_Auto_Grading_from_file,
    Ai_auto_grade,
    AI_Auto_Grading_from_image,
    Ai_Daily_Generate_Question_Answer,
    // Student AI functions
    StudentAiDailyGenerateQuestionAnswer,
    DailyTestSubjectChange,
    GetDailyQuestionAnswer,
    Ai_Auto_Grade_And_Save,
    Ai_recent_test_grading_and_feedback,
    // Teacher AI functions
    Teacher_AI_grading_Base_on_rubic
};

// ==================== STUDENT AI FUNCTIONS ====================


