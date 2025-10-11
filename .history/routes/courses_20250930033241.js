const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const { auth, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all courses
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subject, level, instructor, page = 1, limit = 10, search } = req.query;
    
    let query = { isPublished: true, isActive: true };
    
    if (subject) {
      query.subject = subject;
    }
    
    if (level) {
      query.level = level;
    }
    
    if (instructor) {
      query.instructor = instructor;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const courses = await Course.find(query)
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
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

// @route   GET /api/courses/:id
// @desc    Get a specific course
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName email avatar')
      .populate('enrolledStudents.student', 'firstName lastName email avatar');

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    if (req.user) {
      isEnrolled = course.enrolledStudents.some(
        enrollment => enrollment.student._id.toString() === req.user._id.toString()
      );
    }

    res.json({
      status: 'success',
      data: {
        course: {
          ...course.toObject(),
          isEnrolled
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

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Teacher/Admin only)
router.post('/', [
  auth,
  authorize('teacher', 'admin'),
  body('title').trim().notEmpty().withMessage('Course title is required'),
  body('description').trim().notEmpty().withMessage('Course description is required'),
  body('subject').isIn(['mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'geography']).withMessage('Invalid subject'),
  body('level').isIn(['igcse', 'alevel', 'ib', 'gcse']).withMessage('Invalid level'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
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

    const { title, description, subject, level, thumbnail, duration, price, currency, tags, learningOutcomes, prerequisites } = req.body;

    const course = await Course.create({
      title,
      description,
      subject,
      level,
      instructor: req.user._id,
      thumbnail,
      duration,
      price,
      currency,
      tags,
      learningOutcomes,
      prerequisites
    });

    res.status(201).json({
      status: 'success',
      message: 'Course created successfully',
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

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private (Teacher/Admin only)
router.put('/:id', [
  auth,
  authorize('teacher', 'admin'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('subject').optional().isIn(['mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'geography']).withMessage('Invalid subject'),
  body('level').optional().isIn(['igcse', 'alevel', 'ib', 'gcse']).withMessage('Invalid level')
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

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found or access denied'
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

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private (Teacher/Admin only)
router.delete('/:id', [
  auth,
  authorize('teacher', 'admin')
], async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      instructor: req.user._id
    });

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found or access denied'
      });
    }

    res.json({
      status: 'success',
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private (Student only)
router.post('/:id/enroll', [
  auth,
  authorize('student')
], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Check if already enrolled
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (isEnrolled) {
      return res.status(400).json({
        status: 'error',
        message: 'Already enrolled in this course'
      });
    }

    // Add student to course
    course.enrolledStudents.push({
      student: req.user._id,
      enrolledAt: new Date(),
      progress: 0
    });

    await course.save();

    // Add course to user's enrolled courses
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { enrolledCourses: course._id }
    });

    res.json({
      status: 'success',
      message: 'Successfully enrolled in course',
      data: {
        course: {
          id: course._id,
          title: course.title,
          subject: course.subject,
          level: course.level
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

// @route   POST /api/courses/:id/unenroll
// @desc    Unenroll from a course
// @access  Private (Student only)
router.post('/:id/unenroll', [
  auth,
  authorize('student')
], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Remove student from course
    course.enrolledStudents = course.enrolledStudents.filter(
      enrollment => enrollment.student.toString() !== req.user._id.toString()
    );

    await course.save();

    // Remove course from user's enrolled courses
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { enrolledCourses: course._id }
    });

    res.json({
      status: 'success',
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/courses/:id/review
// @desc    Add a review to a course
// @access  Private (Student only)
router.post('/:id/review', [
  auth,
  authorize('student'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
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

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Check if student is enrolled
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        status: 'error',
        message: 'You must be enrolled in this course to review it'
      });
    }

    // Check if already reviewed
    const existingReview = course.reviews.find(
      review => review.student.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this course'
      });
    }

    const { rating, comment } = req.body;

    // Add review
    course.reviews.push({
      student: req.user._id,
      rating,
      comment
    });

    // Update average rating
    const totalRating = course.reviews.reduce((sum, review) => sum + review.rating, 0);
    course.rating.average = totalRating / course.reviews.length;
    course.rating.count = course.reviews.length;

    await course.save();

    res.status(201).json({
      status: 'success',
      message: 'Review added successfully',
      data: {
        review: course.reviews[course.reviews.length - 1]
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

// @route   GET /api/courses/:id/assignments
// @desc    Get assignments for a course
// @access  Private
router.get('/:id/assignments', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('assignments');
    
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Check access
    if (req.user.role === 'student') {
      const isEnrolled = course.enrolledStudents.some(
        enrollment => enrollment.student.toString() === req.user._id.toString()
      );
      if (!isEnrolled) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You are not enrolled in this course.'
        });
      }
    } else if (req.user.role === 'teacher' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. This is not your course.'
      });
    }

    res.json({
      status: 'success',
      data: {
        assignments: course.assignments
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
