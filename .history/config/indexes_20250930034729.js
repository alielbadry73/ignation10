const mongoose = require('mongoose');

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ isActive: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    // Course indexes
    await db.collection('courses').createIndex({ subject: 1, level: 1 });
    await db.collection('courses').createIndex({ instructor: 1 });
    await db.collection('courses').createIndex({ isPublished: 1, isActive: 1 });
    await db.collection('courses').createIndex({ 'enrolledStudents.student': 1 });
    await db.collection('courses').createIndex({ title: 'text', description: 'text' });
    
    // Assignment indexes
    await db.collection('assignments').createIndex({ course: 1, isActive: 1 });
    await db.collection('assignments').createIndex({ instructor: 1 });
    await db.collection('assignments').createIndex({ 'submissions.student': 1 });
    await db.collection('assignments').createIndex({ dueDate: 1 });
    
    // Quiz indexes
    await db.collection('quizzes').createIndex({ course: 1, isActive: 1 });
    await db.collection('quizzes').createIndex({ instructor: 1 });
    await db.collection('quizzes').createIndex({ 'submissions.student': 1 });
    
    // Exam indexes
    await db.collection('exams').createIndex({ course: 1, isActive: 1 });
    await db.collection('exams').createIndex({ instructor: 1 });
    await db.collection('exams').createIndex({ 'submissions.student': 1 });
    await db.collection('exams').createIndex({ startDate: 1, endDate: 1 });
    
    // TodoList indexes
    await db.collection('todolists').createIndex({ owner: 1, isArchived: 1 });
    await db.collection('todolists').createIndex({ course: 1 });
    await db.collection('todolists').createIndex({ 'sharedWith.user': 1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

module.exports = { createIndexes };
