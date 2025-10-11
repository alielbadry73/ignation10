const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Task text is required'],
    trim: true,
    maxlength: [200, 'Task text cannot exceed 200 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

const todoListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Todo list name is required'],
    trim: true,
    maxlength: [100, 'List name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  tasks: [taskSchema],
  isShared: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  color: {
    type: String,
    default: '#667eea'
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for task statistics
todoListSchema.virtual('stats').get(function() {
  const total = this.tasks.length;
  const completed = this.tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    total,
    completed,
    pending,
    percentage
  };
});

// Index for better query performance
todoListSchema.index({ owner: 1, isArchived: 1 });
todoListSchema.index({ course: 1 });
todoListSchema.index({ 'sharedWith.user': 1 });

module.exports = mongoose.model('TodoList', todoListSchema);
