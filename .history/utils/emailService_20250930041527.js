const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(to, subject, html, text = '') {
    try {
      const mailOptions = {
        from: `"WorldCourse" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to WorldCourse!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Welcome to WorldCourse! We're excited to have you join our educational platform.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse and enroll in courses</li>
          <li>Take assignments, quizzes, and exams</li>
          <li>Connect with the community</li>
          <li>Track your progress and achievements</li>
        </ul>
        <p>Happy learning!</p>
        <p>Best regards,<br>The WorldCourse Team</p>
      </div>
    `;

    return this.sendEmail(user.email, 'Welcome to WorldCourse!', html);
  }

  async sendAssignmentGradedEmail(user, assignment) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Assignment Graded</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your assignment "${assignment.title}" has been graded.</p>
        <p><strong>Score:</strong> ${assignment.score}/${assignment.totalPoints} (${assignment.percentage}%)</p>
        <p>You can view detailed feedback in your course dashboard.</p>
        <p>Keep up the great work!</p>
        <p>Best regards,<br>The WorldCourse Team</p>
      </div>
    `;

    return this.sendEmail(user.email, 'Assignment Graded - ' + assignment.title, html);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested a password reset for your WorldCourse account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The WorldCourse Team</p>
      </div>
    `;

    return this.sendEmail(user.email, 'Password Reset Request', html);
  }
}

module.exports = new EmailService();
