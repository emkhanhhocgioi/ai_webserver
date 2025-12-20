const mongoose = require('mongoose');
const Student = require('./student');

const { Schema, Types } = mongoose;

const UserActivitySchema = new Schema(
    {   
        teacherId: { type: Types.ObjectId, ref: 'Teacher', required: false, default: null },
        studentId: { type: Types.ObjectId, ref: 'Student', required: false, default: null },
        role: { type: String, enum: ['student', 'teacher'], required: true },
        action: { type: String, required: true },
        testId: { type: Types.ObjectId, ref: 'Test', default: null },
        lessonId: { type: Types.ObjectId, ref: 'Lesson', default: null },
        createdAt: { type: Date, default: Date.now }
    },
    { collection: 'user_activities' }
);

UserActivitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.UserActivity || mongoose.model('UserActivity', UserActivitySchema);