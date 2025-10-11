const express = require('express');
const { body, validationResult } = require('express-validator');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/quizzes
// @desc    Get quizzes for a course or user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { course, status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (course) {
      query.course = course;
    }
    
    if (req.user.role === 'student') {
      // For students, show quizzes from their enrolled courses
      const enrolledCourses = req.user.enrolledCourses || [];
      query.course = { $in: enrolledCourses };
    } else if (req.user.role === 'teacher') {
      // For teachers, show their own quizzes
      query.instructor = req.user._id;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const quizzes = await Quiz.find(query)
      .populate('course', 'title subject level')
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Quiz.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        quizzes,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/quizzes/:id
// @desc    Get a specific quiz
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'title subject level')
      .populate('instructor', 'firstName lastName email');

    if (!quiz) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }

    // Check if user has access to this quiz
    if (req.user.role === 'student') {
      const isEnrolled = req.user.enrolledCourses?.includes(quiz.course._id);
      if (!isEnrolled) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You are not enrolled in this course.'
        });
      }
    } else if (req.user.role === 'teacher' && quiz.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. This is not your quiz.'
      });
    }

    res.json({
      status: 'success',
      data: {
        quiz
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private (Teacher/Admin only)
router.post('/', [
  auth,
  authorize('teacher', 'admin'),
  body('title').trim().notEmpty().withMessage('Quiz title is required'),
  body('description').optional().trim(),
  body('course').isMongoId().withMessage('Valid course ID is required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('timeLimit').isInt({ min: 1 }).withMessage('Time limit must be a positive integer'),
  body('attempts').optional().isInt({ min: 1 }).withMessage('Attempts must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, course, questions, timeLimit, attempts = 1, showCorrectAnswers, showResults } = req.body;

    // Verify course exists and user is the instructor
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    if (courseDoc.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not the instructor of this course.'
      });
    }

    // Calculate total points
    const totalPoints = questions.reduce((sum, question) => sum + (question.points || 1), 0);

    const quiz = await Quiz.create({
      title,
      description,
      course,
      instructor: req.user._id,
      questions,
      totalPoints,
      timeLimit,
      attempts,
      showCorrectAnswers,
      showResults
    });

    // Add quiz to course
    courseDoc.quizzes.push(quiz._id);
    await courseDoc.save();

    res.status(201).json({
      status: 'success',
      message: 'Quiz created successfully',
      data: {
        quiz
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/quizzes/:id/submit
// @desc    Submit a quiz
// @access  Private (Student only)
router.post('/:id/submit', [
  auth,
  authorize('student'),
  body('answers').isArray().withMessage('Answers must be an array'),
  body('timeSpent').isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }

    // Check if quiz is active
    if (!quiz.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Quiz is not active'
      });
    }

    // Check if student is enrolled in the course
    const isEnrolled = req.user.enrolledCourses?.includes(quiz.course);
    if (!isEnrolled) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not enrolled in this course.'
      });
    }

    const { answers, timeSpent } = req.body;
    const submittedAt = new Date();

    // Check attempt limit
    const existingSubmissions = quiz.submissions.filter(
      sub => sub.student.toString() === req.user._id.toString()
    );

    if (existingSubmissions.length >= quiz.attempts) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum attempts reached'
      });
    }

    // Calculate score for auto-graded questions
    let score = 0;
    let totalScore = 0;
    const grading = [];

    quiz.questions.forEach((question, index) => {
      const userAnswer = answers.find(a => a.questionId.toString() === question._id.toString());
      const questionScore = question.points || 1;
      totalScore += questionScore;

      if (question.type === 'multiple-choice' && userAnswer) {
        if (userAnswer.answer === question.correctAnswer) {
          score += questionScore;
        }
        grading.push({
          questionIndex: index,
          pointsAwarded: userAnswer.answer === question.correctAnswer ? questionScore : 0,
          comments: ''
        });
      } else {
        // For text and file questions, mark for manual grading
        grading.push({
          questionIndex: index,
          pointsAwarded: 0,
          comments: 'Pending manual grading'
        });
      }
    });

    const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;

    // Add submission
    quiz.submissions.push({
      student: req.user._id,
      answers,
      submittedAt,
      timeSpent,
      attemptNumber: existingSubmissions.length + 1,
      status: 'submitted',
      score,
      totalScore,
      percentage,
      grading
    });

    await quiz.save();

    res.json({
      status: 'success',
      message: 'Quiz submitted successfully',
      data: {
        submission: quiz.submissions[quiz.submissions.length - 1]
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/quizzes/:id/grade
// @desc    Grade a quiz submission
// @access  Private (Teacher/Admin only)
router.put('/:id/grade', [
  auth,
  authorize('teacher', 'admin'),
  body('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  body('grading').isArray().withMessage('Grading must be an array'),
  body('teacherComments').optional().isArray().withMessage('Teacher comments must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }

    // Check if user is the instructor
    if (quiz.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not the instructor of this quiz.'
      });
    }

    const { submissionId, grading, teacherComments = [] } = req.body;

    const submission = quiz.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found'
      });
    }

    // Calculate total score from grading
    const totalScore = grading.reduce((sum, grade) => sum + grade.pointsAwarded, 0);
    const percentage = quiz.totalPoints > 0 ? Math.round((totalScore / quiz.totalPoints) * 100) : 0;

    // Update submission
    submission.score = totalScore;
    submission.percentage = percentage;
    submission.grading = grading;
    submission.teacherComments = teacherComments;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;
    submission.status = 'graded';

    await quiz.save();

    res.json({
      status: 'success',
      message: 'Quiz graded successfully',
      data: {
        submission
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/quizzes/:id/submissions
// @desc    Get quiz submissions
// @access  Private (Teacher/Admin only)
router.get('/:id/submissions', [
  auth,
  authorize('teacher', 'admin')
], async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('submissions.student', 'firstName lastName email')
      .populate('submissions.gradedBy', 'firstName lastName');

    if (!quiz) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }

    // Check if user is the instructor
    if (quiz.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not the instructor of this quiz.'
      });
    }

    res.json({
      status: 'success',
      data: {
        submissions: quiz.submissions
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
