const axios = require('axios');
const Student = require('../schema/student');
const Answer = require('../schema/test_answer');
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

// Tạo đề tiếng anh


const Ai_Generate_Base_on_TeacherComment = async (req, res) => {
    try {
        const studentid = req.user.userId;
        const {subject} = req.body;
        console.log("Received subject:", subject);
        console.log("Received student ID:", studentid);

        const Answers = await Answer.find({ studentID: studentid, submit: true, teacherComments: { $ne: '' } })
            .populate({
            path: 'testID',
            match: { subject },
            select: 'subject'
            });
        console.log("Fetched Answers:", Answers);
        // // chỉ giữ những answer có testID được populate (subject khớp)
        const filteredAnswers = Answers.filter(a => a.testID);
        if (filteredAnswers.length === 0) {
            return res.status(404).json({ error: 'No answers found for this student and subject.' });
        }
        // sắp xếp giảm dần theo createdAt và lấy answer gần nhất
        filteredAnswers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestAnswer = filteredAnswers[0];
        // tạo prompt từ trường phù hợp (fallback sang JSON nếu không có trường rõ ràng)
        const prompt = latestAnswer.teacherComments
        console.log("Generated prompt:", prompt);
       
        const max_tokens = 256;
        const temperature = 0.7;    
        const response = await axios.post('http://localhost:8000/analyze-teacher-feedback', {
            teacher_comment: prompt,
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

const GetRecentInCorrectAnswers = async (recent_tests) => {
    try {
        const response = await axios.post('http://localhost:8000/recent-test', {
            recent_tests,
            
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
    Ai_Daily_Generate_Question_Answer
};
