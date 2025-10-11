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
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "https://img.youtube.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://api.simplesvg.com", "https://code.iconify.design"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
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

    -- Assistants table (Teaching Assistants)
    CREATE TABLE IF NOT EXISTS assistants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      teacher_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    );

    -- Parents table
    CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      whatsapp_number TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Student-Parent relationship table
    CREATE TABLE IF NOT EXISTS student_parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      parent_id INTEGER NOT NULL,
      relationship TEXT DEFAULT 'parent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id),
      FOREIGN KEY (parent_id) REFERENCES parents (id),
      UNIQUE(student_id, parent_id)
    );

    -- Parent Followup Settings table
    CREATE TABLE IF NOT EXISTS parent_followup_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      weekly_email BOOLEAN DEFAULT 1,
      weekly_whatsapp BOOLEAN DEFAULT 0,
      monthly_email BOOLEAN DEFAULT 1,
      monthly_whatsapp BOOLEAN DEFAULT 0,
      preferred_day TEXT DEFAULT 'Monday',
      preferred_time TEXT DEFAULT '09:00',
      last_weekly_sent DATETIME,
      last_monthly_sent DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES parents (id),
      UNIQUE(parent_id)
    );

    -- Student Progress Tracking table
    CREATE TABLE IF NOT EXISTS student_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      activity_name TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      completed BOOLEAN DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id),
      FOREIGN KEY (course_id) REFERENCES courses (id)
    );

    -- Mathematics Subject Database
    CREATE TABLE IF NOT EXISTS mathematics_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      topic TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      accuracy DECIMAL(5,2),
      time_spent INTEGER DEFAULT 0,
      flashcards_correct INTEGER DEFAULT 0,
      flashcards_wrong INTEGER DEFAULT 0,
      homework_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      exams_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id)
    );

    -- Physics Subject Database
    CREATE TABLE IF NOT EXISTS physics_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      topic TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      accuracy DECIMAL(5,2),
      time_spent INTEGER DEFAULT 0,
      flashcards_correct INTEGER DEFAULT 0,
      flashcards_wrong INTEGER DEFAULT 0,
      homework_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      exams_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id)
    );

    -- Chemistry Subject Database
    CREATE TABLE IF NOT EXISTS chemistry_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      topic TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      accuracy DECIMAL(5,2),
      time_spent INTEGER DEFAULT 0,
      flashcards_correct INTEGER DEFAULT 0,
      flashcards_wrong INTEGER DEFAULT 0,
      homework_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      exams_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id)
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

      -- Insert sample assistants
      INSERT INTO assistants (first_name, last_name, email, subject, teacher_id) VALUES
      ('Alex', 'Martinez', 'a.martinez@ignation.com', 'Mathematics', 1),
      ('Emily', 'Chen', 'e.chen@ignation.com', 'Physics', 2),
      ('James', 'Taylor', 'j.taylor@ignation.com', 'Chemistry', 3),
      ('Sophie', 'Anderson', 's.anderson@ignation.com', 'Mathematics', 1);

      -- Insert sample parents
      INSERT INTO parents (first_name, last_name, email, phone, whatsapp_number) VALUES
      ('Peter', 'Smith', 'peter.smith@parent.com', '+44 7111 222333', '+44 7111 222333'),
      ('Mary', 'Johnson', 'mary.johnson@parent.com', '+44 7222 333444', '+44 7222 333444'),
      ('Thomas', 'Brown', 'thomas.brown@parent.com', '+44 7333 444555', '+44 7333 444555'),
      ('Linda', 'Wilson', 'linda.wilson@parent.com', '+44 7444 555666', '+44 7444 555666'),
      ('Richard', 'Lee', 'richard.lee@parent.com', '+44 7555 666777', '+44 7555 666777');

      -- Link students to parents
      INSERT INTO student_parents (student_id, parent_id, relationship) VALUES
      (2, 1, 'Father'),
      (3, 2, 'Mother'),
      (4, 3, 'Father'),
      (5, 4, 'Mother'),
      (6, 5, 'Father');

      -- Insert parent followup settings
      INSERT INTO parent_followup_settings (parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day) VALUES
      (1, 1, 1, 1, 0, 'Monday'),
      (2, 1, 0, 1, 1, 'Friday'),
      (3, 1, 1, 1, 1, 'Monday'),
      (4, 1, 0, 1, 0, 'Wednesday'),
      (5, 1, 1, 1, 1, 'Monday');

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

