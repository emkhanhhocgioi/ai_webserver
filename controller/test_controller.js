const TestScheme = require('../schema/test_schema')
const Teacher = require('../schema/teacher')
const ClassStudent = require('../schema/class_student')
const Question = require('../schema/test_question')


// student test data 

const getStudentClassTest = async (req, res) => {
    try {
        const { studentid } = req.params;
        const classStudent = await ClassStudent.findOne({ studentID: studentid });
        if (!classStudent) {
            return res.status(404).json({ message: "Lớp học sinh không tìm thấy" });
        }
        const tests = await TestScheme.find({ classID: classStudent.classID, status: 'open'});
        res.status(200).json(tests);
    } catch (error) {
        console.error('Lỗi lấy bài kiểm tra:', error);
        res.status(500).json({ message: "Lỗi server" });
    }   
};





module.exports = { getStudentClassTest, getTestQuestionById }