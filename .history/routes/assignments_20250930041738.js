const express = require('express');
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/assignments
// @desc    Get assignments for a course or user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { course, status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (course) {
      query.course = course;
    }
    
    if (req.user.role === 'student') {
      // For students, show assignments from their enrolled courses
      const enrolledCourses = req.user.enrolledCourses || [];
      query.course = { $in: enrolledCourses };
    } else if (req.user.role === 'teacher') {
      // For teachers, show their own assignments
      query.instructor = req.user._id;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const assignments = await Assignment.find(query)
      .populate('course', 'title subject level')
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Assignment.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        assignments,
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

// @route   GET /api/assignments/:id
// @desc    Get a specific assignment
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title subject level')
      .populate('instructor', 'firstName lastName email');

    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    // Check if user has access to this assignment
    if (req.user.role === 'student') {
      const isEnrolled = req.user.enrolledCourses?.includes(assignment.course._id);
      if (!isEnrolled) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You are not enrolled in this course.'
        });
      }
    } else if (req.user.role === 'teacher' && assignment.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. This is not your assignment.'
      });
    }

    res.json({
      status: 'success',
      data: {
        assignment
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

// @route   POST /api/assignments
// @desc    Create a new assignment
// @access  Private (Teacher/Admin only)
router.post('/', [
  auth,
  authorize('teacher', 'admin'),
  body('title').trim().notEmpty().withMessage('Assignment title is required'),
  body('description').optional().trim(),
  body('course').isMongoId().withMessage('Valid course ID is required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('timeLimit').optional().isInt({ min: 1 }).withMessage('Time limit must be a positive integer')
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

    const { title, description, course, questions, dueDate, timeLimit, allowLateSubmission, latePenalty } = req.body;

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

    const assignment = await Assignment.create({
      title,
      description,
      course,
      instructor: req.user._id,
      questions,
      totalPoints,
      dueDate,
      timeLimit,
      allowLateSubmission,
      latePenalty
    });

    // Add assignment to course
    courseDoc.assignments.push(assignment._id);
    await courseDoc.save();

    res.status(201).json({
      status: 'success',
      message: 'Assignment created successfully',
      data: {
        assignment
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

// @route   POST /api/assignments/:id/submit
// @desc    Submit an assignment
// @access  Private (Student only)
router.post('/:id/submit', [
  auth,
  authorize('student'),
  body('answers').isArray().withMessage('Answers must be an array')
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

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    // Check if assignment is active
    if (!assignment.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Assignment is not active'
      });
    }

    // Check if student is enrolled in the course
    const isEnrolled = req.user.enrolledCourses?.includes(assignment.course);
    if (!isEnrolled) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not enrolled in this course.'
      });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.student.toString() === req.user._id.toString()
    );

    if (existingSubmission) {
      return res.status(400).json({
        status: 'error',
        message: 'Assignment already submitted'
      });
    }

    const { answers } = req.body;
    const submittedAt = new Date();
    
    // Check if submission is late
    let status = 'submitted';
    if (submittedAt > assignment.dueDate) {
      status = assignment.allowLateSubmission ? 'late' : 'submitted';
    }

    // Calculate score for auto-graded questions
    let score = 0;
    let totalScore = 0;
    const grading = [];

    assignment.questions.forEach((question, index) => {
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
    assignment.submissions.push({
      student: req.user._id,
      answers,
      submittedAt,
      status,
      score,
      totalScore,
      percentage,
      grading
    });

    await assignment.save();

    res.json({
      status: 'success',
      message: 'Assignment submitted successfully',
      data: {
        submission: assignment.submissions[assignment.submissions.length - 1]
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

// @route   PUT /api/assignments/:id/grade
// @desc    Grade an assignment submission
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

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    // Check if user is the instructor
    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not the instructor of this assignment.'
      });
    }

    const { submissionId, grading, teacherComments = [] } = req.body;

    const submission = assignment.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found'
      });
    }

    // Calculate total score from grading
    const totalScore = grading.reduce((sum, grade) => sum + grade.pointsAwarded, 0);
    const percentage = assignment.totalPoints > 0 ? Math.round((totalScore / assignment.totalPoints) * 100) : 0;

    // Update submission
    submission.score = totalScore;
    submission.percentage = percentage;
    submission.grading = grading;
    submission.teacherComments = teacherComments;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;
    submission.status = 'graded';

    await assignment.save();

    res.json({
      status: 'success',
      message: 'Assignment graded successfully',
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

// @route   GET /api/assignments/:id/submissions
// @desc    Get assignment submissions
// @access  Private (Teacher/Admin only)
router.get('/:id/submissions', [
  auth,
  authorize('teacher', 'admin')
], async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('submissions.student', 'firstName lastName email')
      .populate('submissions.gradedBy', 'firstName lastName');

    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    // Check if user is the instructor
    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not the instructor of this assignment.'
      });
    }

    res.json({
      status: 'success',
      data: {
        submissions: assignment.submissions
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
