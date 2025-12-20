const Question = require('../schema/test_question');
const Answer = require('../schema/test_answer');
const Student = require('../schema/student');
const Test = require('../schema/test_schema');
const { uploadToCloudinary } = require('../midlewares/upload');

const StartTest = async (studentid , testid) => {
    try {
        const existTingAnswer = await Answer.findOne({ studentID: studentid, testID: testid });
        if (existTingAnswer) {
           return 'Test has already been started';
        }

        const answer = new Answer({
            studentID: studentid,
            testID: testid,
            answers: []
        });

        await answer.save();
        return 'Test started successfully';
    } catch (error) {
        throw new Error('Error starting test: ' + error.message);
    }
};
const addAnsweredQuestion = async (studentid, testid, answerData) => {
    try {
        const answerDoc = await Answer.findOne({ studentID: studentid, testID: testid });
        if (!answerDoc) {
            throw new Error('Test has not been started yet');
        }

        const items = Array.isArray(answerData) ? answerData : [answerData];

        for (const ans of items) {
            const { questionID, answer: answerText, isCorrect } = ans;
            if (!questionID) {
                throw new Error('questionID is required for each answer item');
            }

            const idx = answerDoc.answers.findIndex(a => String(a.questionID) === String(questionID));
            if (idx !== -1) {
                // update existing answer
                answerDoc.answers[idx].answer = answerText;
                answerDoc.answers[idx].isCorrect = isCorrect;
            } else {
                // add new answer
                answerDoc.answers.push({
                    questionID,
                    answer: answerText,
                    isCorrect
                });
            }
        }
        answerDoc.submissionTime = new Date();
        answerDoc.submit = true;   

        await answerDoc.save();
        return true;
    } catch (error) {
        console.error('Error adding answer:', error);
        throw new Error('Error adding answer: ' + error.message);
    }
};
const GetAnswerStatus = async (studentid, testid) => {
    try {
        const answerDoc = await Answer.findOne({ studentID: studentid, testID: testid });
        if (!answerDoc) {
            return { status: false, submit: false, submitTime: null };
        }
        return {submit: answerDoc.submit, submitTime: answerDoc.submissionTime };
    } catch (error) {
        console.error('Error getting answer status:', error);
        throw new Error('Error getting answer status: ' + error.message);
    }
};

const FileUploadToQuestion = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        const { testId, questionId } = req.body;
        const file = req.file;
        
        if (!file) {
            console.error('No file uploaded in the request');
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        if (!testId || !questionId) {
            console.error('Missing testId or questionId:', { testId, questionId });
            return res.status(400).json({ message: 'testId and questionId are required' });
        }

        const studentid = req.user.userId; // From verifyStudentToken middleware

        const answerDoc = await Answer.findOne({ studentID: studentid, testID: testId });
        console.log('Found answer document:', answerDoc);
        if (!answerDoc) {
            return res.status(400).json({ message: 'Test has not been started yet' });
        }

        // Upload to Cloudinary using middleware function
        const url = await uploadToCloudinary(
            file.buffer, 
            file.originalname, 
            'test_answers',
            'auto'
        );

        const idx = answerDoc.answers.findIndex(a => String(a.questionID) === String(questionId));
        if (idx !== -1) {
            answerDoc.answers[idx].filePath = url;
        } else {
            answerDoc.answers.push({ 
                questionID: questionId, 
                answer: url 
            });
        }

        await answerDoc.save();

        res.status(200).json({ 
            message: 'File uploaded successfully', 
            filePath: url 
        });
    } catch (error) {
        console.error('Error uploading file to Cloudinary:', error);
        res.status(500).json({ message: 'Error uploading file: ' + error.message });
    }
};

const editUploadQuestion = async (req, res) => {
    try {
        const currentTime = new Date();
        const { testId, questionId } = req.body;
        console.log('Request body for editUploadQuestion:', req.body);
        const file = req.file;
        const studentid = req.user.userId; // From verifyStudentToken middleware
        
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        if (!testId || !questionId) {
            return res.status(400).json({ message: 'testId and questionId are required' });
        }

        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        if (currentTime > new Date(test.closeDate)) {
            return res.status(400).json({ message: 'Cannot edit answer. Test time has ended.' });
        }

        const answerDoc = await Answer.findOne({ studentID: studentid, testID: testId });
        if (!answerDoc) {
            return res.status(400).json({ message: 'Test has not been started yet' });
        }

        if (!answerDoc.submit) {
            return res.status(400).json({ message: 'Test has not been submitted yet' });
        }

        // Upload new file to Cloudinary
        const url = await uploadToCloudinary(
            file.buffer,
            file.originalname,
            'test_answers',
            'auto'
        );

        // Update the answer with the new file URL
        const idx = answerDoc.answers.findIndex(a => String(a.questionID) === String(questionId));
        if (idx !== -1) {
            answerDoc.answers[idx].answer = url;
        } else {
            // create new answer entry with the uploaded file URL
            answerDoc.answers.push({
            questionID: questionId,
            answer: url
            });
        }

        await answerDoc.save();

        res.status(200).json({ 
            message: 'Answer updated successfully', 
            filePath: url 
        });
    } catch (error) {
        console.error('Error editing uploaded answer:', error);
        res.status(500).json({ message: 'Error editing answer: ' + error.message });
    }
};

const editAnswer = async (req, res) => {
    try {
        const currentTime = new Date();
        const { testId, questionId, answer } = req.body;
        const studentid = req.user.userId;

        if (!testId || !questionId || !answer) {
            return res.status(400).json({ message: 'testId, questionId, and answer are required' });
        }

        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        if (currentTime > new Date(test.closeDate)) {
            return res.status(400).json({ message: 'Cannot edit answer. Test time has ended.' });
        }

        const answerDoc = await Answer.findOne({ studentID: studentid, testID: testId });
        if (!answerDoc) {
            return res.status(400).json({ message: 'Test has not been started yet' });
        }

        if (!answerDoc.submit) {
            return res.status(400).json({ message: 'Test has not been submitted yet' });
        }

        // Update the answer
        const idx = answerDoc.answers.findIndex(a => String(a.questionID) === String(questionId));
        if (idx !== -1) {
            answerDoc.answers[idx].answer = answer;
        } else {
            return res.status(404).json({ message: 'Question not found in submitted answers' });
        }

        await answerDoc.save();

        res.status(200).json({ 
            message: 'Answer updated successfully',
            answer: answer
        });
    } catch (error) {
        console.error('Error editing answer:', error);
        res.status(500).json({ message: 'Error editing answer: ' + error.message });
    }
};

module.exports = { StartTest, addAnsweredQuestion, GetAnswerStatus, FileUploadToQuestion, editUploadQuestion, editAnswer };