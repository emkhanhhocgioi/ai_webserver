const mongoose = require("mongoose") ;

const teachingScheduleSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true
    },
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true
    },
    semester: { type: String, required: true }
  },
  { timestamps: true }
);

// Tránh trùng lịch giáo viên
teachingScheduleSchema.index(
  { teacherId: 1, timeSlotId: 1, semester: 1 },
  { unique: true }
);

// Tránh trùng lịch lớp
teachingScheduleSchema.index(
  { classId: 1, timeSlotId: 1, semester: 1 },
  { unique: true }
);

module.exports = mongoose.model("TeachingSchedule", teachingScheduleSchema);