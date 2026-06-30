// backend/utils/email.js
const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;
  const service = process.env.EMAIL_SERVICE;
  const host = process.env.EMAIL_HOST;
  const port = Number.parseInt(process.env.EMAIL_PORT || "587", 10);

  if (!user || !pass) {
    console.warn("⚠️ Nodemailer Warning: EMAIL_USER and EMAIL_PASS/EMAIL_APP_PASSWORD are required.");
    return false;
  }

  const transporterConfig = {
    auth: { user, pass },
  };

  if (service) {
    transporterConfig.service = service;
  } else if (host) {
    transporterConfig.host = host;
    transporterConfig.port = port;
    transporterConfig.secure = port === 465;
  } else {
    transporterConfig.service = "gmail";
  }

  const transporter = nodemailer.createTransport(transporterConfig);

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
