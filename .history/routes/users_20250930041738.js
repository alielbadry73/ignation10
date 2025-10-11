const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses', 'title subject level')
      .populate('achievements', 'name description icon');

    res.json({
      status: 'success',
      data: {
        user
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

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('avatar').optional().trim(),
  body('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme'),
  body('preferences.notifications.email').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('preferences.notifications.push').optional().isBoolean().withMessage('Push notifications must be boolean')
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

    const { firstName, lastName, email, avatar, preferences } = req.body;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already taken'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, email, avatar, preferences },
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user
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

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/courses
// @desc    Get user's enrolled courses
// @access  Private
router.get('/courses', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const courses = await Course.find({
      'enrolledStudents.student': req.user._id
    })
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ 'enrolledStudents.enrolledAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments({
      'enrolledStudents.student': req.user._id
    });

    res.json({
      status: 'success',
      data: {
        courses,
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

// @route   GET /api/users/assignments
// @desc    Get user's assignments
// @access  Private
router.get('/assignments', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Get user's enrolled courses
    const enrolledCourses = req.user.enrolledCourses || [];

    if (enrolledCourses.length === 0) {
      return res.json({
        status: 'success',
        data: {
          assignments: [],
          pagination: {
            current: 1,
            pages: 0,
            total: 0
          }
        }
      });
    }

    const Assignment = require('../models/Assignment');
    let query = { course: { $in: enrolledCourses } };

    if (status) {
      if (status === 'submitted') {
        query['submissions.student'] = req.user._id;
      } else if (status === 'pending') {
        query['submissions.student'] = { $ne: req.user._id };
      }
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

// @route   GET /api/users/leaderboard
// @desc    Get leaderboard for a course
// @access  Private
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { course, limit = 10 } = req.query;

    if (!course) {
      return res.status(400).json({
        status: 'error',
        message: 'Course ID is required'
      });
    }

    // Check if user is enrolled in the course
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    const isEnrolled = courseDoc.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not enrolled in this course.'
      });
    }

    // Get leaderboard data
    const leaderboard = await User.aggregate([
      {
        $match: {
          enrolledCourses: courseDoc._id,
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'assignments',
          localField: '_id',
          foreignField: 'submissions.student',
          as: 'assignments'
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: 'submissions.student',
          as: 'quizzes'
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: '_id',
          foreignField: 'submissions.student',
          as: 'exams'
        }
      },
      {
        $addFields: {
          totalScore: {
            $add: [
              { $sum: '$assignments.submissions.score' },
              { $sum: '$quizzes.submissions.score' },
              { $sum: '$exams.submissions.score' }
            ]
          },
          totalSubmissions: {
            $add: [
              { $size: '$assignments.submissions' },
              { $size: '$quizzes.submissions' },
              { $size: '$exams.submissions' }
            ]
          }
        }
      },
      {
        $sort: { totalScore: -1, totalSubmissions: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          avatar: 1,
          points: 1,
          level: 1,
          totalScore: 1,
          totalSubmissions: 1
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        leaderboard
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

// @route   GET /api/users/statistics
// @desc    Get user statistics
// @access  Private
router.get('/statistics', auth, async (req, res) => {
  try {
    const enrolledCourses = req.user.enrolledCourses || [];
    
    if (enrolledCourses.length === 0) {
      return res.json({
        status: 'success',
        data: {
          statistics: {
            enrolledCourses: 0,
            completedAssignments: 0,
            completedQuizzes: 0,
            completedExams: 0,
            totalPoints: 0,
            averageScore: 0
          }
        }
      });
    }

    const Assignment = require('../models/Assignment');
    const Quiz = require('../models/Quiz');
    const Exam = require('../models/Exam');

    // Get statistics
    const [assignments, quizzes, exams] = await Promise.all([
      Assignment.find({ course: { $in: enrolledCourses } }),
      Quiz.find({ course: { $in: enrolledCourses } }),
      Exam.find({ course: { $in: enrolledCourses } })
    ]);

    const completedAssignments = assignments.filter(assignment =>
      assignment.submissions.some(sub => 
        sub.student.toString() === req.user._id.toString() && 
        sub.status === 'graded'
      )
    ).length;

    const completedQuizzes = quizzes.filter(quiz =>
      quiz.submissions.some(sub => 
        sub.student.toString() === req.user._id.toString() && 
        sub.status === 'graded'
      )
    ).length;

    const completedExams = exams.filter(exam =>
      exam.submissions.some(sub => 
        sub.student.toString() === req.user._id.toString() && 
        sub.status === 'graded'
      )
    ).length;

    // Calculate total points and average score
    let totalPoints = 0;
    let totalScore = 0;
    let totalMaxScore = 0;

    [...assignments, ...quizzes, ...exams].forEach(item => {
      const submission = item.submissions.find(sub => 
        sub.student.toString() === req.user._id.toString()
      );
      
      if (submission && submission.status === 'graded') {
        totalScore += submission.score || 0;
        totalMaxScore += item.totalPoints || 0;
      }
    });

    const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    res.json({
      status: 'success',
      data: {
        statistics: {
          enrolledCourses: enrolledCourses.length,
          completedAssignments,
          completedQuizzes,
          completedExams,
          totalPoints: req.user.points || 0,
          averageScore
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

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to delete account'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is incorrect'
      });
    }

    // Deactivate account instead of deleting
    user.isActive = false;
    await user.save();

    res.json({
      status: 'success',
      message: 'Account deactivated successfully'
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
