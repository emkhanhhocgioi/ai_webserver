
const mongoose = require('../dtb/shared_database');
const Test = require('../schema/test_schema');
const Question = require('../schema/test_question');
const { class6Chapter1Tests } = require('./class6_chapter1_tests');

const classid ='692edfa9e6b9f09347d6b98c'
const English_teacherid ='692fdf73ebd8de1279ae78e6'
const physics_teacherid ='69569f8948fc8167666f9cec'
const chemistry_teacherid ='69569f8948fc8167666f9cfc'
const biology_teacherid ='69569f8948fc8167666f9cee'
const history_teacherid ='69569f8948fc8167666f9cef'
const geometry_teacherid ='69569f8948fc8167666f9cf0'
const gdcd_teacherid = '69569f8948fc8167666f9cf1';
const congnghe_teacherid = "69569f8948fc8167666f9cf2";
const tinhoc_teacherid = '69569f8948fc8167666f9cf3';
const theduc_teacherid = '692d86676d035e0e114b7939';
const mythuat_teacherid = '69569f8948fc8167666f9cf6';


const createdTestIds = {
    'Tiếng Anh': '695e51b0917366d5b40160ea',
    'Vật lý': '695e51b0917366d5b40160eb',
    'Hóa học': '695e51b0917366d5b40160ec',
    'Sinh học': '695e51b0917366d5b40160ed',
    'Lịch sử': '695e51b0917366d5b40160ee',
    'Địa lý': '695e51b0917366d5b40160ef',
    'Giáo dục công dân': '695e51b0917366d5b40160f0',
    'Công nghệ': '695e51b0917366d5b40160f1',
    'Tin học': '695e51b0917366d5b40160f2',
    'Thể dục': '695e51b0917366d5b40160f3',
    'Mỹ thuật': '695e51b0917366d5b40160f4'
};

module.exports = createdTestIds;


const subjectChapter1Lesson1_Class6 = {
  'Toán': 'Chương I: Số tự nhiên – Bài 1: Tập hợp. Phần tử của tập hợp',

  'Ngữ văn': 'Chương I: Tôi và bạn – Bài 1: Tôi và bạn',

  'Tiếng Anh': 'Unit 1: My New School – Lesson 1: Getting Started',

  'Vật lý': 'Chương I: Mở đầu – Bài 1: Đo độ dài',

  'Hóa học': 'Chương I: Mở đầu – Bài 1: Giới thiệu về hóa học',

  'Sinh học': 'Chương I: Mở đầu sinh học – Bài 1: Sinh học là gì',

  'Lịch sử': 'Chương I: Lịch sử và cuộc sống – Bài 1: Lịch sử là gì',

  'Địa lý': 'Chương I: Bản đồ – Bài 1: Bản đồ',

  'Giáo dục công dân':
    'Chương I: Tự hào truyền thống quê hương – Bài 1: Tự hào về truyền thống gia đình, dòng họ',

  'Công nghệ': 'Chương I: Công nghệ và đời sống – Bài 1: Vai trò của công nghệ',

  'Tin học': 'Chương I: Máy tính và cộng đồng – Bài 1: Thông tin và xử lý thông tin',

  'Thể dục': 'Chương I: Đội hình đội ngũ – Bài 1: Tập hợp hàng dọc, dóng hàng',

  'Âm nhạc': 'Chương I: Làm quen với âm nhạc – Bài 1: Học hát',

  'Mỹ thuật': 'Chương I: Mở đầu mỹ thuật – Bài 1: Quan sát và thể hiện',

  'Khác': 'Chương I – Bài 1'
};



const EachSubjectTeacherCreateTest =  [
  {
    classID: classid,
    teacherID: English_teacherid,
    testtitle: 'Kiểm tra Unit 1: My New School',
    subject: 'Tiếng Anh',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: physics_teacherid,
    testtitle: 'Kiểm tra Chương I: Đo độ dài',
    subject: 'Vật lý',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: chemistry_teacherid,
    testtitle: 'Kiểm tra Chương I: Giới thiệu về hóa học',
    subject: 'Hóa học',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: biology_teacherid,
    testtitle: 'Kiểm tra Chương I: Sinh học là gì',
    subject: 'Sinh học',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: history_teacherid,
    testtitle: 'Kiểm tra Chương I: Lịch sử là gì',
    subject: 'Lịch sử',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: geometry_teacherid,
    testtitle: 'Kiểm tra Chương I: Bản đồ',
    subject: 'Địa lý',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: gdcd_teacherid,
    testtitle: 'Kiểm tra Chương I: Truyền thống gia đình',
    subject: 'Giáo dục công dân',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: congnghe_teacherid,
    testtitle: 'Kiểm tra Chương I: Vai trò của công nghệ',
    subject: 'Công nghệ',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: tinhoc_teacherid,
    testtitle: 'Kiểm tra Chương I: Thông tin và xử lý thông tin',
    subject: 'Tin học',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: theduc_teacherid,
    testtitle: 'Kiểm tra Chương I: Đội hình đội ngũ',
    subject: 'Thể dục',
    closeDate: new Date('2026-02-15')
  },
  {
    classID: classid,
    teacherID: mythuat_teacherid,
    testtitle: 'Kiểm tra Chương I: Quan sát và thể hiện',
    subject: 'Mỹ thuật',
    closeDate: new Date('2026-02-15')
  }
];