// Get all students
app.get('/api/admin/students', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM users WHERE role = "student" ORDER BY created_at DESC', (err, rows) => {
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

// ========== ASSISTANTS API ==========

// Get all assistants
app.get('/api/admin/assistants', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT a.*, t.first_name || ' ' || t.last_name as teacher_name 
    FROM assistants a
    LEFT JOIN teachers t ON a.teacher_id = t.id
    ORDER BY a.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add new assistant
app.post('/api/admin/assistants', authenticateToken, requireAdmin, (req, res) => {
  const { first_name, last_name, email, subject, teacher_id } = req.body;
  
  db.run(
    'INSERT INTO assistants (first_name, last_name, email, subject, teacher_id) VALUES (?, ?, ?, ?, ?)',
    [first_name, last_name, email, subject, teacher_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create assistant' });
      }
      res.json({ id: this.lastID, message: 'Assistant added successfully' });
    }
  );
});

// ========== PARENTS API ==========

// Get all parents with their students
app.get('/api/admin/parents', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT p.*, 
      GROUP_CONCAT(u.first_name || ' ' || u.last_name) as students
    FROM parents p
    LEFT JOIN student_parents sp ON p.id = sp.parent_id
    LEFT JOIN users u ON sp.student_id = u.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add new parent
app.post('/api/admin/parents', authenticateToken, requireAdmin, (req, res) => {
  const { first_name, last_name, email, phone, whatsapp_number } = req.body;
  
  db.run(
    'INSERT INTO parents (first_name, last_name, email, phone, whatsapp_number) VALUES (?, ?, ?, ?, ?)',
    [first_name, last_name, email, phone, whatsapp_number],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create parent' });
      }
      res.json({ id: this.lastID, message: 'Parent added successfully' });
    }
  );
});

// Link student to parent
app.post('/api/admin/link-student-parent', authenticateToken, requireAdmin, (req, res) => {
  const { student_id, parent_id, relationship } = req.body;
  
  db.run(
    'INSERT INTO student_parents (student_id, parent_id, relationship) VALUES (?, ?, ?)',
    [student_id, parent_id, relationship || 'parent'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to link student to parent' });
      }
      res.json({ message: 'Student linked to parent successfully' });
    }
  );
});

// Update parent followup settings
app.post('/api/admin/parent-followup-settings', authenticateToken, requireAdmin, (req, res) => {
  const { parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day, preferred_time } = req.body;
  
  const query = `
    INSERT INTO parent_followup_settings 
    (parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day, preferred_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(parent_id) DO UPDATE SET
      weekly_email = excluded.weekly_email,
      weekly_whatsapp = excluded.weekly_whatsapp,
      monthly_email = excluded.monthly_email,
      monthly_whatsapp = excluded.monthly_whatsapp,
      preferred_day = excluded.preferred_day,
      preferred_time = excluded.preferred_time,
      updated_at = CURRENT_TIMESTAMP
  `;
  
  db.run(query, [parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day, preferred_time],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update followup settings' });
      }
      res.json({ message: 'Followup settings updated successfully' });
    }
  );
});

// Get parent followup settings
app.get('/api/admin/parent-followup-settings/:parent_id', authenticateToken, requireAdmin, (req, res) => {
  db.get(
    'SELECT * FROM parent_followup_settings WHERE parent_id = ?',
    [req.params.parent_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(row || {});
    }
  );
});

// ========== SUBJECT-SPECIFIC DATA API ==========

// Save mathematics activity
app.post('/api/mathematics/activity', authenticateToken, (req, res) => {
  const { activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO mathematics_data 
    (student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct || 0, flashcards_wrong || 0, homework_completed || 0, quizzes_completed || 0, exams_completed || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save mathematics activity' });
      }
      res.json({ id: this.lastID, message: 'Mathematics activity saved successfully' });
    }
  );
});

// Get mathematics data for a student
app.get('/api/mathematics/student/:student_id', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM mathematics_data WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.student_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Save physics activity
app.post('/api/physics/activity', authenticateToken, (req, res) => {
  const { activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO physics_data 
    (student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct || 0, flashcards_wrong || 0, homework_completed || 0, quizzes_completed || 0, exams_completed || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save physics activity' });
      }
      res.json({ id: this.lastID, message: 'Physics activity saved successfully' });
    }
  );
});

