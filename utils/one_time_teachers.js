const mongoose = require('../dtb/shared_database'); // đã connect sẵn
const Teacher = require('../schema/teacher');
const bcrypt = require('bcrypt');

// Danh sách môn học
const subjects = [
  'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học',
  'Lịch sử', 'Địa lý', 'Giáo dục công dân', 'Công nghệ', 'Tin học',
  'Thể dục', 'Âm nhạc', 'Mỹ thuật', 'Khác'
];

// Danh sách tên giáo viên
const maleNames = [
  'Nguyễn Văn An', 'Trần Đức Bình', 'Lê Hoàng Cường', 'Phạm Minh Đức',
  'Hoàng Văn Hải', 'Đặng Quốc Hưng', 'Vũ Đình Khoa', 'Bùi Văn Long',
  'Ngô Minh Mạnh', 'Đinh Văn Nam'
];

const femaleNames = [
  'Nguyễn Thị Hoa', 'Trần Thị Lan', 'Lê Thị Mai', 'Phạm Thị Nga',
  'Hoàng Thị Oanh', 'Đặng Thị Phương', 'Vũ Thị Quỳnh', 'Bùi Thị Thu',
  'Ngô Thị Vân', 'Đinh Thị Xuân'
];

// Tạo email từ tên
const createEmail = (name) => {
  const parts = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .split(' ');

  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).map(p => p[0]).join('');
  return `${firstName}${lastName}@school.edu.vn`;
};

const createTeachers = async () => {
  try {
    const teachers = [];
    const hashedPassword = await bcrypt.hash('123456', 10);

    for (let i = 0; i < 20; i++) {
      const subjectIndex = i % subjects.length;
      const isMale = i % 2 === 0;
      const name = isMale
        ? maleNames[i % maleNames.length]
        : femaleNames[i % femaleNames.length];

      teachers.push({
        name,
        age: Math.floor(Math.random() * 31) + 25, // 25–55
        gender: isMale ? 'Nam' : 'Nữ',
        subject: subjects[subjectIndex],
        phoneNumber: `0${Math.floor(Math.random() * 900000000) + 100000000}`,
        email: createEmail(name).replace('@', `${i}@`),
        password: hashedPassword,
        yearsOfExperience: Math.floor(Math.random() * 20) + 1,
        isClassTeacher: i < 5 // Boolean
      });
    }

    const result = await Teacher.insertMany(teachers);
    console.log(`✅ Đã tạo ${result.length} giáo viên`);

    const stats = {};
    result.forEach(t => {
      stats[t.subject] = (stats[t.subject] || 0) + 1;
    });

    console.log('\n📊 Thống kê theo môn:');
    Object.entries(stats).forEach(([s, c]) =>
      console.log(`- ${s}: ${c}`)
    );

    console.log(`\n👥 GV chủ nhiệm: ${result.filter(t => t.isClassTeacher).length}`);
    console.log('🔑 Mật khẩu mặc định: 123456');

  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Đã đóng DB');
  }
};

createTeachers();
