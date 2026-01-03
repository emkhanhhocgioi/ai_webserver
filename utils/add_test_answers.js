const mongoose = require('../dtb/shared_database'); // đã connect sẵn
const Student = require('../schema/student');
const TestAnswer = require('../schema/test_answer');

const classid = '692edfa9e6b9f09347d6b98c';
const testid = '6957ce2bc11aac70a027ef93';
const ignorestudent = '692fb1de9572f2c8b7204de4';

// Các câu hỏi và câu trả lời mẫu
const questionAnswers = [
    {
        questionID: "6957d85bc11aac70a027f36e",
        question: "Chủ đề chính của các văn bản trong chương Tôi và các bạn là gì?",
        answer: "Chủ đề chính là tình bạn, tuổi thơ và những cảm xúc, trải nghiệm cá nhân của con người trong cuộc sống hằng ngày.",
    },
    {
        questionID: "6957d96ac11aac70a027f375",
        question: "Nhân vật trong các truyện thuộc chương Tôi và các bạn thường được xây dựng như thế nào?",
        answer: "Nhân vật thường là những người gần gũi trong đời sống, được khắc họa qua hành động, suy nghĩ và cảm xúc, giúp người đọc dễ đồng cảm.",
    },
    {
        questionID: "6957e31f1b64284f6c32d260",
        question: "Ngôi kể nào thường được sử dụng trong các văn bản của chương này? Tác dụng của ngôi kể đó là gì?",
        answer: "Ngôi kể thứ nhất thường được sử dụng.\nTác dụng: giúp câu chuyện chân thực, sinh động, thể hiện rõ cảm xúc và suy nghĩ của người kể, tạo sự gần gũi với người đọc.",
    },
    {
        questionID: "6957e31f1b64284f6c32d262",
        question: "Qua các văn bản trong chương Tôi và các bạn, em rút ra được bài học gì về tình bạn?",
        answer: "Tình bạn cần được xây dựng trên sự chân thành, yêu thương, chia sẻ và tôn trọng lẫn nhau.",
    },
    {
        questionID: "6957e52dccf5bb41dfca435e",
        question: "Em hãy nêu một kĩ năng viết mà học sinh được rèn luyện trong chương Tôi và các bạn.",
        answer: "Học sinh được rèn luyện kĩ năng kể lại trải nghiệm cá nhân, viết đoạn văn tự sự thể hiện cảm xúc và suy nghĩ của bản thân.",
    }
];

// Các câu trả lời biến thể cho mỗi câu hỏi (để tạo đa dạng)
const answerVariations = {
    "6957d85bc11aac70a027f36e": [
        "Chủ đề chính là tình bạn, tuổi thơ và những cảm xúc, trải nghiệm cá nhân của con người trong cuộc sống hằng ngày.",
        "Văn bản tập trung vào tình bạn và những kỷ niệm tuổi thơ đáng nhớ.",
        "Các bài văn nói về mối quan hệ bạn bè và những trải nghiệm trong cuộc sống.",
        "Tình bạn tuổi học trò và những câu chuyện đời thường."
    ],
    "6957d96ac11aac70a027f375": [
        "Nhân vật thường là những người gần gũi trong đời sống, được khắc họa qua hành động, suy nghĩ và cảm xúc, giúp người đọc dễ đồng cảm.",
        "Nhân vật được xây dựng chân thực, gần gũi với cuộc sống thực tế.",
        "Các nhân vật được miêu tả sinh động qua hành động và tâm lý.",
        "Nhân vật là những người bình thường với cảm xúc và suy nghĩ chân thật."
    ],
    "6957e31f1b64284f6c32d260": [
        "Ngôi kể thứ nhất thường được sử dụng.\nTác dụng: giúp câu chuyện chân thực, sinh động, thể hiện rõ cảm xúc và suy nghĩ của người kể, tạo sự gần gũi với người đọc.",
        "Ngôi thứ nhất. Giúp người đọc cảm nhận rõ suy nghĩ và tình cảm của nhân vật.",
        "Sử dụng ngôi kể thứ nhất để tạo sự gần gũi và chân thật.",
        "Ngôi kể thứ nhất giúp thể hiện cảm xúc trực tiếp của người kể."
    ],
    "6957e31f1b64284f6c32d262": [
        "Tình bạn cần được xây dựng trên sự chân thành, yêu thương, chia sẻ và tôn trọng lẫn nhau.",
        "Bài học về sự chân thành và yêu thương trong tình bạn.",
        "Tình bạn cần có sự chia sẻ, thấu hiểu và tôn trọng.",
        "Bạn bè cần đối xử chân thành và quan tâm lẫn nhau."
    ],
    "6957e52dccf5bb41dfca435e": [
        "Học sinh được rèn luyện kĩ năng kể lại trải nghiệm cá nhân, viết đoạn văn tự sự thể hiện cảm xúc và suy nghĩ của bản thân.",
        "Kĩ năng viết đoạn văn tự sự về trải nghiệm cá nhân.",
        "Rèn luyện kĩ năng kể chuyện và thể hiện cảm xúc qua văn viết.",
        "Viết đoạn văn miêu tả cảm xúc và suy nghĩ của bản thân."
    ]
};

