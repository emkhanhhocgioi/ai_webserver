const TimeSlot = require("../schema/time_slot_schema.js") ;
const mongoose = require('../dtb/shared_database.js');
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const LESSON_DURATION = 45;
const BREAK_DURATION = 5;

// Helper: cộng phút
function addMinutes(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, h, m + minutes);
  return date.toTimeString().slice(0, 5);
}

const allSlots = [];

// ===== Generate TimeSlots =====
for (const day of DAYS) {
  // Buổi sáng – 5 tiết
  let currentTime = "07:00";
  for (let period = 1; period <= 5; period++) {
    const endTime = addMinutes(currentTime, LESSON_DURATION);

    allSlots.push({
      dayOfWeek: day,
      startTime: currentTime,
      endTime,
      session: "morning",
      period
    });

    currentTime = addMinutes(endTime, BREAK_DURATION);
  }

  // Buổi chiều – 4 tiết
  currentTime = "13:30";
  for (let period = 1; period <= 4; period++) {
    const endTime = addMinutes(currentTime, LESSON_DURATION);

    allSlots.push({
      dayOfWeek: day,
      startTime: currentTime,
      endTime,
      session: "afternoon",
      period
    });

    currentTime = addMinutes(endTime, BREAK_DURATION);
  }
}

// ===== Insert DB =====
// Insert into DB inside an async function (avoid top-level await in CommonJS)
async function main() {
  try {
    await TimeSlot.insertMany(allSlots);
    console.log(`✅ Đã tạo ${allSlots.length} TimeSlot THCS`);
  } catch (err) {
    console.error('Error inserting TimeSlots:', err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch (err) {
      console.error('Error disconnecting mongoose:', err);
    }
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exitCode = 1;
});