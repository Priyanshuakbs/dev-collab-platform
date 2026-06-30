// backend/test_email.js
require("dotenv").config();
const sendEmail = require("./utils/email");

async function run() {
  console.log("Starting email test...");
  console.log("Current EMAIL_USER:", process.env.EMAIL_USER);
  
  if (process.env.EMAIL_USER === "your_email@gmail.com") {
    console.log("⚠️ EMAIL_USER is still set to placeholder 'your_email@gmail.com'.");
    console.log("Please replace placeholders in backend/.env with your real SMTP email & app password to receive actual emails.");
    return;
  }
  
  try {
    const success = await sendEmail({
      to: "rpriyanshu1902@gmail.com",
      subject: "DevCollab SMTP Connection Test",
      html: "<p>This is a test email from DevCollab to verify your SMTP connection is fully working!</p>",
    });
    
    if (success) {
      console.log("✅ Email sent successfully to rpriyanshu1902@gmail.com!");
    } else {
      console.log("⚠️ Email was not sent (failed configuration checks).");
    }
  } catch (err) {
    console.error("❌ Email failed to send due to error:", err.message);
  }
}

run();
