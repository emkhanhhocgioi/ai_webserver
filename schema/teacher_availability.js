import mongoose from "mongoose";

const teacherAvailabilitySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true
    },
    isAvailable: { type: Boolean, default: true }
  },
  { timestamps: true }
);

teacherAvailabilitySchema.index(
  { teacherId: 1, timeSlotId: 1 },
  { unique: true }
);

export default mongoose.model(
  "TeacherAvailability",
  teacherAvailabilitySchema
);