// Function để thêm các bài test vào database
async function insertTestsToDatabase() {
  try {
    console.log('Bắt đầu thêm bài test vào database...');
    
    // Sử dụng insertMany để thêm nhiều document cùng lúc
    const result = await Test.insertMany(EachSubjectTeacherCreateTest);
    
    console.log(`✅ Đã thêm thành công ${result.length} bài test vào database`);
    console.log('Chi tiết các bài test đã thêm:');
    result.forEach((test, index) => {
      console.log(`${index + 1}. ${test.subject} - ${test.testtitle} (ID: ${test._id})`);
    });
    
    return result;
  } catch (error) {
    console.error('❌ Lỗi khi thêm bài test vào database:', error.message);
    throw error;
  } finally {
    // Đóng kết nối database sau khi hoàn thành
    await mongoose.connection.close();
    console.log('Đã đóng kết nối database');
  }
}

// Function để thêm câu hỏi cho các bài test
async function insertQuestionsToTests() {
  try {
    console.log('Bắt đầu thêm câu hỏi vào các bài test...');
    
    let totalQuestionsAdded = 0;
    const insertionDetails = [];

    // Duyệt qua từng môn học trong createdTestIds
    for (const [subject, testId] of Object.entries(createdTestIds)) {
      console.log(`\n📝 Đang xử lý môn: ${subject}`);
      
      // Kiểm tra xem môn học có trong dữ liệu câu hỏi không
      if (!class6Chapter1Tests[subject]) {
        console.log(`⚠️  Không tìm thấy dữ liệu câu hỏi cho môn ${subject}`);
        continue;
      }

      // Lấy danh sách câu hỏi của môn học
      const subjectData = class6Chapter1Tests[subject][0];
      const questions = subjectData.questions;

      // Chuẩn bị danh sách câu hỏi để thêm vào database
      const questionsToInsert = questions.map(q => ({
        testid: testId,
        difficult: q.difficult,
        question: q.question,
        questionType: q.questionType,
        subjectQuestionType: q.subjectQuestionType,
        grade: q.grade,
        solution: q.solution,
        metadata: q.metadata,
        options: q.options
      }));

      // Thêm câu hỏi vào database
      const result = await Question.insertMany(questionsToInsert);
      totalQuestionsAdded += result.length;

      insertionDetails.push({
        subject,
        testId,
        questionsCount: result.length
      });

      console.log(`✅ Đã thêm ${result.length} câu hỏi cho môn ${subject}`);
    }

    // Hiển thị tổng kết
    console.log('\n' + '='.repeat(60));
    console.log('📊 TỔNG KẾT:');
    console.log('='.repeat(60));
    console.log(`✅ Tổng số môn học đã thêm câu hỏi: ${insertionDetails.length}`);
    console.log(`✅ Tổng số câu hỏi đã thêm: ${totalQuestionsAdded}`);
    console.log('\nChi tiết theo môn:');
    insertionDetails.forEach((detail, index) => {
      console.log(`${index + 1}. ${detail.subject}: ${detail.questionsCount} câu hỏi (Test ID: ${detail.testId})`);
    });

    return insertionDetails;
  } catch (error) {
    console.error('❌ Lỗi khi thêm câu hỏi:', error.message);
    throw error;
  } finally {
    // Đóng kết nối database sau khi hoàn thành
    await mongoose.connection.close();
    console.log('\n🔌 Đã đóng kết nối database');
  }
}

// Chọn function để chạy
// Bỏ comment dòng muốn chạy:

// insertTestsToDatabase()
//   .then(() => {
//     console.log('Hoàn tất thêm bài test!');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Lỗi:', error);
//     process.exit(1);
//   });

// Chạy function thêm câu hỏi
insertQuestionsToTests()
  .then(() => {
    console.log('\n✅ Hoàn tất thêm câu hỏi!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Lỗi:', error);
    process.exit(1);
  });

