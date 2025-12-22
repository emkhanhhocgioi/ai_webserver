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
  },
  lastLogin: {
    type: Date,
    default: null
  },
  dailyQuestionSubject: {
    type: String,
    enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'GDCD'],
    default: 'Toán'
  },
  dailyPracticeQuestion: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    ai_score: {
      type: Number,
      min: 0,
      max: 10
    },
    improvement_suggestion: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
 
},{ timestamps: true })

const Student =  mongoose.model("Student", studentSchema);

module.exports = Student;