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
  // Buổi sáng – 5 tiết (period 1-5)
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

  // Buổi chiều – 5 tiết (period 6-10)
  currentTime = "13:30";
  for (let period = 6; period <= 10; period++) {
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
    // Xóa tất cả time slots cũ
    const deleteResult = await TimeSlot.deleteMany({});
    console.log(`🗑️  Đã xóa ${deleteResult.deletedCount} time slots cũ`);
    
    // Tạo time slots mới
    await TimeSlot.insertMany(allSlots);
    console.log(`✅ Đã tạo ${allSlots.length} time slots mới (10 tiết/ngày cho ${DAYS.length} ngày)`);
    console.log(`   - Buổi sáng: Tiết 1-5 (07:00 bắt đầu)`);
    console.log(`   - Buổi chiều: Tiết 6-10 (13:30 bắt đầu)`);
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