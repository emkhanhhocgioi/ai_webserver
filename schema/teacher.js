const mongoose = require('mongoose');
const { Schema } = mongoose;

const teacherSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 22
  },
  gender: {
    type: String,
    enum: ['Nam', 'Nữ', 'Khác'],
    required: true
  },
  subject: {
    type: String,
    enum: [
      'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học',
      'Lịch sử', 'Địa lý', 'Giáo dục công dân', 'Công nghệ', 'Tin học',
      'Thể dục', 'Âm nhạc', 'Mỹ thuật', 'Khác'
    ],
    required: true
  },


  phoneNumber: {
    type: String,
    match: /^0[0-9]{9}$/, // kiểm tra định dạng SĐT Việt Nam
    required: false
  },
  email: {
    type: String,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    default: 0
  },
  isClassTeacher: {
    type: Boolean,
    default: false
  },
  accountSettings: {
    notifications: {
      type: Boolean,
      default: true
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    TestReminder: {
      type: Boolean,
      default: true
    }
  }
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
