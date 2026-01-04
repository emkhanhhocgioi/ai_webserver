const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hidrabula@gmail.com",
    pass: "dgkg ruas hkqd nxmn",
  },
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