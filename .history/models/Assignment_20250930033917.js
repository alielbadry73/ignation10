const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['multiple-choice', 'text', 'file']
  },
  text: {
    type: String,
    required: [true, 'Question text is required']
  },
  points: {
    type: Number,
    required: true,
    min: 1
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: String,
    required: function() {
      return this.type === 'multiple-choice';
    }
  },
  sampleAnswer: {
    type: String,
    required: function() {
      return this.type === 'text' || this.type === 'file';
    }
  },
  gradingNotes: {
    type: String
  },
  fileRequirements: {
    type: String
  },
  expectedContent: {
    type: String
  },
  gradingCriteria: {
    type: String
  }
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  totalPoints: {
    type: Number,
    required: true
  },
  timeLimit: {
    type: Number, // in minutes
    default: null
  },
  dueDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    answers: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      answer: {
        type: String,
        required: true
      },
      fileUpload: {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String
      }
    }],
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'late'],
      default: 'submitted'
    },
    score: {
      type: Number,
      default: 0
    },
    totalScore: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    grading: [{
      questionIndex: Number,
      pointsAwarded: Number,
      comments: String
    }],
    teacherComments: [String],
    gradedAt: {
      type: Date
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
assignmentSchema.index({ course: 1, isActive: 1 });
assignmentSchema.index({ instructor: 1 });
assignmentSchema.index({ 'submissions.student': 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
