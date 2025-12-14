const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "SYSTEM",        // Thông báo hệ thống
        "NEW_GRADE",     // Có điểm mới
        "NEW_ASSIGNMENT",// Có bài tập mới
        "NEW_TEST",      // Có bài kiểm tra mới
        "DEADLINE",      // Nhắc deadline nộp bài
        "CLASS_UPDATE",  // Cập nhật lớp học
        "MESSAGE",       // Tin nhắn từ giáo viên/học sinh
      ],
      default: "SYSTEM",
    },

    // Ai nhận thông báo
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Ai gửi thông báo (giáo viên, admin…)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher" || "Admin",
      default: null,
    },

    isReadBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    relatedModel: {
      type: String,
      enum: ["Assignment", "Test", "Class", "User", null],
      default: null,
    },

    important: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
