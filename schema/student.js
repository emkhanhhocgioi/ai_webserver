const mongoose = require('mongoose');
const {Schema} = mongoose;

const studentSchema = new Schema ({
    name: {type: String ,required: true},
    classid: {type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true},
    DOB: {type: String, required: true},  
    avatar: {type: String}, 
    email: {type: String ,unique: true, required: true},
    password: {type: String , required: true},
    parentContact: {type: String, required: true},
    academic_performance: {
    type: String,
    enum: ['Tốt', 'Khá', 'Trung bình', 'Yếu'],
    default: 'Tốt'
    },
   test_Accuracy: {
    type: String,
   },
   averageScore: {
    type: Number,
    default: 0
  }
},{ timestamps: true })

const Student =  mongoose.model("Student", studentSchema);

module.exports = Student;