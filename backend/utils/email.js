// backend/utils/email.js
const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn("⚠️ Nodemailer Warning: EMAIL_HOST, EMAIL_USER, or EMAIL_PASS are not configured in .env. Email was not sent.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: parseInt(port) === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"DevCollab Platform" <${user}>`,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
  return true;
};

module.exports = sendEmail;
