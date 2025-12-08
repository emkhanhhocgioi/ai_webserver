const mongoose = require('mongoose');
const { Schema } = mongoose;


const TestQuestion = new Schema({

    testid:{
        type: mongoose.Schema.ObjectId,
        ref: 'Test',
        required: true
    },
    difficult: {type: String , required: true},
    question:{type: String,required: true},
    questionType:{type: String, required: true},
    grade: {type: Number , required: true},
    solution: { type: String, required: true }, 
    metadata: {type: String, default: ''},
    options: {type: Array , required: true}
})

const Question  = mongoose.model('Question', TestQuestion)

module.exports = Question