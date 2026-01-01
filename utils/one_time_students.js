const mongoose = require('../dtb/shared_database'); // đã connect sẵn
const Student = require('../schema/student');
const ClassStudent = require('../schema/class_student');
const bcrypt = require('bcrypt');

const classId = '69569d86d293a8b5627c9236';

const studentNames = [
  'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Châu', 'Phạm Thị Dung',
  'Hoàng Văn Em', 'Đặng Thị Phương', 'Vũ Văn Giang', 'Bùi Thị Hà',
  'Đinh Văn Hùng', 'Ngô Thị Lan', 'Phan Văn Kiên', 'Lý Thị Linh',
  'Đỗ Văn Minh', 'Trịnh Thị Nga', 'Mai Văn Oanh', 'Hồ Thị Phương',
  'Tô Văn Quân', 'Lưu Thị Thanh', 'Võ Văn Sơn', 'Dương Thị Trang',
  'Cao Văn Tuấn', 'Lâm Thị Uyên', 'Tăng Văn Việt', 'Nguyễn Thị Xuân',
  'Trần Văn Yên', 'Lê Thị Ánh', 'Phạm Văn Bảo', 'Hoàng Thị Cúc',
  'Đặng Văn Duy', 'Vũ Thị Hương'
];

const subjects = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'GDCD'];
const performances = ['Tốt', 'Khá', 'Trung bình', 'Yếu'];

async function createStudents() {
  try {
    console.log('Bắt đầu tạo 30 học sinh...');

    const students = [];
    const hashedPassword = await bcrypt.hash('123456', 10);

    for (let i = 0; i < 30; i++) {
      const studentData = {
        name: studentNames[i],
        classid: new mongoose.Types.ObjectId(classId),
        DOB: `${2008 + Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        email: `student${i + 1}_${Date.now()}@school.edu.vn`,
        password: hashedPassword,
        parentContact: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        academic_performance: performances[Math.floor(Math.random() * performances.length)],
        averageScore: Math.floor(Math.random() * 5) + 5, // Điểm từ 5-10
        dailyQuestionSubject: subjects[Math.floor(Math.random() * subjects.length)],
        accountSettings: {
          notifications: true,
          darkMode: false,
          TestReminder: true
        }
      };

      students.push(studentData);
    }

    // Tạo học sinh trong database
    const createdStudents = await Student.insertMany(students);
    console.log(`✓ Đã tạo ${createdStudents.length} học sinh thành công!`);

    // Tạo quan hệ ClassStudent
    const classStudentRelations = createdStudents.map(student => ({
      classID: new mongoose.Types.ObjectId(classId),
      studentID: student._id
    }));

    await ClassStudent.insertMany(classStudentRelations);
    console.log(`✓ Đã tạo ${classStudentRelations.length} quan hệ lớp-học sinh!`);

    console.log('\n=== Thông tin học sinh đã tạo ===');
    createdStudents.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name} - Email: ${student.email} - Học lực: ${student.academic_performance}`);
    });

    console.log('\n✓ Hoàn thành! Mật khẩu mặc định cho tất cả học sinh: 123456');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi tạo học sinh:', error);
    process.exit(1);
  }
}

// Chạy hàm tạo học sinh
createStudents();
