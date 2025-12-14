const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const LessonSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    classId: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    teacherId: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    createDate: {
        type: Date,
        default: Date.now
    },
    lessonMetadata: {
        type: Object,
        required: true
    },
    fileType:{
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Lesson', LessonSchema);
