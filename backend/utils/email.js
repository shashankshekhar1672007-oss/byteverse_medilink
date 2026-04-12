const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send an email
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async (options) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Medilink" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to} — MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`Email failed to ${options.to}: ${err.message}`);
    throw err;
  }
};

const emailTemplates = {
  verifyEmail: (name, verifyUrl) => ({
    subject: 'Verify your Medilink email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#0d9488;">Welcome to Medilink, ${name}!</h2>
        <p>Please verify your email address to get started.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0d9488;color:white;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
        <p style="color:#666;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
    text: `Welcome to Medilink! Verify your email: ${verifyUrl}`,
  }),

  passwordReset: (name, resetUrl) => ({
    subject: 'Reset your Medilink password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#0d9488;">Password Reset Request</h2>
        <p>Hi ${name}, you requested to reset your password.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0d9488;color:white;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  }),

  prescriptionCreated: (patientName, doctorName, diagnosis) => ({
    subject: 'New Prescription from Medilink',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#0d9488;">New Prescription</h2>
        <p>Hi ${patientName}, Dr. ${doctorName} has issued a prescription for: <strong>${diagnosis}</strong>.</p>
        <p>Log in to your Medilink account to view full details.</p>
      </div>
    `,
    text: `Dr. ${doctorName} issued a prescription for ${diagnosis}. Log in to view it.`,
  }),

  consultationStarted: (name, doctorName) => ({
    subject: 'Your consultation has started',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#0d9488;">Consultation Started</h2>
        <p>Hi ${name}, your consultation with Dr. ${doctorName} is now active. Log in to chat.</p>
      </div>
    `,
    text: `Your consultation with Dr. ${doctorName} has started.`,
  }),
};

module.exports = { sendEmail, emailTemplates };
