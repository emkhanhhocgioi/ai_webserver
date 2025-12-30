const mongoose = require("mongoose") ;

const timeSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      required: true
    },
    startTime: { type: String, required: true }, // "08:00"
    endTime: { type: String, required: true },    // "09:30"
    session: {
    type: String,
    enum: ["morning", "afternoon"]
},
period: {
  type: Number,
  required: true
}
  },
  
  { timestamps: true }
);

module.exports = mongoose.model("TimeSlot", timeSlotSchema);
