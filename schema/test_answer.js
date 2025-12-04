const mongoose = require('mongoose');
const { Schema } = mongoose;

const testAnswerSchema = new Schema({
    testID: {
        type: Schema.Types.ObjectId,
        ref: "Test",
        required: true,
    },
    studentID: {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
        
    },
    answers: [
        {
            questionID: {
                type: Schema.Types.ObjectId,
                ref: "Question",
        
            },
            answer: {
                type: String,
          
            },
            isCorrect: {
                type: Boolean,
                default: false 
            }
        },
       
    ],
    teacherComments: {  
        type: String,
        default: ''
    },
    submissionTime: {
        type: Date,
        default: Date.now
    },
    submit:{
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const TestAnswer = mongoose.model('TestAnswer', testAnswerSchema);
module.exports = TestAnswer;