// Hàm random để quyết định câu trả lời đúng hay sai
function getRandomBoolean() {
    return Math.random() > 0.3; // 70% đúng, 30% sai
}

// Hàm tính điểm dựa trên số câu đúng
function calculateScore(answers) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalQuestions = answers.length;
    const percentage = correctCount / totalQuestions;
    
    // Tính điểm từ 0-10 với một chút biến động
    let score = percentage * 10;
    // Thêm biến động nhỏ ±0.5
    score += (Math.random() - 0.5);
    
    // Đảm bảo điểm nằm trong khoảng 0-10
    score = Math.max(0, Math.min(10, score));
    
    return Math.round(score * 10) / 10; // Làm tròn đến 1 chữ số thập phân
}

// Hàm lấy câu trả lời ngẫu nhiên từ variations
function getRandomAnswer(questionID) {
    const variations = answerVariations[questionID];
    if (variations && variations.length > 0) {
        return variations[Math.floor(Math.random() * variations.length)];
    }
    // Fallback to default answer
    const defaultAnswer = questionAnswers.find(qa => qa.questionID === questionID);
    return defaultAnswer ? defaultAnswer.answer : "";
}

async function addTestAnswersForStudents() {
    try {
        console.log('Bắt đầu thêm test answers cho học sinh...');

        // Lấy danh sách học sinh trong lớp, loại trừ học sinh bị ignore
        const students = await Student.find({
            classid: new mongoose.Types.ObjectId(classid),
            _id: { $ne: new mongoose.Types.ObjectId(ignorestudent) }
        });

        console.log(`Tìm thấy ${students.length} học sinh trong lớp.`);

        let successCount = 0;
        let errorCount = 0;

        for (const student of students) {
            try {
                // Kiểm tra xem học sinh đã có bài làm cho test này chưa
                const existingAnswer = await TestAnswer.findOne({
                    testID: new mongoose.Types.ObjectId(testid),
                    studentID: student._id
                });

                if (existingAnswer) {
                    console.log(`Học sinh ${student.name} đã có bài làm cho test này. Bỏ qua.`);
                    continue;
                }

                // Tạo answers với random đúng/sai
                const answers = questionAnswers.map(qa => {
                    const isCorrect = getRandomBoolean();
                    return {
                        questionID: new mongoose.Types.ObjectId(qa.questionID),
                        answer: getRandomAnswer(qa.questionID),
                        isCorrect: isCorrect
                    };
                });

                // Tính điểm
                const teacherGrade = calculateScore(answers);

                // Tạo test answer mới
                const newTestAnswer = new TestAnswer({
                    testID: new mongoose.Types.ObjectId(testid),
                    studentID: student._id,
                    answers: answers,
                    teacherGrade: teacherGrade,
                    AIGrade: teacherGrade, // Có thể để giống hoặc khác
                    submit: true, // Đã nộp bài
                    isgraded: true, // Đã chấm
                    submissionTime: new Date(),
                    teacherComments: '' // Có thể thêm comment ngẫu nhiên nếu muốn
                });

                await newTestAnswer.save();
                successCount++;
                console.log(`✓ Đã tạo test answer cho học sinh: ${student.name} - Điểm: ${teacherGrade}`);

            } catch (error) {
                errorCount++;
                console.error(`✗ Lỗi khi tạo test answer cho học sinh ${student.name}:`, error.message);
            }
        }

        console.log('\n=== KẾT QUẢ ===');
        console.log(`Thành công: ${successCount} học sinh`);
        console.log(`Lỗi: ${errorCount} học sinh`);
        console.log('Hoàn tất!');

    } catch (error) {
        console.error('Lỗi khi thêm test answers:', error);
    } finally {
        // Đóng kết nối
        await mongoose.connection.close();
        console.log('Đã đóng kết nối database.');
        process.exit(0);
    }
}

// Chạy hàm
addTestAnswersForStudents();