// Get physics data for a student
app.get('/api/physics/student/:student_id', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM physics_data WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.student_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Save chemistry activity
app.post('/api/chemistry/activity', authenticateToken, (req, res) => {
  const { activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO chemistry_data 
    (student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct || 0, flashcards_wrong || 0, homework_completed || 0, quizzes_completed || 0, exams_completed || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save chemistry activity' });
      }
      res.json({ id: this.lastID, message: 'Chemistry activity saved successfully' });
    }
  );
});

// Get chemistry data for a student
app.get('/api/chemistry/student/:student_id', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM chemistry_data WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.student_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// ========== STUDENT PROGRESS API ==========

// Track student activity/progress
app.post('/api/student/progress', authenticateToken, (req, res) => {
  const { course_id, activity_type, activity_name, score, total_score, completed, time_spent } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO student_progress 
    (student_id, course_id, activity_type, activity_name, score, total_score, completed, time_spent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, course_id, activity_type, activity_name, score, total_score, completed, time_spent],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save progress' });
      }
      res.json({ id: this.lastID, message: 'Progress saved successfully' });
    }
  );
});

// Get student progress summary for parents
app.get('/api/parent/student-progress/:student_id', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      sp.*,
      c.title as course_title,
      u.first_name || ' ' || u.last_name as student_name
    FROM student_progress sp
    LEFT JOIN courses c ON sp.course_id = c.id
    LEFT JOIN users u ON sp.student_id = u.id
    WHERE sp.student_id = ?
    ORDER BY sp.created_at DESC
    LIMIT 100
  `;
  
  db.all(query, [req.params.student_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// ========== AUTOMATED FOLLOWUP SYSTEM ==========

// Function to generate weekly report for a student
function generateWeeklyReport(studentId, callback) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const query = `
    SELECT 
      activity_type,
      activity_name,
      COUNT(*) as activities_count,
      AVG(score) as avg_score,
      SUM(time_spent) as total_time,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count
    FROM student_progress
    WHERE student_id = ? AND created_at >= ?
    GROUP BY activity_type
  `;
  
  db.all(query, [studentId, oneWeekAgo], (err, stats) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, stats);
  });
}

// Function to generate monthly report
function generateMonthlyReport(studentId, callback) {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const query = `
    SELECT 
      c.title as course_name,
      COUNT(*) as activities_count,
      AVG(sp.score) as avg_score,
      SUM(sp.time_spent) as total_time,
      SUM(CASE WHEN sp.completed = 1 THEN 1 ELSE 0 END) as completed_count
    FROM student_progress sp
    LEFT JOIN courses c ON sp.course_id = c.id
    WHERE sp.student_id = ? AND sp.created_at >= ?
    GROUP BY sp.course_id
  `;
  
  db.all(query, [studentId, oneMonthAgo], (err, stats) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, stats);
  });
}

// Send parent followup (manual trigger for testing)
app.post('/api/admin/send-parent-followup', authenticateToken, requireAdmin, (req, res) => {
  const { parent_id, type } = req.body; // type: 'weekly' or 'monthly'
  
  // Get parent details and their children
  db.get('SELECT * FROM parents WHERE id = ?', [parent_id], (err, parent) => {
    if (err || !parent) {
      return res.status(500).json({ error: 'Parent not found' });
    }
    
    // Get linked students
    db.all(
      `SELECT u.*, sp.relationship 
       FROM users u 
       JOIN student_parents sp ON u.id = sp.student_id 
       WHERE sp.parent_id = ?`,
      [parent_id],
      (err, students) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to get students' });
        }
        
        // Generate reports for each student
        const reports = [];
        let processed = 0;
        
        students.forEach(student => {
          const reportFn = type === 'weekly' ? generateWeeklyReport : generateMonthlyReport;
          
          reportFn(student.id, (err, stats) => {
            processed++;
            
            if (!err && stats) {
              reports.push({
                student: `${student.first_name} ${student.last_name}`,
                stats: stats
              });
            }
            
            if (processed === students.length) {
              // Prepare email/WhatsApp content
              const reportContent = {
                parent_name: `${parent.first_name} ${parent.last_name}`,
                parent_email: parent.email,
                parent_whatsapp: parent.whatsapp_number,
                report_type: type,
                generated_date: new Date().toISOString(),
                students_reports: reports
              };
              
              // Update last sent timestamp
              const updateField = type === 'weekly' ? 'last_weekly_sent' : 'last_monthly_sent';
              db.run(
                `UPDATE parent_followup_settings SET ${updateField} = CURRENT_TIMESTAMP WHERE parent_id = ?`,
                [parent_id]
              );
              
              // In a real implementation, you would send email/WhatsApp here
              console.log('📧 Sending followup to:', parent.email);
              console.log('📊 Report:', reportContent);
              
              res.json({ 
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} followup sent successfully`,
                report: reportContent
              });
            }
          });
        });
      }
    );
  });
});

