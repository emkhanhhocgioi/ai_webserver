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
        const response = await axios.post('http://localhost:8000/generate', {
            prompt,
            max_tokens,
            task: "teacher_comments_van",
            temperature
        });
        res.status(200).json(response.data);       
    } catch (error) {
        console.error('Error generating based on teacher comment:', error);
        res.status(500).json({ error: 'Failed to generate based on teacher comment.' });        
    }
};



module.exports = {
    Ai_Generate_Question_Answer,
    Ai_Generate_Base_on_TeacherComment
};
