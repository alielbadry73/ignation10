const socketIo = require('socket.io');

class SocketService {
  constructor() {
    this.io = null;
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Join user to their personal room
      socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`👤 User ${userId} joined their room`);
      });

      // Join course room for real-time updates
      socket.on('join-course', (courseId) => {
        socket.join(`course-${courseId}`);
        console.log(`📚 User joined course ${courseId}`);
      });

      // Handle assignment submissions
      socket.on('assignment-submitted', (data) => {
        // Notify teacher about new submission
        socket.to(`course-${data.courseId}`).emit('new-submission', {
          type: 'assignment',
          studentName: data.studentName,
          assignmentTitle: data.assignmentTitle,
          timestamp: new Date()
        });
      });

      // Handle quiz submissions
      socket.on('quiz-submitted', (data) => {
        socket.to(`course-${data.courseId}`).emit('new-submission', {
          type: 'quiz',
          studentName: data.studentName,
          quizTitle: data.quizTitle,
          timestamp: new Date()
        });
      });

      // Handle exam submissions
      socket.on('exam-submitted', (data) => {
        socket.to(`course-${data.courseId}`).emit('new-submission', {
          type: 'exam',
          studentName: data.studentName,
          examTitle: data.examTitle,
          timestamp: new Date()
        });
      });

      // Handle grading notifications
      socket.on('assignment-graded', (data) => {
        socket.to(`user-${data.studentId}`).emit('grading-complete', {
          type: 'assignment',
          title: data.assignmentTitle,
          score: data.score,
          totalScore: data.totalScore,
          timestamp: new Date()
        });
      });

      // Handle community posts
      socket.on('new-community-post', (data) => {
        this.io.emit('community-update', {
          type: 'new-post',
          title: data.title,
          author: data.author,
          timestamp: new Date()
        });
      });

      // Handle todo list updates
      socket.on('todo-updated', (data) => {
        socket.to(`user-${data.userId}`).emit('todo-sync', data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  // Method to send notifications
  sendNotification(userId, notification) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit('notification', notification);
    }
  }

  // Method to broadcast to course
  broadcastToCourse(courseId, event, data) {
    if (this.io) {
      this.io.to(`course-${courseId}`).emit(event, data);
    }
  }

  // Method to broadcast to all users
  broadcastToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

module.exports = new SocketService();