// Get parents due for weekly followup
app.get('/api/admin/parents-due-weekly', authenticateToken, requireAdmin, (req, res) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  const query = `
    SELECT p.*, pfs.*
    FROM parents p
    JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
    WHERE p.is_active = 1 
    AND (pfs.weekly_email = 1 OR pfs.weekly_whatsapp = 1)
    AND pfs.preferred_day = ?
    AND (pfs.last_weekly_sent IS NULL OR date(pfs.last_weekly_sent) < date('now', '-7 days'))
  `;
  
  db.all(query, [today], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get parents due for monthly followup
app.get('/api/admin/parents-due-monthly', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT p.*, pfs.*
    FROM parents p
    JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
    WHERE p.is_active = 1 
    AND (pfs.monthly_email = 1 OR pfs.monthly_whatsapp = 1)
    AND (pfs.last_monthly_sent IS NULL OR date(pfs.last_monthly_sent) < date('now', '-30 days'))
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Automated scheduled task to send followups
function scheduleParentFollowups() {
  console.log('🔄 Checking for parent followups to send...');
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check weekly followups
  const weeklyQuery = `
    SELECT p.id, p.email, p.whatsapp_number, pfs.weekly_email, pfs.weekly_whatsapp
    FROM parents p
    JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
    WHERE p.is_active = 1 
    AND (pfs.weekly_email = 1 OR pfs.weekly_whatsapp = 1)
    AND pfs.preferred_day = ?
    AND (pfs.last_weekly_sent IS NULL OR date(pfs.last_weekly_sent) < date('now', '-7 days'))
  `;
  
  db.all(weeklyQuery, [today], (err, parents) => {
    if (!err && parents && parents.length > 0) {
      console.log(`📧 Found ${parents.length} parents due for weekly followup`);
      parents.forEach(parent => {
        // Send weekly followup
        console.log(`Sending weekly report to parent ID ${parent.id}`);
        // TODO: Integrate with email/WhatsApp API
      });
    }
  });
  
  // Check monthly followups (send on 1st of month)
  const dayOfMonth = new Date().getDate();
  if (dayOfMonth === 1) {
    const monthlyQuery = `
      SELECT p.id, p.email, p.whatsapp_number, pfs.monthly_email, pfs.monthly_whatsapp
      FROM parents p
      JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
      WHERE p.is_active = 1 
      AND (pfs.monthly_email = 1 OR pfs.monthly_whatsapp = 1)
      AND (pfs.last_monthly_sent IS NULL OR date(pfs.last_monthly_sent) < date('now', '-30 days'))
    `;
    
    db.all(monthlyQuery, (err, parents) => {
      if (!err && parents && parents.length > 0) {
        console.log(`📧 Found ${parents.length} parents due for monthly followup`);
        parents.forEach(parent => {
          // Send monthly followup
          console.log(`Sending monthly report to parent ID ${parent.id}`);
          // TODO: Integrate with email/WhatsApp API
        });
      }
    });
  }
}

// Schedule followup checks every day at 9:00 AM
const schedule = require('node-schedule');
const rule = new schedule.RecurrenceRule();
rule.hour = 9;
rule.minute = 0;

const job = schedule.scheduleJob(rule, function() {
  console.log('⏰ Running scheduled parent followup check...');
  scheduleParentFollowups();
});

// Also run check immediately on server start (for testing)
setTimeout(() => {
  console.log('🚀 Running initial parent followup check...');
  scheduleParentFollowups();
}, 5000);

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
