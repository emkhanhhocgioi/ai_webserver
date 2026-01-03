const mongoose = require('../dtb/shared_database'); // đã connect sẵn
const Student = require('../schema/student');
const ClassStudent = require('../schema/class_student');
const bcrypt = require('bcrypt');

const classId = "692edfa9e6b9f09347d6b98c";

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

// Hàm cập nhật conduct cho tất cả học sinh trong lớp
async function updateStudentConduct() {
  try {
    console.log('Bắt đầu cập nhật conduct cho học sinh trong lớp...');

    const result = await Student.updateMany(
      { classid: new mongoose.Types.ObjectId(classId) },
      { $set: { conduct: 'Tốt' } }
    );

    console.log(`✓ Đã cập nhật conduct = "Tốt" cho ${result.modifiedCount} học sinh!`);

    // Hiển thị danh sách học sinh đã cập nhật
    const updatedStudents = await Student.find({ classid: new mongoose.Types.ObjectId(classId) });
    console.log('\n=== Danh sách học sinh đã cập nhật ===');
    updatedStudents.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name} - Hạnh kiểm: ${student.conduct}`);
    });

    console.log('\n✓ Hoàn thành!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi cập nhật conduct:', error);
    process.exit(1);
  }
}

// Hàm cập nhật conduct cho TẤT CẢ học sinh trong collections
async function updateAllStudentsConduct() {
  try {
    console.log('Bắt đầu cập nhật conduct cho TẤT CẢ học sinh trong database...');

    const result = await Student.updateMany(
      {}, // Không có điều kiện lọc = áp dụng cho tất cả
      { $set: { conduct: 'Tốt' } }
    );

    console.log(`✓ Đã cập nhật conduct = "Tốt" cho ${result.modifiedCount} học sinh!`);

    // Đếm số học sinh theo lớp
    const studentsByClass = await Student.aggregate([
      {
        $group: {
          _id: '$classid',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n=== Thống kê theo lớp ===');
    for (const classGroup of studentsByClass) {
      const students = await Student.find({ classid: classGroup._id });
      console.log(`Lớp ${classGroup._id}: ${classGroup.count} học sinh`);
      students.forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.name} - Hạnh kiểm: ${student.conduct}`);
      });
    }

    console.log('\n✓ Hoàn thành!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi cập nhật conduct:', error);
    process.exit(1);
  }
}

// Chọn chức năng muốn chạy:
// - createStudents(): Tạo 30 học sinh mới
// - updateStudentConduct(): Cập nhật conduct = "Tốt" cho học sinh trong 1 lớp cụ thể
// - updateAllStudentsConduct(): Cập nhật conduct = "Tốt" cho TẤT CẢ học sinh trong database

// Chạy hàm tạo học sinh
// createStudents();

// Chạy hàm cập nhật conduct cho 1 lớp
// updateStudentConduct();

// Chạy hàm cập nhật conduct cho TẤT CẢ học sinh
updateAllStudentsConduct();
