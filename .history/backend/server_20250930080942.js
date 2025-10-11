const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.iconify.design"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  const createTables = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'student',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Courses table
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      instructor TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      duration TEXT,
      level TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (course_id) REFERENCES courses (id)
    );

    -- Enrollments table
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (course_id) REFERENCES courses (id),
      UNIQUE(user_id, course_id)
    );

    -- Teachers table
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      experience_years INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(createTables, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables initialized');
      seedDatabase();
    }
  });
}

// Seed database with sample data
function seedDatabase() {
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) {
      console.error('Error checking users:', err.message);
      return;
    }
    
    if (row.count > 0) {
      console.log('Database already seeded');
      return;
    }

    // Hash passwords
    const hashedPassword = bcrypt.hashSync('password123', 10);
    const adminPassword = bcrypt.hashSync('admin123', 10);

    const seedData = `
      -- Insert admin user
      INSERT INTO users (first_name, last_name, email, password, role) 
      VALUES ('Admin', 'User', 'admin@ignation.com', '${adminPassword}', 'admin');

      -- Insert sample students
      INSERT INTO users (first_name, last_name, email, password, phone) VALUES
      ('John', 'Smith', 'john@example.com', '${hashedPassword}', '+44 7123 456789'),
      ('Sarah', 'Johnson', 'sarah@example.com', '${hashedPassword}', '+44 7234 567890'),
      ('Mike', 'Brown', 'mike@example.com', '${hashedPassword}', '+44 7345 678901'),
      ('Emma', 'Wilson', 'emma@example.com', '${hashedPassword}', '+44 7456 789012'),
      ('David', 'Lee', 'david@example.com', '${hashedPassword}', '+44 7567 890123');

      -- Insert sample courses
      INSERT INTO courses (title, description, instructor, price, duration, level) VALUES
      ('Mathematics IGCSE', 'Complete IGCSE Mathematics course covering all topics', 'Dr. Smith', 299.00, '12 months', 'IGCSE'),
      ('Physics IGCSE', 'Comprehensive Physics course for IGCSE students', 'Prof. Johnson', 299.00, '12 months', 'IGCSE'),
      ('Chemistry IGCSE', 'In-depth Chemistry course with practical applications', 'Dr. Brown', 299.00, '12 months', 'IGCSE'),
      ('Biology IGCSE', 'Complete Biology course with lab simulations', 'Dr. Wilson', 299.00, '12 months', 'IGCSE'),
      ('English IGCSE', 'Language and Literature course for IGCSE', 'Ms. Davis', 249.00, '10 months', 'IGCSE');

      -- Insert sample teachers
      INSERT INTO teachers (first_name, last_name, email, subject, experience_years) VALUES
      ('Dr. Michael', 'Smith', 'm.smith@ignation.com', 'Mathematics', 15),
      ('Prof. Sarah', 'Johnson', 's.johnson@ignation.com', 'Physics', 12),
      ('Dr. Robert', 'Brown', 'r.brown@ignation.com', 'Chemistry', 18),
      ('Dr. Lisa', 'Wilson', 'l.wilson@ignation.com', 'Biology', 10),
      ('Ms. Jennifer', 'Davis', 'j.davis@ignation.com', 'English', 8);

      -- Insert sample orders
      INSERT INTO orders (user_id, total_amount, payment_method, status) VALUES
      (2, 299.00, 'Credit Card', 'completed'),
      (3, 598.00, 'PayPal', 'completed'),
      (4, 299.00, 'Bank Transfer', 'pending'),
      (5, 897.00, 'Credit Card', 'completed');

      -- Insert sample order items
      INSERT INTO order_items (order_id, course_id, price) VALUES
      (1, 1, 299.00),
      (2, 1, 299.00),
      (2, 2, 299.00),
      (3, 3, 299.00),
      (4, 1, 299.00),
      (4, 2, 299.00),
      (4, 3, 299.00);

      -- Insert sample enrollments
      INSERT INTO enrollments (user_id, course_id, status) VALUES
      (2, 1, 'active'),
      (3, 1, 'active'),
      (3, 2, 'active'),
      (4, 3, 'active'),
      (5, 1, 'active'),
      (5, 2, 'active'),
      (5, 3, 'active');
    `;

    db.exec(seedData, (err) => {
      if (err) {
        console.error('Error seeding database:', err.message);
      } else {
        console.log('Database seeded with sample data');
      }
    });
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'IG Nation API is running' });
});

// Authentication routes
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: 'Authentication error' });
        }

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role
          }
        });
      });
    }
  );
});

// Public routes
app.get('/api/courses', (req, res) => {
  db.all('SELECT * FROM courses WHERE is_active = 1', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Admin routes
app.get('/api/admin/students', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.created_at,
      COUNT(DISTINCT e.id) as enrolled_courses,
      COUNT(DISTINCT o.id) as total_orders
    FROM users u
    LEFT JOIN enrollments e ON u.id = e.user_id AND e.status = 'active'
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.role = 'student'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      o.id,
      o.user_id,
      u.first_name,
      u.last_name,
      o.total_amount,
      o.payment_method,
      o.status,
      o.created_at,
      GROUP_CONCAT(c.title, ', ') as course_titles
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN courses c ON oi.course_id = c.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/admin/teachers', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM teachers ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/admin/enrollments', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.user_id,
      u.first_name,
      u.last_name,
      c.title as course_title,
      e.enrolled_at,
      e.status
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.enrolled_at DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/admin/approve-order', authenticateToken, requireAdmin, (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update order status
    db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['completed', orderId],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update order' });
        }

        // Get order items
        db.all(
          'SELECT course_id FROM order_items WHERE order_id = ?',
          [orderId],
          (err, items) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to get order items' });
            }

            // Get user ID from order
            db.get(
              'SELECT user_id FROM orders WHERE id = ?',
              [orderId],
              (err, order) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to get order details' });
                }

                // Create enrollments for each course
                const enrollPromises = items.map(item => {
                  return new Promise((resolve, reject) => {
                    db.run(
                      'INSERT OR IGNORE INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)',
                      [order.user_id, item.course_id, 'active'],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                });

                Promise.all(enrollPromises)
                  .then(() => {
                    db.run('COMMIT');
                    res.json({ message: 'Order approved and enrollments created' });
                  })
                  .catch((err) => {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: 'Failed to create enrollments' });
                  });
              }
            );
          }
        );
      }
    );
  });
});

app.post('/api/admin/grant-access', authenticateToken, requireAdmin, (req, res) => {
  const { userId, courseId } = req.body;

  if (!userId || !courseId) {
    return res.status(400).json({ error: 'User ID and Course ID are required' });
  }

  db.run(
    'INSERT OR IGNORE INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)',
    [userId, courseId, 'active'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to grant access' });
      }
      res.json({ message: 'Access granted successfully' });
    }
  );
});

app.delete('/api/admin/revoke-access', authenticateToken, requireAdmin, (req, res) => {
  const { userId, courseId } = req.body;

  if (!userId || !courseId) {
    return res.status(400).json({ error: 'User ID and Course ID are required' });
  }

  db.run(
    'UPDATE enrollments SET status = ? WHERE user_id = ? AND course_id = ?',
    ['inactive', userId, courseId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to revoke access' });
      }
      res.json({ message: 'Access revoked successfully' });
    }
  );
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 IG Nation Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin-panel.html`);
  console.log(`🔐 Admin Login: admin@ignation.com / admin123`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
