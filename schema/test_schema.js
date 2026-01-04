const mongoose = require('mongoose');
const { Schema } = mongoose;

const testSchema = new Schema({
    classID: { 
        type: Schema.Types.ObjectId, 
        ref: "Class", 
        required: true 
    },
    teacherID:{
        type: Schema.Types.ObjectId,
        ref:"Teacher",
        require: true
    },
    lessonID:{
        type: Schema.Types.ObjectId,
        ref:"Lesson",
        require: true
    },
    testtitle: { 
        type: String, 
        required: true 
    },
    subject: {
        type: String, 
        required: true 
    },
    avg_score: {
        type: String ,
        default:0 
    },
    createDate: { type: Date, required: true, default: Date.now },
    closeDate: { type: Date, required: true },
    status :{type: String, default: 'open' }
});

const Test = mongoose.model('Test', testSchema);
module.exports = Test;