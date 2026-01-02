const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || 'hidrabula@gmail.com', 
    pass: process.env.EMAIL_PASS  || 'khanh1308'
  }
});

// verify kết nối (optional)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email config error:", error);
  } else {
    console.log("✅ Email server ready");
  }
});

module.exports = transporter;