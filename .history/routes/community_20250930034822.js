const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Mock community data (in a real app, this would be stored in a database)
let communityPosts = [
  {
    id: 'post_1',
    title: 'Help with Calculus Integration',
    content: 'I\'m struggling with integration by parts. Can someone explain the concept with examples?',
    author: {
      id: 'user_1',
      name: 'Sarah Johnson',
      avatar: 'images/student.png',
      role: 'student'
    },
    subject: 'mathematics',
    tags: ['calculus', 'integration', 'help'],
    upvotes: 15,
    downvotes: 2,
    comments: 8,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    isResolved: false
  },
  {
    id: 'post_2',
    title: 'Physics Lab Report Template',
    content: 'Here\'s a comprehensive template for physics lab reports that I found helpful. Feel free to use it!',
    author: {
      id: 'user_2',
      name: 'Dr. Michael Chen',
      avatar: 'images/teacher.png',
      role: 'teacher'
    },
    subject: 'physics',
    tags: ['lab-report', 'template', 'physics'],
    upvotes: 23,
    downvotes: 1,
    comments: 12,
    createdAt: new Date('2024-01-14T14:20:00Z'),
    updatedAt: new Date('2024-01-14T14:20:00Z'),
    isResolved: true
  },
  {
    id: 'post_3',
    title: 'Chemistry Periodic Table Study Tips',
    content: 'What are your best strategies for memorizing the periodic table? I\'m preparing for my IGCSE exam.',
    author: {
      id: 'user_3',
      name: 'Alex Rodriguez',
      avatar: 'images/student.png',
      role: 'student'
    },
    subject: 'chemistry',
    tags: ['periodic-table', 'study-tips', 'igcse'],
    upvotes: 18,
    downvotes: 0,
    comments: 15,
    createdAt: new Date('2024-01-13T09:15:00Z'),
    updatedAt: new Date('2024-01-13T09:15:00Z'),
    isResolved: false
  }
];

let comments = [
  {
    id: 'comment_1',
    postId: 'post_1',
    content: 'Integration by parts follows the formula: ∫u dv = uv - ∫v du. The key is choosing u and dv correctly.',
    author: {
      id: 'user_4',
      name: 'Emma Wilson',
      avatar: 'images/student.png',
      role: 'student'
    },
    upvotes: 5,
    downvotes: 0,
    createdAt: new Date('2024-01-15T11:45:00Z')
  },
  {
    id: 'comment_2',
    postId: 'post_1',
    content: 'Here\'s a step-by-step example: ∫x e^x dx. Let u = x, dv = e^x dx. Then du = dx, v = e^x. So ∫x e^x dx = x e^x - ∫e^x dx = x e^x - e^x + C = e^x(x-1) + C',
    author: {
      id: 'user_5',
      name: 'Prof. David Kim',
      avatar: 'images/teacher.png',
      role: 'teacher'
    },
    upvotes: 12,
    downvotes: 0,
    createdAt: new Date('2024-01-15T12:30:00Z')
  }
];

