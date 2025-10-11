const express = require('express');
const { body, validationResult } = require('express-validator');
const TodoList = require('../models/TodoList');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/todos
// @desc    Get all todo lists for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { course, archived = false } = req.query;
    
    let query = { owner: req.user._id, isArchived: archived === 'true' };
    
    if (course) {
      query.course = course;
    }

    const todoLists = await TodoList.find(query)
      .populate('course', 'title subject level')
      .sort({ updatedAt: -1 });

    res.json({
      status: 'success',
      data: {
        todoLists
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

// @route   GET /api/todos/:id
// @desc    Get a specific todo list
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const todoList = await TodoList.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id }
      ]
    }).populate('course', 'title subject level');

    if (!todoList) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo list not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        todoList
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

// @route   POST /api/todos
// @desc    Create a new todo list
// @access  Private
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Todo list name is required'),
  body('description').optional().trim(),
  body('course').optional().isMongoId().withMessage('Invalid course ID'),
  body('color').optional().isHexColor().withMessage('Invalid color format')
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

    const { name, description, course, color = '#667eea' } = req.body;

    const todoList = await TodoList.create({
      name,
      description,
      owner: req.user._id,
      course,
      color
    });

    res.status(201).json({
      status: 'success',
      message: 'Todo list created successfully',
      data: {
        todoList
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

// @route   PUT /api/todos/:id
// @desc    Update a todo list
// @access  Private
router.put('/:id', [
  auth,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim(),
  body('color').optional().isHexColor().withMessage('Invalid color format')
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

    const todoList = await TodoList.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!todoList) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo list not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Todo list updated successfully',
      data: {
        todoList
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

// @route   DELETE /api/todos/:id
// @desc    Delete a todo list
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const todoList = await TodoList.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!todoList) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo list not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Todo list deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/todos/:id/tasks
// @desc    Add a task to a todo list
// @access  Private
router.post('/:id/tasks', [
  auth,
  body('text').trim().notEmpty().withMessage('Task text is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('notes').optional().trim()
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

    const todoList = await TodoList.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id, 'sharedWith.permission': 'write' }
      ]
    });

    if (!todoList) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo list not found or insufficient permissions'
      });
    }

    const { text, priority = 'medium', dueDate, tags = [], notes } = req.body;

    todoList.tasks.push({
      text,
      priority,
      dueDate,
      tags,
      notes
    });

    await todoList.save();

    res.status(201).json({
      status: 'success',
      message: 'Task added successfully',
      data: {
        task: todoList.tasks[todoList.tasks.length - 1]
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

// @route   PUT /api/todos/:id/tasks/:taskId
// @desc    Update a task in a todo list
// @access  Private
router.put('/:id/tasks/:taskId', [
  auth,
  body('text').optional().trim().notEmpty().withMessage('Task text cannot be empty'),
  body('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('notes').optional().trim()
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

    const todoList = await TodoList.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id, 'sharedWith.permission': 'write' }
      ]
    });

    if (!todoList) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo list not found or insufficient permissions'
      });
    }

    const task = todoList.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    // Update task fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        task[key] = req.body[key];
      }
    });

    await todoList.save();

    res.json({
      status: 'success',
      message: 'Task updated successfully',
      data: {
        task
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

// @route   DELETE /api/todos/:id/tasks/:taskId
// @desc    Delete a task from a todo list
// @access  Private
router.delete('/:id/tasks/:taskId', auth, async (req, res) => {
  try {
    const todoList = await TodoList.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id, 'sharedWith.permission': 'write' }
      ]
    });

    if (!todoList) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo list not found or insufficient permissions'
      });
    }

    const task = todoList.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    task.remove();
    await todoList.save();

    res.json({
      status: 'success',
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/todos/:id/archive
// @desc    Archive/unarchive a todo list
// @access  Private
router.post('/:id/archive', auth, async (req, res) => {
  try {
    const { archived = true } = req.body;

    const todoList = await TodoList.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isArchived: archived },
      { new: true }
    );

    if (!todoList) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo list not found'
      });
    }

    res.json({
      status: 'success',
      message: `Todo list ${archived ? 'archived' : 'unarchived'} successfully`,
      data: {
        todoList
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
