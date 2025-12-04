const Question = require('../schema/test_question');
const Answer = require('../schema/test_answer');
const Student = require('../schema/student');
const Test = require('../schema/test_schema');


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
module.exports = { StartTest, addAnsweredQuestion, GetAnswerStatus };