// @route   GET /api/community/posts
// @desc    Get community posts with filtering and pagination
// @access  Public
router.get('/posts', optionalAuth, async (req, res) => {
  try {
    const { subject, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    
    let filteredPosts = [...communityPosts];
    
    // Filter by subject
    if (subject) {
      filteredPosts = filteredPosts.filter(post => post.subject === subject);
    }
    
    // Search in title and content
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filteredPosts = filteredPosts.filter(post => 
        searchRegex.test(post.title) || searchRegex.test(post.content)
      );
    }
    
    // Sort posts
    filteredPosts.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    
    res.json({
      status: 'success',
      data: {
        posts: paginatedPosts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(filteredPosts.length / limit),
          total: filteredPosts.length
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

// @route   GET /api/community/posts/:id
// @desc    Get a specific community post with comments
// @access  Public
router.get('/posts/:id', optionalAuth, async (req, res) => {
  try {
    const post = communityPosts.find(p => p.id === req.params.id);
    
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }
    
    // Get comments for this post
    const postComments = comments.filter(c => c.postId === req.params.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json({
      status: 'success',
      data: {
        post: {
          ...post,
          comments: postComments
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

// @route   POST /api/community/posts
// @desc    Create a new community post
// @access  Private
router.post('/posts', [
  auth,
  body('title').trim().notEmpty().withMessage('Post title is required'),
  body('content').trim().notEmpty().withMessage('Post content is required'),
  body('subject').isIn(['mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'geography']).withMessage('Invalid subject'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
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

    const { title, content, subject, tags = [] } = req.body;

    const newPost = {
      id: `post_${Date.now()}`,
      title,
      content,
      author: {
        id: req.user._id,
        name: req.user.fullName,
        avatar: req.user.avatar || 'images/student.png',
        role: req.user.role
      },
      subject,
      tags,
      upvotes: 0,
      downvotes: 0,
      comments: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isResolved: false
    };

    communityPosts.unshift(newPost);

    res.status(201).json({
      status: 'success',
      message: 'Post created successfully',
      data: {
        post: newPost
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

// @route   POST /api/community/posts/:id/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/posts/:id/comments', [
  auth,
  body('content').trim().notEmpty().withMessage('Comment content is required')
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

    const post = communityPosts.find(p => p.id === req.params.id);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    const { content } = req.body;

    const newComment = {
      id: `comment_${Date.now()}`,
      postId: req.params.id,
      content,
      author: {
        id: req.user._id,
        name: req.user.fullName,
        avatar: req.user.avatar || 'images/student.png',
        role: req.user.role
      },
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date()
    };

    comments.push(newComment);

    // Update post comment count
    post.comments += 1;
    post.updatedAt = new Date();

    res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: {
        comment: newComment
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

// @route   POST /api/community/posts/:id/vote
// @desc    Vote on a post (upvote/downvote)
// @access  Private
router.post('/posts/:id/vote', [
  auth,
  body('type').isIn(['upvote', 'downvote', 'remove']).withMessage('Invalid vote type')
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

    const post = communityPosts.find(p => p.id === req.params.id);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    const { type } = req.body;

    // In a real app, you would track user votes to prevent multiple votes
    // For now, we'll just update the counts
    if (type === 'upvote') {
      post.upvotes += 1;
    } else if (type === 'downvote') {
      post.downvotes += 1;
    }

    res.json({
      status: 'success',
      message: 'Vote recorded successfully',
      data: {
        post: {
          id: post.id,
          upvotes: post.upvotes,
          downvotes: post.downvotes
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

// @route   POST /api/community/posts/:id/resolve
// @desc    Mark a post as resolved
// @access  Private
router.post('/posts/:id/resolve', auth, async (req, res) => {
  try {
    const post = communityPosts.find(p => p.id === req.params.id);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    // Only the author can mark as resolved
    if (post.author.id !== req.user._id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the author can mark this post as resolved'
      });
    }

    post.isResolved = true;
    post.updatedAt = new Date();

    res.json({
      status: 'success',
      message: 'Post marked as resolved',
      data: {
        post
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

// @route   GET /api/community/tags
// @desc    Get popular tags
// @access  Public
router.get('/tags', async (req, res) => {
  try {
    const tagCounts = {};
    
    communityPosts.forEach(post => {
      post.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const popularTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));
    
    res.json({
      status: 'success',
      data: {
        tags: popularTags
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

// @route   GET /api/community/stats
// @desc    Get community statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const totalPosts = communityPosts.length;
    const totalComments = comments.length;
    const resolvedPosts = communityPosts.filter(p => p.isResolved).length;
    
    const subjectStats = communityPosts.reduce((acc, post) => {
      acc[post.subject] = (acc[post.subject] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      status: 'success',
      data: {
        stats: {
          totalPosts,
          totalComments,
          resolvedPosts,
          subjectStats
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
