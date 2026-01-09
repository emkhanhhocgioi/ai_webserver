const mongoose = require('../dtb/shared_database');
const testSchema = require('../schema/test_schema');
const ClassStudent = require('../schema/class_student');
const TestAnswer = require('../schema/test_answer');

const studentid = "692fb1de9572f2c8b7204de4";

const testidforeachsubject = async () => {
    try {
        // Tìm các class mà student tham gia
        const studentClasses = await ClassStudent.find({ 
            studentID: studentid 
        }).select('classID');
        
        if (studentClasses.length === 0) {
            console.log('Học sinh không thuộc class nào');
            return [];
        }
        
        const classIDs = studentClasses.map(sc => sc.classID);
        console.log(`Học sinh thuộc ${classIDs.length} class(es)`);
        
        // Tìm test ID cho mỗi môn học
        const subjects = ['Tiếng anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Giáo dục công dân','Công nghệ', 'Tin học', 'Mỹ thuật', 'Thể dục', 'Âm nhạc'];
        
        const testIDs = [];
        
        for (let subject of subjects) {
            // Tìm 1 test của môn học này trong các class của student
            const test = await testSchema.findOne({
                classID: { $in: classIDs },
                subject: subject
            }).select('_id testtitle subject classID');
            
            if (test) {
                console.log(`${subject}: ${test._id} - "${test.testtitle}"`);
                testIDs.push({ testID: test._id, subject: subject });
            } else {
                console.log(`${subject}: Không có test`);
            }
        }
        
        return testIDs;
        
    } catch (error) {
        console.error(
            'Lỗi khi lấy test IDs cho từng môn học:', error
        );
    }
};

const createFakeTestAnswers = async (testIDs) => {
    try {
        console.log('\n=== Bắt đầu tạo fake test answers ===');
        
        for (let { testID, subject } of testIDs) {
            // Kiểm tra xem đã có test answer cho test này chưa
            const existingAnswer = await TestAnswer.findOne({
                testID: testID,
                studentID: studentid
            });
            
            if (existingAnswer) {
                console.log(`${subject} (${testID}): Đã có test answer - bỏ qua`);
                continue;
            }
            

            const randomGrade = Math.floor(Math.random() * 6) + 5; // 5 -> 10
            
 
            const fakeAnswer = new TestAnswer({
                testID: testID,
                studentID: studentid,
                answers: [], // Empty answers
                teacherGrade: randomGrade,
                AIGrade: randomGrade,
                teacherComments: `Bài làm ${randomGrade >= 8 ? 'tốt' : randomGrade >= 6.5 ? 'khá' : 'cần cố gắng thêm'}`,
                submit: true,
                isgraded: true,
                submissionTime: new Date()
            });
            
            await fakeAnswer.save();
            console.log(`${subject} (${testID}): Tạo thành công - Điểm: ${randomGrade}`);
        }
        
        console.log('\n=== Hoàn thành tạo fake test answers ===');
        
    } catch (error) {
        console.error('Lỗi khi tạo fake answers:', error);
    }
};

// Chạy hàm và đóng kết nối sau khi hoàn thành
testidforeachsubject()
    .then(testIDs => createFakeTestAnswers(testIDs))
    .finally(() => mongoose.connection.close());