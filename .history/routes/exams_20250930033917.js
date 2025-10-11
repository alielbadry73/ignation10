const express = require('express');
const { body, validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/exams
// @desc    Get exams for a course or user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { course, status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (course) {
      query.course = course;
    }
    
    if (req.user.role === 'student') {
      // For students, show exams from their enrolled courses
      const enrolledCourses = req.user.enrolledCourses || [];
      query.course = { $in: enrolledCourses };
    } else if (req.user.role === 'teacher') {
      // For teachers, show their own exams
      query.instructor = req.user._id;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const exams = await Exam.find(query)
      .populate('course', 'title subject level')
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Exam.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        exams,
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

// @route   GET /api/exams/:id
// @desc    Get a specific exam
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('course', 'title subject level')
      .populate('instructor', 'firstName lastName email');

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Exam not found'
      });
    }

    // Check if user has access to this exam
    if (req.user.role === 'student') {
      const isEnrolled = req.user.enrolledCourses?.includes(exam.course._id);
      if (!isEnrolled) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You are not enrolled in this course.'
        });
      }
    } else if (req.user.role === 'teacher' && exam.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. This is not your exam.'
      });
    }

    res.json({
      status: 'success',
      data: {
        exam
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

// @route   POST /api/exams
// @desc    Create a new exam
// @access  Private (Teacher/Admin only)
router.post('/', [
  auth,
  authorize('teacher', 'admin'),
  body('title').trim().notEmpty().withMessage('Exam title is required'),
  body('description').optional().trim(),
  body('course').isMongoId().withMessage('Valid course ID is required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('timeLimit').isInt({ min: 1 }).withMessage('Time limit must be a positive integer'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
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

    const { title, description, course, questions, timeLimit, startDate, endDate, isScheduled, allowLateSubmission, latePenalty } = req.body;

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

    const exam = await Exam.create({
      title,
      description,
      course,
      instructor: req.user._id,
      questions,
      totalPoints,
      timeLimit,
      startDate,
      endDate,
      isScheduled,
      allowLateSubmission,
      latePenalty
    });

    // Add exam to course
    courseDoc.exams.push(exam._id);
    await courseDoc.save();

    res.status(201).json({
      status: 'success',
      message: 'Exam created successfully',
      data: {
        exam
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

// @route   POST /api/exams/:id/start
// @desc    Start an exam
// @access  Private (Student only)
router.post('/:id/start', [
  auth,
  authorize('student')
], async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Exam not found'
      });
    }

    // Check if exam is active
    if (!exam.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Exam is not active'
      });
    }

    // Check if student is enrolled in the course
    const isEnrolled = req.user.enrolledCourses?.includes(exam.course);
    if (!isEnrolled) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not enrolled in this course.'
      });
    }

    // Check if exam is within time window
    const now = new Date();
    if (exam.isScheduled && (now < exam.startDate || now > exam.endDate)) {
      return res.status(400).json({
        status: 'error',
        message: 'Exam is not available at this time'
      });
    }

    // Check if already started
    const existingSubmission = exam.submissions.find(
      sub => sub.student.toString() === req.user._id.toString()
    );

    if (existingSubmission) {
      if (existingSubmission.status === 'submitted' || existingSubmission.status === 'graded') {
        return res.status(400).json({
          status: 'error',
          message: 'Exam already completed'
        });
      }
      return res.json({
        status: 'success',
        message: 'Exam already started',
        data: {
          submission: existingSubmission
        }
      });
    }

    // Start new exam
    const submission = {
      student: req.user._id,
      startedAt: now,
      status: 'in-progress'
    };

    exam.submissions.push(submission);
    await exam.save();

    res.json({
      status: 'success',
      message: 'Exam started successfully',
      data: {
        submission: exam.submissions[exam.submissions.length - 1]
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

// @route   POST /api/exams/:id/submit
// @desc    Submit an exam
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

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Exam not found'
      });
    }

    // Check if exam is active
    if (!exam.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Exam is not active'
      });
    }

    // Check if student is enrolled in the course
    const isEnrolled = req.user.enrolledCourses?.includes(exam.course);
    if (!isEnrolled) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not enrolled in this course.'
      });
    }

    const { answers, timeSpent } = req.body;
    const submittedAt = new Date();

    // Find existing submission
    const submission = exam.submissions.find(
      sub => sub.student.toString() === req.user._id.toString()
    );

    if (!submission) {
      return res.status(400).json({
        status: 'error',
        message: 'Exam not started'
      });
    }

    if (submission.status === 'submitted' || submission.status === 'graded') {
      return res.status(400).json({
        status: 'error',
        message: 'Exam already submitted'
      });
    }

    // Check if submission is late
    let status = 'submitted';
    if (submittedAt > exam.endDate) {
      status = exam.allowLateSubmission ? 'late' : 'submitted';
    }

    // Calculate score for auto-graded questions
    let score = 0;
    let totalScore = 0;
    const grading = [];

    exam.questions.forEach((question, index) => {
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

    // Update submission
    submission.answers = answers;
    submission.submittedAt = submittedAt;
    submission.timeSpent = timeSpent;
    submission.status = status;
    submission.score = score;
    submission.totalScore = totalScore;
    submission.percentage = percentage;
    submission.grading = grading;

    await exam.save();

    res.json({
      status: 'success',
      message: 'Exam submitted successfully',
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

// @route   PUT /api/exams/:id/grade
// @desc    Grade an exam submission
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

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Exam not found'
      });
    }

    // Check if user is the instructor
    if (exam.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not the instructor of this exam.'
      });
    }

    const { submissionId, grading, teacherComments = [] } = req.body;

    const submission = exam.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found'
      });
    }

    // Calculate total score from grading
    const totalScore = grading.reduce((sum, grade) => sum + grade.pointsAwarded, 0);
    const percentage = exam.totalPoints > 0 ? Math.round((totalScore / exam.totalPoints) * 100) : 0;

    // Update submission
    submission.score = totalScore;
    submission.percentage = percentage;
    submission.grading = grading;
    submission.teacherComments = teacherComments;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;
    submission.status = 'graded';

    await exam.save();

    res.json({
      status: 'success',
      message: 'Exam graded successfully',
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

// @route   GET /api/exams/:id/submissions
// @desc    Get exam submissions
// @access  Private (Teacher/Admin only)
router.get('/:id/submissions', [
  auth,
  authorize('teacher', 'admin')
], async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('submissions.student', 'firstName lastName email')
      .populate('submissions.gradedBy', 'firstName lastName');

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Exam not found'
      });
    }

    // Check if user is the instructor
    if (exam.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not the instructor of this exam.'
      });
    }

    res.json({
      status: 'success',
      data: {
        submissions: exam.submissions
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
