const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Exam = require('../models/Exam');
const TodoList = require('../models/TodoList');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.use(auth, authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalAssignments,
      totalQuizzes,
      totalExams,
      totalTodoLists,
      recentUsers,
      recentCourses
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Assignment.countDocuments(),
      Quiz.countDocuments(),
      Exam.countDocuments(),
      TodoList.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email role createdAt'),
      Course.find().sort({ createdAt: -1 }).limit(5).populate('instructor', 'firstName lastName')
    ]);

    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const courseStats = await Course.aggregate([
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        statistics: {
          totalUsers,
          totalCourses,
          totalAssignments,
          totalQuizzes,
          totalExams,
          totalTodoLists,
          userStats,
          courseStats
        },
        recentUsers,
        recentCourses
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

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .populate('enrolledCourses', 'title subject level')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        users,
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

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
// @access  Private (Admin only)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('enrolledCourses', 'title subject level')
      .populate('achievements', 'name description icon')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

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

// @route   PUT /api/admin/users/:id
// @desc    Update user details
// @access  Private (Admin only)
router.put('/users/:id', [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('role').optional().isIn(['student', 'teacher', 'admin']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('points').optional().isInt({ min: 0 }).withMessage('Points must be a non-negative integer'),
  body('level').optional().isInt({ min: 1 }).withMessage('Level must be a positive integer')
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

    const { firstName, lastName, email, role, isActive, points, level } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already taken'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, role, isActive, points, level },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User updated successfully',
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

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (deactivate)
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User deactivated successfully',
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

// @route   GET /api/admin/courses
// @desc    Get all courses with pagination and filtering
// @access  Private (Admin only)
router.get('/courses', async (req, res) => {
  try {
    const { subject, level, instructor, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    let query = {};
    
    if (subject) {
      query.subject = subject;
    }
    
    if (level) {
      query.level = level;
    }
    
    if (instructor) {
      query.instructor = instructor;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const courses = await Course.find(query)
      .populate('instructor', 'firstName lastName email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);

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

// @route   PUT /api/admin/courses/:id
// @desc    Update course details
// @access  Private (Admin only)
router.put('/courses/:id', [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('subject').optional().isIn(['mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'geography']).withMessage('Invalid subject'),
  body('level').optional().isIn(['igcse', 'alevel', 'ib', 'gcse']).withMessage('Invalid level'),
  body('isPublished').optional().isBoolean().withMessage('isPublished must be boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
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

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName email');

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Course updated successfully',
      data: {
        course
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

// @route   DELETE /api/admin/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Course deactivated successfully',
      data: {
        course
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

// @route   GET /api/admin/assignments
// @desc    Get all assignments with pagination
// @access  Private (Admin only)
router.get('/assignments', async (req, res) => {
  try {
    const { course, instructor, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (course) {
      query.course = course;
    }
    
    if (instructor) {
      query.instructor = instructor;
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

// @route   GET /api/admin/quizzes
// @desc    Get all quizzes with pagination
// @access  Private (Admin only)
router.get('/quizzes', async (req, res) => {
  try {
    const { course, instructor, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (course) {
      query.course = course;
    }
    
    if (instructor) {
      query.instructor = instructor;
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

// @route   GET /api/admin/exams
// @desc    Get all exams with pagination
// @access  Private (Admin only)
router.get('/exams', async (req, res) => {
  try {
    const { course, instructor, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (course) {
      query.course = course;
    }
    
    if (instructor) {
      query.instructor = instructor;
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

// @route   GET /api/admin/todos
// @desc    Get all todo lists with pagination
// @access  Private (Admin only)
router.get('/todos', async (req, res) => {
  try {
    const { owner, course, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (owner) {
      query.owner = owner;
    }
    
    if (course) {
      query.course = course;
    }

    const todoLists = await TodoList.find(query)
      .populate('owner', 'firstName lastName email')
      .populate('course', 'title subject level')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TodoList.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        todoLists,
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

// @route   GET /api/admin/analytics
// @desc    Get platform analytics
// @access  Private (Admin only)
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      case '1y':
        dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
        break;
    }

    const [
      userGrowth,
      courseEnrollments,
      assignmentSubmissions,
      quizSubmissions,
      examSubmissions
    ] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Course.aggregate([
        { $unwind: '$enrolledStudents' },
        { $match: { 'enrolledStudents.enrolledAt': dateFilter } },
        {
          $group: {
            _id: {
              year: { $year: '$enrolledStudents.enrolledAt' },
              month: { $month: '$enrolledStudents.enrolledAt' },
              day: { $dayOfMonth: '$enrolledStudents.enrolledAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Assignment.aggregate([
        { $unwind: '$submissions' },
        { $match: { 'submissions.submittedAt': dateFilter } },
        {
          $group: {
            _id: {
              year: { $year: '$submissions.submittedAt' },
              month: { $month: '$submissions.submittedAt' },
              day: { $dayOfMonth: '$submissions.submittedAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Quiz.aggregate([
        { $unwind: '$submissions' },
        { $match: { 'submissions.submittedAt': dateFilter } },
        {
          $group: {
            _id: {
              year: { $year: '$submissions.submittedAt' },
              month: { $month: '$submissions.submittedAt' },
              day: { $dayOfMonth: '$submissions.submittedAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Exam.aggregate([
        { $unwind: '$submissions' },
        { $match: { 'submissions.submittedAt': dateFilter } },
        {
          $group: {
            _id: {
              year: { $year: '$submissions.submittedAt' },
              month: { $month: '$submissions.submittedAt' },
              day: { $dayOfMonth: '$submissions.submittedAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    res.json({
      status: 'success',
      data: {
        analytics: {
          userGrowth,
          courseEnrollments,
          assignmentSubmissions,
          quizSubmissions,
          examSubmissions
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

module.exports = router;
