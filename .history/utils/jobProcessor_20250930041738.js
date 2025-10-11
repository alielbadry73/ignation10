const Queue = require('bull');
const emailService = require('./emailService');
const socketService = require('./socketService');
const logger = require('./logger');

// Create job queues
const emailQueue = new Queue('email processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

const notificationQueue = new Queue('notification processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

const cleanupQueue = new Queue('cleanup processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

// Email job processor
emailQueue.process('send-welcome-email', async (job) => {
  const { user } = job.data;
  try {
    await emailService.sendWelcomeEmail(user);
    logger.info(`Welcome email sent to ${user.email}`);
  } catch (error) {
    logger.error('Failed to send welcome email:', error);
    throw error;
  }
});

emailQueue.process('send-assignment-graded-email', async (job) => {
  const { user, assignment } = job.data;
  try {
    await emailService.sendAssignmentGradedEmail(user, assignment);
    logger.info(`Assignment graded email sent to ${user.email}`);
  } catch (error) {
    logger.error('Failed to send assignment graded email:', error);
    throw error;
  }
});

emailQueue.process('send-password-reset-email', async (job) => {
  const { user, resetToken } = job.data;
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
    logger.info(`Password reset email sent to ${user.email}`);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    throw error;
  }
});

// Notification job processor
notificationQueue.process('send-notification', async (job) => {
  const { userId, notification } = job.data;
  try {
    socketService.sendNotification(userId, notification);
    logger.info(`Notification sent to user ${userId}`);
  } catch (error) {
    logger.error('Failed to send notification:', error);
    throw error;
  }
});

// Cleanup job processor
cleanupQueue.process('cleanup-expired-tokens', async (job) => {
  try {
    // Clean up expired password reset tokens
    const User = require('../models/User');
    const result = await User.updateMany(
      { 
        passwordResetExpires: { $lt: new Date() },
        passwordResetToken: { $exists: true }
      },
      { 
        $unset: { 
          passwordResetToken: 1, 
          passwordResetExpires: 1 
        } 
      }
    );
    logger.info(`Cleaned up ${result.modifiedCount} expired password reset tokens`);
  } catch (error) {
    logger.error('Failed to cleanup expired tokens:', error);
    throw error;
  }
});

cleanupQueue.process('cleanup-old-logs', async (job) => {
  try {
    // Clean up old log files (older than 30 days)
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '../logs');
    
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let cleanedCount = 0;
      files.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      });
      
      logger.info(`Cleaned up ${cleanedCount} old log files`);
    }
  } catch (error) {
    logger.error('Failed to cleanup old logs:', error);
    throw error;
  }
});

// Schedule recurring jobs
cleanupQueue.add('cleanup-expired-tokens', {}, {
  repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
  removeOnComplete: 10,
  removeOnFail: 5
});

cleanupQueue.add('cleanup-old-logs', {}, {
  repeat: { cron: '0 3 * * 0' }, // Weekly on Sunday at 3 AM
  removeOnComplete: 10,
  removeOnFail: 5
});

// Job queue methods
const jobProcessor = {
  // Add email jobs
  addWelcomeEmail: (user) => {
    return emailQueue.add('send-welcome-email', { user }, {
      attempts: 3,
      backoff: 'exponential',
      removeOnComplete: 5,
      removeOnFail: 3
    });
  },

  addAssignmentGradedEmail: (user, assignment) => {
    return emailQueue.add('send-assignment-graded-email', { user, assignment }, {
      attempts: 3,
      backoff: 'exponential',
      removeOnComplete: 5,
      removeOnFail: 3
    });
  },

  addPasswordResetEmail: (user, resetToken) => {
    return emailQueue.add('send-password-reset-email', { user, resetToken }, {
      attempts: 3,
      backoff: 'exponential',
      removeOnComplete: 5,
      removeOnFail: 3
    });
  },

  // Add notification jobs
  addNotification: (userId, notification) => {
    return notificationQueue.add('send-notification', { userId, notification }, {
      attempts: 2,
      removeOnComplete: 10,
      removeOnFail: 5
    });
  },

  // Get queue statistics
  getStats: async () => {
    const emailStats = await emailQueue.getJobCounts();
    const notificationStats = await notificationQueue.getJobCounts();
    const cleanupStats = await cleanupQueue.getJobCounts();

    return {
      email: emailStats,
      notification: notificationStats,
      cleanup: cleanupStats
    };
  }
};

module.exports = jobProcessor;
