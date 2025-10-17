// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-for-prod';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from backend/public (we'll populate it with frontend assets)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Static file serving moved after API routes to prevent interference

// If a public file for the homepage exists, serve it
app.get('/', (req, res) => {
    const filePath = path.join(publicDir, 'index.html');
    if (require('fs').existsSync(filePath)) return res.sendFile(filePath);
    // fallback to repo root version
    return res.sendFile(path.join(__dirname, '..', 'index.html'));
});
    // Health endpoint for readiness checks
    app.get('/health', (req, res) => {
        // Quick DB check
        db.get("SELECT 1 AS ok", (err, row) => {
            if (err) return res.status(500).json({ status: 'fail', error: err.message });
            return res.json({ status: 'ok', db: !!row });
        });
    });

// Deny access to sensitive filenames if someone tries to request them directly
app.use((req, res, next) => {
    const forbidden = ['database.sqlite', 'server.js', '.env'];
    const requested = req.path.toLowerCase();
    for (const f of forbidden) {
        if (requested.includes(f)) {
            return res.status(404).send('Not Found');
        }
    }
    next();
});

// Database connection
const db = new sqlite3.Database('./database.sqlite');

// Initialize database tables if they don't exist
db.serialize(() => {
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        phone_country TEXT,
        parent_phone TEXT,
        parent_phone_country TEXT,
        role TEXT DEFAULT 'student',
        username TEXT,
        parent_id INTEGER,
        student_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES users(id),
        FOREIGN KEY (student_id) REFERENCES users(id)
    )`);

    // Ensure users table has a username column. Use PRAGMA to check first.
    db.all(`PRAGMA table_info('users')`, (err, cols) => {
        if (err) {
            console.error('Error checking users table schema:', err);
        } else {
            const hasUsername = cols && cols.some(c => c.name === 'username');
            const hasPhoneCountry = cols && cols.some(c => c.name === 'phone_country');
            const hasParentPhoneCountry = cols && cols.some(c => c.name === 'parent_phone_country');
            
            if (!hasUsername) {
                db.run(`ALTER TABLE users ADD COLUMN username TEXT`, (aErr) => {
                    if (aErr && !aErr.message.includes('duplicate column name')) {
                        console.error('Error adding username column:', aErr);
                    }
                    // After ALTER completes (or fails with duplicate), try to populate username
                    db.run(`UPDATE users SET username = email WHERE username IS NULL`, (uErr) => {
                        if (uErr) console.error('Error updating users usernames after ALTER:', uErr);
                    });
                });
            } else {
                // still ensure null usernames get filled
                db.run(`UPDATE users SET username = email WHERE username IS NULL`, (uErr) => {
                    if (uErr) console.error('Error updating users usernames:', uErr);
                });
            }
            
            if (!hasPhoneCountry) {
                db.run(`ALTER TABLE users ADD COLUMN phone_country TEXT`, (aErr) => {
                    if (aErr && !aErr.message.includes('duplicate column name')) {
                        console.error('Error adding phone_country column:', aErr);
                    }
                });
            }
            
            if (!hasParentPhoneCountry) {
                db.run(`ALTER TABLE users ADD COLUMN parent_phone_country TEXT`, (aErr) => {
                    if (aErr && !aErr.message.includes('duplicate column name')) {
                        console.error('Error adding parent_phone_country column:', aErr);
                    }
                });
            }
            
            // Also check for parent_phone column
            const hasParentPhone = cols && cols.some(c => c.name === 'parent_phone');
            if (!hasParentPhone) {
                db.run(`ALTER TABLE users ADD COLUMN parent_phone TEXT`, (aErr) => {
                    if (aErr && !aErr.message.includes('duplicate column name')) {
                        console.error('Error adding parent_phone column:', aErr);
                    }
                });
            }
        }
    });

    // Create a new teachers table with the desired schema, then copy data from any existing teachers table.
    db.run(`CREATE TABLE IF NOT EXISTS teachers_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Inspect existing teachers table to decide how to copy data safely
    db.all(`PRAGMA table_info('teachers')`, (tErr, tCols) => {
        if (tErr) {
            console.error('Error inspecting teachers schema:', tErr);
        } else if (!tCols || tCols.length === 0) {
            // No existing teachers table to copy
        } else {
            const hasFirst = tCols.some(c => c.name === 'first_name');
            const hasFull = tCols.some(c => c.name === 'full_name');

            let copySql = null;
            if (hasFirst) {
                copySql = `INSERT OR IGNORE INTO teachers_new (id, email, full_name, created_at) SELECT id, email, first_name || ' ' || last_name, created_at FROM teachers`;
            } else if (hasFull) {
                copySql = `INSERT OR IGNORE INTO teachers_new (id, email, full_name, created_at) SELECT id, email, full_name, created_at FROM teachers`;
            } else {
                // Unknown teachers schema: copy what we can, set full_name to NULL
                copySql = `INSERT OR IGNORE INTO teachers_new (id, email, full_name, created_at) SELECT id, email, NULL, datetime('now') FROM teachers`;
            }

            if (copySql) {
                db.run(copySql, (cErr) => {
                    if (cErr) console.error('Error copying teachers data:', cErr);
                    // Replace old table only after copy attempt
                    db.run(`DROP TABLE IF EXISTS teachers`, (dErr) => {
                        if (dErr) console.error('Error dropping old teachers table:', dErr);
                        db.run(`ALTER TABLE teachers_new RENAME TO teachers`, (rErr) => {
                            if (rErr) console.error('Error renaming teachers table:', rErr);
                        });
                    });
                });
            }
        }
    });

    // Lectures table - ensure exists
    db.run(`CREATE TABLE IF NOT EXISTS lectures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT,
        pdf_url TEXT,
        duration INTEGER,
        type TEXT DEFAULT 'video',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    )`);

    // Password resets table for forgot-password flow
    db.run(`CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Assignments table
    db.run(`CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        teacher_id INTEGER,
        subject TEXT DEFAULT 'mathematics',
        points INTEGER DEFAULT 10,
        difficulty TEXT DEFAULT 'medium',
        due_date DATETIME,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
    )`);

    // Exams table
    db.run(`CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        teacher_id INTEGER,
        subject TEXT DEFAULT 'mathematics',
        points INTEGER DEFAULT 20,
        duration INTEGER DEFAULT 60,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
    )`);

    // Quizzes table
    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        teacher_id INTEGER,
        subject TEXT DEFAULT 'mathematics',
        points INTEGER DEFAULT 5,
        duration INTEGER DEFAULT 30,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
    )`);

    // Submissions table
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER,
        student_id INTEGER,
        answers TEXT,
        score INTEGER,
        status TEXT DEFAULT 'submitted',
        graded INTEGER DEFAULT 0,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id),
        FOREIGN KEY (student_id) REFERENCES users(id)
    )`);

    // Add sample data for testing
    db.run(`INSERT OR IGNORE INTO assignments (id, title, description, teacher_id, subject, points, difficulty, due_date, is_active) VALUES 
        (1, 'Algebra Fundamentals', 'Complete algebraic equations and solve for variables', 1, 'mathematics', 15, 'easy', datetime('now', '+7 days'), 1),
        (2, 'Calculus Derivatives', 'Find derivatives of polynomial and trigonometric functions', 1, 'mathematics', 25, 'hard', datetime('now', '+10 days'), 1),
        (3, 'Geometry Proofs', 'Prove geometric theorems using logical reasoning', 1, 'mathematics', 20, 'medium', datetime('now', '+5 days'), 1)
    `);

    db.run(`INSERT OR IGNORE INTO exams (id, title, description, teacher_id, subject, points, duration, is_active) VALUES 
        (1, 'Midterm Mathematics Exam', 'Comprehensive exam covering algebra, geometry, and calculus', 1, 'mathematics', 100, 120, 1),
        (2, 'Final Mathematics Exam', 'End-of-year comprehensive mathematics examination', 1, 'mathematics', 150, 180, 1)
    `);

    db.run(`INSERT OR IGNORE INTO quizzes (id, title, description, teacher_id, subject, points, duration, is_active) VALUES 
        (1, 'Algebra Quiz', 'Quick quiz on basic algebraic concepts', 1, 'mathematics', 10, 30, 1),
        (2, 'Geometry Quiz', 'Quiz on geometric shapes and properties', 1, 'mathematics', 10, 25, 1),
        (3, 'Calculus Quiz', 'Quiz on limits and derivatives', 1, 'mathematics', 15, 45, 1)
    `);
});

// API Routes

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, email, password, userType } = req.body;
    const identifier = (username || email || '').toString().trim();


    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Username/email and password are required', error: 'Username/email and password are required' });
    }

    function sendSuccess(row, role) {
        const userObj = {
            id: row.id,
            username: row.username || row.email || null,
            email: row.email || null,
            first_name: row.first_name || (row.full_name ? row.full_name.split(' ')[0] : null) || null,
            last_name: row.last_name || (row.full_name ? row.full_name.split(' ').slice(1).join(' ') : null) || null,
            full_name: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || null,
            userType: role
        };

        const token = jwt.sign({ id: row.id, role }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        return res.json({ success: true, message: 'Login successful', token, user: userObj });
    }

    // Helper to fetch a single row by identifier (username or email) in a safe way
    function getRowByIdentifier(table, identifier, callback) {
        db.all(`PRAGMA table_info('${table}')`, (pErr, cols) => {
            if (pErr) {
                console.error('Error checking', table, 'schema:', pErr);
                return callback(pErr);
            }
            const hasUsername = cols && cols.some(c => c.name === 'username');
            const hasEmail = cols && cols.some(c => c.name === 'email');

            let sql;
            let params;
            if (hasUsername && hasEmail) {
                sql = `SELECT * FROM ${table} WHERE username = ? OR email = ?`;
                params = [identifier, identifier];
            } else if (hasEmail) {
                sql = `SELECT * FROM ${table} WHERE email = ?`;
                params = [identifier];
            } else {
                // last resort: try matching username field if present, else attempt a generic select
                sql = `SELECT * FROM ${table} WHERE username = ?`;
                params = [identifier];
            }

            db.get(sql, params, (gErr, row) => {
                if (gErr) {
                    console.error(`Database error querying ${table}:`, gErr);
                    return callback(gErr);
                }
                callback(null, row);
            });
        });
    }

    // migrate plaintext password to bcrypt for a user row
    function migratePlaintextToBcrypt(table, row, password) {
        if (!row || !password) return;
        const stored = row.password || row.pass || row.passsword;
        if (!stored) return;
        if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) return;
        bcrypt.hash(password, 10, (hErr, hash) => {
            if (hErr) { console.error('Hash error during migration:', hErr); return; }
            db.run(`UPDATE ${table} SET password = ? WHERE id = ?`, [hash, row.id], function(uErr) {
                if (uErr) console.error('Failed to migrate plaintext password for user', row.id, uErr);
                else console.log('Migrated plaintext password to bcrypt for', table, 'id', row.id);
            });
        });
    }

    // If userType is given, prefer that table
    if (userType) {
        const table = userType === 'teacher' ? 'teachers' : 'users';
        return getRowByIdentifier(table, identifier, (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error', error: 'Database error' });
            if (!row) return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });

            const stored = row.password || row.pass || row.passsword;
            if (stored && (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$'))) {
                return bcrypt.compare(password, stored, (bErr, same) => {
                    if (bErr) { console.error('bcrypt error:', bErr); return res.status(500).json({ success: false, message: 'Authentication error', error: 'Authentication error' }); }
                    if (same) return sendSuccess(row, userType);
                    return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
                });
            }
            if (stored === password) {
                // migrate to bcrypt asynchronously and return success
                migratePlaintextToBcrypt(userType === 'teacher' ? 'teachers' : 'students', row, password);
                return sendSuccess(row, userType);
            }
            return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
        });
    }

    // Use users table for login
    getRowByIdentifier('users', identifier, (uErr, uRow) => {
        if (uErr) { 
            console.error('Database error:', uErr); 
            return res.status(500).json({ success: false, message: 'Database error', error: 'Database error' }); 
        }
        if (!uRow) {
            return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
        }

        const stored = uRow.password || uRow.pass || uRow.passsword;
        if (stored && (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$'))) {
            return bcrypt.compare(password, stored, (bErr, same) => {
                if (bErr) { 
                    console.error('bcrypt error:', bErr); 
                    return res.status(500).json({ success: false, message: 'Authentication error', error: 'Authentication error' }); 
                }
                if (same) return sendSuccess(uRow, uRow.role || 'student');
                return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
            });
        }
        if (stored === password) {
            // migrate to bcrypt
            migratePlaintextToBcrypt('users', uRow, password);
            return sendSuccess(uRow, uRow.role || 'student');
        }
        return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
    });
});

// Simple test registration endpoint
app.post('/api/register-test', (req, res) => {
    const { first_name, last_name, email, password, phone, parent_phone } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Hash error' });
        }
        
        // Simple insert with minimal columns
        const sql = `INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)`;
        const params = [email, hash, first_name || 'User', last_name || 'Name', 'student'];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Registration error:', err);
                return res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
            }
            
            res.json({ 
                success: true, 
                message: 'Registration successful',
                userId: this.lastID 
            });
        });
    });
});

// Register endpoint
app.post('/api/register', (req, res) => {
    // Accept either legacy fields (username, fullName, userType) or frontend fields (first_name, last_name, phone, parent_phone, role)
    const { username, email, password, fullName, userType, first_name, last_name, phone, phone_country, parent_phone, parent_phone_country, role } = req.body;

    const derivedEmail = (email || '').toString().trim().toLowerCase();
    const derivedPassword = (password || '').toString();
    const derivedUserType = (role || userType || 'student').toString();
    const derivedFullName = fullName || (first_name ? `${first_name} ${last_name || ''}`.trim() : null);
    const derivedUsername = username || derivedEmail || (first_name ? `${first_name}.${(last_name||'')}`.replace(/\s+/g,'').toLowerCase() : null);

    if (!derivedEmail || !derivedPassword) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const table = derivedUserType === 'teacher' ? 'teachers' : 'users';

    // Hash password before storing
    bcrypt.hash(derivedPassword, 10, (hErr, hash) => {
        if (hErr) {
            console.error('Hash error during registration:', hErr);
            return res.status(500).json({ success: false, message: 'Hash error' });
        }

        // Check table schema and build appropriate SQL
        db.all(`PRAGMA table_info('${table}')`, (pragmaErr, cols) => {
            if (pragmaErr) {
                console.error('Error checking table schema:', pragmaErr);
                return res.status(500).json({ success: false, message: 'Database schema error' });
            }
            
            const columnNames = cols.map(c => c.name);
            console.log(`Available columns in ${table}:`, columnNames);
            
            // Build SQL based on available columns
            let sql, params;
            
            if (columnNames.includes('parent_phone') && columnNames.includes('phone_country')) {
                // Full schema with all columns
                sql = `INSERT INTO ${table} (email, password, first_name, last_name, phone, phone_country, parent_phone, parent_phone_country, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                params = [derivedEmail, hash, first_name || 'Unknown', last_name || 'User', phone || null, phone_country || null, parent_phone || null, parent_phone_country || null, derivedUserType];
            } else if (columnNames.includes('phone')) {
                // Basic schema with phone but no parent_phone
                sql = `INSERT INTO ${table} (email, password, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)`;
                params = [derivedEmail, hash, first_name || 'Unknown', last_name || 'User', phone || null, derivedUserType];
            } else {
                // Minimal schema
                sql = `INSERT INTO ${table} (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)`;
                params = [derivedEmail, hash, first_name || 'Unknown', last_name || 'User', derivedUserType];
            }
            
            console.log(`Using SQL: ${sql}`);
            console.log(`With params:`, params);
            
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database error during registration:', err);
                    if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                        // Check if it's specifically an email constraint
                        if (err.message && (err.message.includes('email') || err.message.includes('UNIQUE constraint failed: students.email'))) {
                            return res.status(400).json({ success: false, message: 'This email address is already registered. Please use the login form instead.' });
                        }
                        // Check if it's a username constraint
                        if (err.message && (err.message.includes('username') || err.message.includes('UNIQUE constraint failed: students.username'))) {
                            return res.status(400).json({ success: false, message: 'This username is already taken. Please choose a different one.' });
                        }
                        return res.status(400).json({ success: false, message: 'Username or email already exists' });
                    }
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Return user object similar to login response
                    const userObj = {
                        id: this.lastID,
                        email: derivedEmail,
                        first_name: first_name,
                        last_name: last_name,
                        phone: phone,
                        role: derivedUserType
                    };

                const token = jwt.sign({ id: this.lastID, role: derivedUserType }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
                return res.json({ success: true, message: 'Registration successful', token, user: userObj });
            });
        });
    });
});

// Get lectures endpoint
app.get('/api/lectures', (req, res) => {
    const { teacher_id, subject } = req.query;
    
    let query = 'SELECT * FROM lectures WHERE is_active = 1';
    let params = [];
    
    if (teacher_id) {
        query += ' AND teacher_id = ?';
        params.push(teacher_id);
    }
    
    if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        res.json({
            success: true,
            lectures: rows
        });
    });
});

// Get user's enrollments endpoint
app.get('/api/my-enrollments', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    
    // Query enrollments table for this user
    db.all(
        `SELECT e.*, c.title as course_title, c.level as course_level 
         FROM enrollments e 
         LEFT JOIN courses c ON e.course_id = c.id 
         WHERE e.user_id = ?`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Database error fetching enrollments:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            res.json({
                success: true,
                enrollments: rows || []
            });
        }
    );
});

// Create new order
app.post('/api/orders', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    const { customer_name, customer_email, customer_phone, courses, total_amount, payment_method, payment_screenshot } = req.body;
    
    if (!courses || !total_amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const coursesJson = typeof courses === 'string' ? courses : JSON.stringify(courses);
    
    // CRITICAL CHECK: Verify courses is not empty
    const parsedCourses = JSON.parse(coursesJson);
    console.log('📦 Order creation - Received courses:', coursesJson);
    console.log('📦 Parsed courses:', parsedCourses);
    console.log('📦 Parsed courses length:', parsedCourses.length);
    
    if (!parsedCourses || parsedCourses.length === 0) {
        console.error('❌❌❌ CRITICAL: Attempting to save order with EMPTY courses!');
        console.error('❌ Request body:', req.body);
        return res.status(400).json({ 
            error: 'Cannot create order with empty courses',
            message: 'Courses array is empty. Please add at least one course.' 
        });
    }
    
    if (!parsedCourses[0] || !parsedCourses[0].title) {
        console.error('❌❌❌ CRITICAL: First course has no title!');
        console.error('❌ First course:', parsedCourses[0]);
        return res.status(400).json({ 
            error: 'Invalid course data',
            message: 'Course data is missing required fields.' 
        });
    }
    
    db.run(
        `INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, courses, total_amount, payment_method, payment_screenshot, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [userId, customer_name, customer_email, customer_phone, coursesJson, total_amount, payment_method, payment_screenshot],
        function(err) {
            if (err) {
                console.error('Error creating order:', err);
                return res.status(500).json({ error: 'Failed to create order' });
            }
            
            res.json({
                success: true,
                orderId: this.lastID,
                message: 'Order created successfully'
            });
        }
    );
});

// Get pending order for user
app.get('/api/orders/pending/:userId', authenticateJWT, (req, res) => {
    const userId = req.params.userId;
    
    // Ensure user can only access their own orders (or admin can access any)
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    db.get(
        `SELECT * FROM orders WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
        [userId],
        (err, row) => {
            if (err) {
                console.error('Error fetching order:', err);
                return res.status(500).json({ error: 'Failed to fetch order' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'No pending order found' });
            }
            
            res.json(row);
        }
    );
});

// Check order status and access
app.get('/api/orders/status/:userId', authenticateJWT, (req, res) => {
    const userId = req.params.userId;
    
    // Ensure user can only access their own status
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if user has any orders (approved and pending)
    db.all('SELECT status, COUNT(*) as count FROM orders WHERE user_id = ? GROUP BY status', [userId], (orderErr, orderRows) => {
        if (orderErr) {
            console.error('Error checking orders:', orderErr);
            return res.status(500).json({ error: 'Failed to check status' });
        }
        
        const approvedOrders = orderRows.find(r => r.status === 'approved')?.count || 0;
        const pendingOrders = orderRows.find(r => r.status === 'pending')?.count || 0;
        
        // Check enrollments table columns first to handle different schemas
        db.all('PRAGMA table_info(enrollments)', (pragmaErr, cols) => {
            if (pragmaErr) {
                console.error('Error checking enrollments schema:', pragmaErr);
                // If we can't check enrollments, just return based on orders
                return res.json({
                    status: approvedOrders > 0 ? 'approved' : (pendingOrders > 0 ? 'pending' : 'none'),
                    hasAccess: approvedOrders > 0,
                    approvedOrders: approvedOrders,
                    pendingOrders: pendingOrders,
                    activeEnrollments: 0
                });
            }
            
            const columnNames = cols.map(c => c.name);
            const hasStudentId = columnNames.includes('student_id');
            const hasUserId = columnNames.includes('user_id');
            
            // Build query based on available columns (don't use is_active as it may not exist)
            let enrollmentQuery;
            if (hasStudentId) {
                enrollmentQuery = 'SELECT COUNT(*) as active_enrollments FROM enrollments WHERE student_id = ?';
            } else if (hasUserId) {
                enrollmentQuery = 'SELECT COUNT(*) as active_enrollments FROM enrollments WHERE user_id = ?';
            } else {
                // No suitable column found, return based on orders only
                return res.json({
                    status: approvedOrders > 0 ? 'approved' : (pendingOrders > 0 ? 'pending' : 'none'),
                    hasAccess: approvedOrders > 0,
                    approvedOrders: approvedOrders,
                    pendingOrders: pendingOrders,
                    activeEnrollments: 0
                });
            }
            
            // Check enrollments
            db.get(enrollmentQuery, [userId], (enrollErr, enrollRow) => {
                if (enrollErr) {
                    console.error('Error checking enrollments:', enrollErr);
                    // Return based on orders only
                    return res.json({
                        status: approvedOrders > 0 ? 'approved' : (pendingOrders > 0 ? 'pending' : 'none'),
                        hasAccess: approvedOrders > 0,
                        approvedOrders: approvedOrders,
                        pendingOrders: pendingOrders,
                        activeEnrollments: 0
                    });
                }
                
                const activeEnrollments = enrollRow ? enrollRow.active_enrollments : 0;
                const hasAccess = approvedOrders > 0 || activeEnrollments > 0;
                
                res.json({
                    status: hasAccess ? 'approved' : (pendingOrders > 0 ? 'pending' : 'none'),
                    hasAccess: hasAccess,
                    pendingOrders: pendingOrders,
                    approvedOrders: approvedOrders,
                    activeEnrollments: activeEnrollments
                });
            });
        });
    });
});

// Get courses endpoint
app.get('/api/courses', (req, res) => {
    const { level, instructor, is_active } = req.query;
    
    let query = 'SELECT * FROM courses';
    let params = [];
    let conditions = [];
    
    if (level) {
        conditions.push('level = ?');
        params.push(level);
    }
    
    if (instructor) {
        conditions.push('instructor = ?');
        params.push(instructor);
    }
    
    if (is_active !== undefined) {
        conditions.push('is_active = ?');
        params.push(is_active === 'true' ? 1 : 0);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        res.json(rows);
    });
});

// Create lecture endpoint
app.post('/api/lectures', (req, res) => {
    const { teacher_id, subject, title, description, video_url, pdf_url, duration, type } = req.body;
    
    if (!teacher_id || !subject || !title) {
        return res.status(400).json({
            success: false,
            message: 'Teacher ID, subject, and title are required'
        });
    }
    
    db.run(
        `INSERT INTO lectures (teacher_id, subject, title, description, video_url, pdf_url, duration, type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [teacher_id, subject, title, description, video_url, pdf_url, duration, type || 'video'],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            res.json({
                success: true,
                message: 'Lecture created successfully',
                lectureId: this.lastID
            });
        }
    );
});

// --- Email setup and Password Reset Endpoints ---
// Configure nodemailer transporter using environment variables for SMTP; fallback to a logger transport
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    transporter.verify().then(() => console.log('✅ SMTP transporter ready')).catch(err => console.error('SMTP transporter error:', err));
} else {
    console.log('ℹ️ SMTP not configured. Password reset emails will be logged to console. Set SMTP_HOST and SMTP_USER to enable real email sending.');
}

function sendResetEmail(toEmail, code) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?reset_email=${encodeURIComponent(toEmail)}&reset_code=${encodeURIComponent(code)}`;
    const subject = 'Password reset for your account';
    const text = `We received a request to reset your password. Use this 6-digit code: ${code}\nOr click the link: ${resetLink}\nIf you didn't request this, ignore this message.`;
    const html = `<p>We received a request to reset your password.</p><p><strong>Verification code:</strong> ${code}</p><p>Or click the link: <a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, ignore this message.</p>`;

    if (transporter) {
        return transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: toEmail, subject, text, html });
    }
    // Fallback: log the email to console and write a small file for local testing
    console.log('--- Password reset email (logged, SMTP not configured) ---');
    console.log('To:', toEmail);
    console.log('Subject:', subject);
    console.log(text);
    return Promise.resolve();
}

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

// POST /api/forgot-password { email }
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    // Check if email exists in users/students/teachers
    const checkTables = ['users', 'students', 'teachers'];
    (function checkNext(i) {
        if (i >= checkTables.length) {
            // Not found
            return res.status(404).json({ success: false, error: 'Account not found', redirectToRegister: true, message: 'No account with that email. Would you like to register?' });
        }
        const table = checkTables[i];
        db.get(`SELECT 1 FROM ${table} WHERE email = ?`, [email], (err, row) => {
            if (err) {
                // ignore missing table errors and continue
                if (err.message && err.message.includes('no such table')) return checkNext(i + 1);
                console.error('DB error checking email in', table, err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            if (row) {
                // create reset code and save
                const code = generateCode();
                const expiresAt = new Date(Date.now() + 1000 * 60 * 20).toISOString(); // 20 minutes
                db.run(`INSERT INTO password_resets (email, code, expires_at, used) VALUES (?, ?, ?, 0)`, [email, code, expiresAt], function(insErr) {
                    if (insErr) { console.error('Failed to insert password reset:', insErr); return res.status(500).json({ success: false, error: 'Database error' }); }
                    sendResetEmail(email, code).then(() => {
                        // For development: include code in response when SMTP not configured
                        const isDevelopment = !transporter;
                        return res.json({ 
                            success: true, 
                            message: 'Verification code sent',
                            ...(isDevelopment && { devCode: code, devMessage: 'SMTP not configured. Use this code: ' + code })
                        });
                    }).catch(mailErr => {
                        console.error('Failed to send reset email:', mailErr);
                        return res.status(500).json({ success: false, error: 'Failed to send email' });
                    });
                });
            } else {
                checkNext(i + 1);
            }
        });
    })(0);
});

// POST /api/verify-reset-code { email, verificationCode }
app.post('/api/verify-reset-code', (req, res) => {
    const { email, verificationCode } = req.body;
    if (!email || !verificationCode) return res.status(400).json({ success: false, error: 'Email and verification code are required' });

    const now = new Date().toISOString();
    db.get(`SELECT * FROM password_resets WHERE email = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1`, [email, verificationCode, now], (err, row) => {
        if (err) { console.error('DB error verifying code:', err); return res.status(500).json({ success: false, error: 'Database error' }); }
        if (!row) return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
        return res.json({ success: true, message: 'Code valid' });
    });
});

// POST /api/reset-password { email, verificationCode, newPassword }
app.post('/api/reset-password', (req, res) => {
    const { email, verificationCode, newPassword } = req.body;
    if (!email || !verificationCode || !newPassword) return res.status(400).json({ success: false, error: 'Missing fields' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'Password too short' });

    const now = new Date().toISOString();
    db.get(`SELECT * FROM password_resets WHERE email = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1`, [email, verificationCode, now], (err, row) => {
        if (err) { console.error('DB error verifying reset code:', err); return res.status(500).json({ success: false, error: 'Database error' }); }
        if (!row) return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });

        // Mark code as used
        db.run(`UPDATE password_resets SET used = 1 WHERE id = ?`, [row.id], (uErr) => {
            if (uErr) console.error('Failed to mark reset code used:', uErr);
            // Update password in whichever table has this email
            const updateInTables = ['users', 'students', 'teachers'];
            (function tryTable(i) {
                if (i >= updateInTables.length) return res.status(500).json({ success: false, error: 'Account not found to update' });
                const table = updateInTables[i];
                db.get(`SELECT id FROM ${table} WHERE email = ?`, [email], (sErr, userRow) => {
                    if (sErr) {
                        if (sErr.message && sErr.message.includes('no such table')) return tryTable(i + 1);
                        console.error('DB error looking up user for reset in', table, sErr);
                        return res.status(500).json({ success: false, error: 'Database error' });
                    }
                    if (!userRow) return tryTable(i + 1);

                    // Hash and update
                    bcrypt.hash(newPassword, 10, (hErr, hash) => {
                        if (hErr) { console.error('Hash error on reset:', hErr); return res.status(500).json({ success: false, error: 'Hash error' }); }
                        db.run(`UPDATE ${table} SET password = ? WHERE id = ?`, [hash, userRow.id], function(upErr) {
                            if (upErr) { console.error('Failed to update password in', table, upErr); return res.status(500).json({ success: false, error: 'Database error' }); }
                            return res.json({ success: true, message: 'Password updated successfully' });
                        });
                    });
                });
            })(0);
        });
    });
});

// Get user profile
app.get('/api/profile', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    
    db.get('SELECT id, first_name, last_name, email, phone, country, date_of_birth, avatar, points, role FROM users WHERE id = ?', 
        [userId], 
        (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Get enrollment count
            db.get('SELECT COUNT(*) as count FROM enrollments WHERE student_id = ? OR user_id = ?', 
                [userId, userId], 
                (err, enrollmentData) => {
                    if (err) {
                        console.error('Error getting enrollments:', err);
                    }
                    
                    // Get rank (simple implementation - count users with more points)
                    db.get('SELECT COUNT(*) + 1 as rank FROM users WHERE points > ? AND role = ?', 
                        [user.points || 0, user.role], 
                        (err, rankData) => {
                            if (err) {
                                console.error('Error getting rank:', err);
                            }
                            
                            res.json({
                                ...user,
                                enrolled_courses: enrollmentData?.count || 0,
                                rank: rankData?.rank || 0
                            });
                        }
                    );
                }
            );
        }
    );
});

// Update user points
app.post('/api/update-points', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    const { points } = req.body;
    
    if (typeof points !== 'number') {
        return res.status(400).json({ error: 'Points must be a number' });
    }
    
    db.run('UPDATE users SET points = ? WHERE id = ?', [points, userId], function(err) {
        if (err) {
            console.error('Error updating points:', err);
            return res.status(500).json({ error: 'Failed to update points' });
        }
        
        res.json({ success: true, points });
    });
});

// Update user profile
app.put('/api/profile', authenticateJWT, upload.single('avatar'), async (req, res) => {
    const userId = req.user.id;
    const { first_name, last_name, phone, country, date_of_birth, current_password, new_password } = req.body;
    
    try {
        // If password change is requested, verify current password
        if (current_password && new_password) {
            const user = await new Promise((resolve, reject) => {
                db.get('SELECT password FROM users WHERE id = ?', [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Verify current password
            const isValidPassword = await bcrypt.compare(current_password, user.password);
            if (!isValidPassword) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            
            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);
            
            // Update user with new password
            db.run(
                'UPDATE users SET first_name = ?, last_name = ?, phone = ?, country = ?, date_of_birth = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [first_name, last_name, phone, country, date_of_birth, hashedPassword, userId],
                function(err) {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Failed to update profile' });
                    }
                    
                    res.json({ success: true, message: 'Profile and password updated successfully' });
                }
            );
        } else {
            // Update user without password change
            let avatarPath = null;
            if (req.file) {
                avatarPath = '/uploads/' + req.file.filename;
            }
            
            const updateFields = [first_name, last_name, phone, country, date_of_birth];
            let query = 'UPDATE users SET first_name = ?, last_name = ?, phone = ?, country = ?, date_of_birth = ?';
            
            if (avatarPath) {
                query += ', avatar = ?';
                updateFields.push(avatarPath);
            }
            
            query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            updateFields.push(userId);
            
            db.run(query, updateFields, function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to update profile' });
                }
                
                res.json({ success: true, message: 'Profile updated successfully', avatar: avatarPath });
            });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update lecture endpoint
app.put('/api/lectures/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, video_url, pdf_url, duration, type } = req.body;
    
    db.run(
        `UPDATE lectures SET title = ?, description = ?, video_url = ?, pdf_url = ?, 
         duration = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [title, description, video_url, pdf_url, duration, type, id],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            res.json({
                success: true,
                message: 'Lecture updated successfully'
            });
        }
    );
});

// Delete lecture endpoint
app.delete('/api/lectures/:id', (req, res) => {
    const { id } = req.params;
    
    db.run(
        'UPDATE lectures SET is_active = 0 WHERE id = ?',
        [id],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            res.json({
                success: true,
                message: 'Lecture deleted successfully'
            });
        }
    );
});

// --- Admin auth middleware and endpoints ---
function authenticateJWT(req, res, next) {
    const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
    const parts = auth.split(' ');
    const token = parts.length === 2 ? parts[1] : null;
    
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    // Allow demo token for Zoom API endpoints
    if (token === 'demo-token') {
        req.user = { id: 'demo-user', role: 'teacher', username: 'demo-teacher' };
        return next();
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, error: 'Invalid token' });
        req.user = decoded;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ success: false, error: 'Forbidden' });
}

// Helper to safely query a table and return rows or empty array when table missing
function safeAll(tableName, res, callback) {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
            if (err.message && err.message.includes('no such table')) return callback(null, []);
            console.error(`DB error selecting from ${tableName}:`, err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        callback(null, rows || []);
    });
}

// GET /api/admin/students
app.get('/api/admin/students', authenticateJWT, requireAdmin, (req, res) => {
    // Query users table where role is 'student'
    db.all('SELECT * FROM users WHERE role = "student"', (err, rows) => {
        if (err) {
            console.error('DB error selecting students:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        return res.json(rows || []);
    });
});

// GET /api/admin/teachers
app.get('/api/admin/teachers', authenticateJWT, requireAdmin, (req, res) => {
    safeAll('teachers', res, (err, rows) => {
        if (err) return;
        return res.json(rows);
    });
});

// GET /api/admin/enrollments
app.get('/api/admin/enrollments', authenticateJWT, requireAdmin, (req, res) => {
    safeAll('enrollments', res, (err, rows) => {
        if (err) return;
        return res.json(rows);
    });
});

// GET /api/admin/orders
app.get('/api/admin/orders', authenticateJWT, requireAdmin, (req, res) => {
    safeAll('orders', res, (err, rows) => {
        if (err) return;
        return res.json(rows);
    });
});

// --- Admin mutation endpoints ---
// Ensure enrollments table exists (lightweight)
db.run(`CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    granted_by_admin INTEGER,
    is_active INTEGER DEFAULT 1,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Orders table for tracking course purchases
// First, check if orders table exists and has the right schema
db.all(`PRAGMA table_info('orders')`, (err, cols) => {
    if (err) {
        console.error('Error checking orders table:', err);
        return;
    }
    
    const existingColumns = (cols || []).map(c => c.name);
    console.log('Existing orders table columns:', existingColumns);
    
    // If table doesn't exist or has wrong schema, recreate it
    if (!existingColumns.includes('customer_name') || !existingColumns.includes('customer_email')) {
        console.log('Orders table schema is outdated. Recreating...');
        
        // Drop old table if it exists
        db.run(`DROP TABLE IF EXISTS orders`, (dropErr) => {
            if (dropErr) {
                console.error('Error dropping old orders table:', dropErr);
                return;
            }
            
            // Create new table with correct schema
            db.run(`CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                courses TEXT NOT NULL,
                total_amount REAL NOT NULL,
                payment_method TEXT,
                payment_screenshot TEXT,
                status TEXT DEFAULT 'pending',
                approved_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                approved_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (approved_by) REFERENCES users(id)
            )`, (createErr) => {
                if (createErr) {
                    console.error('Error creating orders table:', createErr);
                } else {
                    console.log('✅ Orders table created successfully with new schema');
                }
            });
        });
    } else {
        console.log('✅ Orders table schema is up to date');
    }
});

// Helper to ensure enrollments table has expected columns (adds missing columns)
function ensureEnrollmentsSchema(cb) {
    db.all(`PRAGMA table_info('enrollments')`, (err, cols) => {
        if (err) {
            // If table missing, create fresh and callback
            if (err.message && err.message.includes('no such table')) {
                db.run(`CREATE TABLE IF NOT EXISTS enrollments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER,
                    course_id INTEGER,
                    granted_by_admin INTEGER,
                    is_active INTEGER DEFAULT 1,
                    expires_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (cErr) => {
                    if (cErr) console.error('Failed to create enrollments table:', cErr);
                    return cb();
                });
            } else {
                console.error('Error checking enrollments schema:', err);
                return cb();
            }
            return;
        }

        const existing = (cols || []).map(c => c.name);
        const needed = [
            { name: 'student_id', sql: 'ALTER TABLE enrollments ADD COLUMN student_id INTEGER' },
            { name: 'course_id', sql: 'ALTER TABLE enrollments ADD COLUMN course_id INTEGER' },
            { name: 'granted_by_admin', sql: 'ALTER TABLE enrollments ADD COLUMN granted_by_admin INTEGER' },
            { name: 'status', sql: 'ALTER TABLE enrollments ADD COLUMN status TEXT DEFAULT "active"' },
            { name: 'expires_at', sql: 'ALTER TABLE enrollments ADD COLUMN expires_at DATETIME' },
            { name: 'created_at', sql: 'ALTER TABLE enrollments ADD COLUMN created_at DATETIME' }
        ];

        // Add missing columns sequentially
        let i = 0;
        function next() {
            while (i < needed.length && existing.includes(needed[i].name)) i++;
            if (i >= needed.length) return cb();
            const addSql = needed[i].sql;
            db.run(addSql, (aErr) => {
                if (aErr && !aErr.message.includes('duplicate column name')) console.error('Error adding column to enrollments:', aErr);
                i++;
                next();
            });
        }
        next();
    });
}

// Helper to insert into enrollments using only columns that exist in the table
function insertIntoEnrollmentsFlexible(valuesObj, cb) {
    db.all(`PRAGMA table_info('enrollments')`, (eErr, cols) => {
        if (eErr) return cb(eErr);
        const meta = cols || [];

        const colsToInsert = [];
        const params = [];

        // Helper to pick value for a column name
        function pickValue(colName) {
            if (colName === 'user_id') return (valuesObj.user_id !== undefined ? valuesObj.user_id : valuesObj.student_id);
            if (colName === 'student_id') return (valuesObj.student_id !== undefined ? valuesObj.student_id : valuesObj.user_id);
            if (colName === 'product_id') return (valuesObj.product_id !== undefined ? valuesObj.product_id : valuesObj.course_id);
            return valuesObj[colName];
        }

        // Build insert columns only for columns that exist and for which we have a value
        for (const c of meta) {
            const name = c.name;
            const val = pickValue(name);
            if (val !== undefined) {
                colsToInsert.push(name);
                params.push(val);
            }
        }

        // Ensure NOT NULL columns without default are provided
        const missingRequired = meta.filter(c => c.notnull && c.dflt_value === null && !colsToInsert.includes(c.name)).map(c => c.name);
        if (missingRequired.length > 0) {
            const msg = `Missing required columns for enrollments: ${missingRequired.join(', ')}`;
            console.error(msg, 'provided values:', valuesObj);
            return cb(new Error(msg));
        }

        if (colsToInsert.length === 0) return cb(new Error('No matching columns found in enrollments table'));
        const sql = `INSERT INTO enrollments (${colsToInsert.join(',')}) VALUES (${colsToInsert.map(()=>'?').join(',')})`;
        console.log('DEBUG enrollments insert attempt', { valuesObj, meta, colsToInsert, params, sql });
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Enrollments INSERT failed', { sql, params, error: err });
                return cb(err);
            }
            return cb(null, this.lastID);
        });
    });
}

// POST /api/admin/grant-access { student_id, course_id, expires_at? }
app.post('/api/admin/grant-access', authenticateJWT, requireAdmin, (req, res) => {
    const { student_id, course_id, expires_at } = req.body;
    const sid = Number(student_id || req.body.user_id || req.body.userId);
    const cid = Number(course_id || req.body.product_id || req.body.courseId);
    if (!sid || !cid) return res.status(400).json({ success: false, error: 'student_id and course_id are required and must be numeric' });

    ensureEnrollmentsSchema(() => {
        db.all(`PRAGMA table_info('enrollments')`, (eErr, cols) => {
            if (eErr) { console.error('Error inspecting enrollments schema before insert:', eErr); return res.status(500).json({ success: false, error: 'Database error' }); }
            const names = (cols || []).map(c => c.name.toLowerCase());

            // Try minimal insert into the most common schema shapes first
            if (names.includes('user_id') && names.includes('course_id')) {
                console.log('DEBUG grant-access: attempting user_id insert', { sid, cid, body: req.body });
                db.run(`INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`, [sid, cid], function(err) {
                    if (!err) return res.json({ success: true, message: 'Access granted', enrollmentId: this.lastID });
                    console.error('Simple enrollments insert failed (user_id path), falling back to flexible:', err);
                    insertIntoEnrollmentsFlexible({ student_id: sid, course_id: cid, granted_by_admin: req.user.id || null, expires_at: expires_at || null, created_at: new Date().toISOString() }, (iErr, lastId) => {
                        if (iErr) { console.error('DB error granting access (flexible fallback):', iErr); return res.status(500).json({ success: false, error: 'Database error' }); }
                        return res.json({ success: true, message: 'Access granted', enrollmentId: lastId });
                    });
                });
                return;
            }

            if (names.includes('student_id') && names.includes('course_id')) {
                console.log('DEBUG grant-access: attempting student_id insert', { sid, cid, body: req.body });
                db.run(`INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)`, [sid, cid], function(err) {
                    if (!err) return res.json({ success: true, message: 'Access granted', enrollmentId: this.lastID });
                    console.error('Simple enrollments insert failed (student_id path), falling back to flexible:', err);
                    insertIntoEnrollmentsFlexible({ student_id: sid, course_id: cid, granted_by_admin: req.user.id || null, expires_at: expires_at || null, created_at: new Date().toISOString() }, (iErr, lastId) => {
                        if (iErr) { console.error('DB error granting access (flexible fallback):', iErr); return res.status(500).json({ success: false, error: 'Database error' }); }
                        return res.json({ success: true, message: 'Access granted', enrollmentId: lastId });
                    });
                });
                return;
            }

            // Last resort: flexible insertion
            insertIntoEnrollmentsFlexible({ student_id: sid, course_id: cid, granted_by_admin: req.user.id || null, expires_at: expires_at || null, created_at: new Date().toISOString() }, (iErr, lastId) => {
                if (iErr) { console.error('DB error granting access (flexible):', iErr); return res.status(500).json({ success: false, error: 'Database error' }); }
                return res.json({ success: true, message: 'Access granted', enrollmentId: lastId });
            });
        });
    });
});

// POST /api/admin/revoke-access { enrollment_id } OR { student_id, course_id }
app.post('/api/admin/revoke-access', authenticateJWT, requireAdmin, (req, res) => {
    const { enrollment_id, student_id, course_id } = req.body;
    if (!enrollment_id && !(student_id && course_id)) return res.status(400).json({ success: false, error: 'enrollment_id or (student_id and course_id) required' });

    ensureEnrollmentsSchema(() => {
        db.all(`PRAGMA table_info('enrollments')`, (eErr, cols) => {
            if (eErr) { console.error('Error inspecting enrollments schema before revoke:', eErr); return res.status(500).json({ success: false, error: 'Database error' }); }
            const names = (cols || []).map(c => c.name.toLowerCase());
            const studentCol = names.includes('student_id') ? 'student_id' : (names.includes('user_id') ? 'user_id' : 'student_id');
            const courseCol = names.includes('course_id') ? 'course_id' : (names.includes('product_id') ? 'product_id' : 'course_id');

            // Use status column to revoke access
            db.all(`PRAGMA table_info('enrollments')`, (pErr, pCols) => {
                if (pErr) { console.error('Error reading enrollments schema before revoke:', pErr); return res.status(500).json({ success: false, error: 'Database error' }); }
                const existingNames = (pCols || []).map(c => c.name.toLowerCase());
                if (existingNames.includes('status')) {
                    const finalSql = enrollment_id ? `UPDATE enrollments SET status = 'revoked' WHERE id = ?` : `UPDATE enrollments SET status = 'revoked' WHERE ${studentCol} = ? AND ${courseCol} = ?`;
                    const finalParams = enrollment_id ? [enrollment_id] : [student_id, course_id];
                    db.run(finalSql, finalParams, function(err) {
                        if (err) { console.error('DB error revoking access (status):', err); return res.status(500).json({ success: false, error: 'Database error' }); }
                        if (this.changes === 0) return res.status(404).json({ success: false, error: 'No enrollment found to revoke' });
                        return res.json({ success: true, message: 'Access revoked (status updated)' });
                    });
                } else {
                    // Last resort: delete the row
                    const finalSql = enrollment_id ? `DELETE FROM enrollments WHERE id = ?` : `DELETE FROM enrollments WHERE ${studentCol} = ? AND ${courseCol} = ?`;
                    const finalParams = enrollment_id ? [enrollment_id] : [student_id, course_id];
                    db.run(finalSql, finalParams, function(err) {
                        if (err) { console.error('DB error deleting enrollment as fallback:', err); return res.status(500).json({ success: false, error: 'Database error' }); }
                        if (this.changes === 0) return res.status(404).json({ success: false, error: 'No enrollment found to revoke' });
                        return res.json({ success: true, message: 'Access revoked (deleted)' });
                    });
                }
            });
        });
    });
});

// PUT /api/admin/update-student { id, email?, username?, full_name?, first_name?, last_name?, password? }
app.put('/api/admin/update-student', authenticateJWT, requireAdmin, (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'Student id is required' });

    // Allowed fields to update
    const allowed = ['email', 'username', 'full_name', 'first_name', 'last_name', 'password'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
        if (key === 'password') continue; // handle later (hash)
        if (req.body[key] !== undefined) {
            updates.push(`${key} = ?`);
            params.push(req.body[key]);
        }
    }

    function finalizeUpdate(hashedPassword) {
        let finalSql = '';
        const finalParams = params.slice();
        if (hashedPassword) {
            updates.push(`password = ?`);
            finalParams.push(hashedPassword);
        }
        if (updates.length === 0) return res.status(400).json({ success: false, error: 'No valid fields to update' });

        finalSql = `UPDATE students SET ${updates.join(', ')} WHERE id = ?`;
        finalParams.push(id);

        db.run(finalSql, finalParams, function(err) {
            if (err) {
                if (err.message && err.message.includes('no such table')) return res.status(500).json({ success: false, error: 'Students table missing' });
                console.error('DB error updating student:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            if (this.changes === 0) return res.status(404).json({ success: false, error: 'Student not found' });
            return res.json({ success: true, message: 'Student updated' });
        });
    }

    if (req.body.password) {
        bcrypt.hash(req.body.password, 10, (hErr, hash) => {
            if (hErr) { console.error('Hash error updating student password:', hErr); return res.status(500).json({ success: false, error: 'Hash error' }); }
            finalizeUpdate(hash);
        });
    } else {
        finalizeUpdate(null);
    }
});

// DELETE /api/admin/remove-student
app.delete('/api/admin/remove-student', authenticateJWT, requireAdmin, (req, res) => {
    const { studentId } = req.body;
    
    if (!studentId) {
        return res.status(400).json({ success: false, error: 'Student ID is required' });
    }
    
    // First, check if student exists
    db.get('SELECT * FROM users WHERE id = ? AND role = "student"', [studentId], (err, student) => {
        if (err) {
            console.error('DB error checking student:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        // Delete student from users table
        db.run('DELETE FROM users WHERE id = ? AND role = "student"', [studentId], function(err) {
            if (err) {
                console.error('DB error removing student:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ success: false, error: 'Student not found' });
            }
            
            console.log(`Student ${studentId} (${student.first_name} ${student.last_name}) removed successfully`);
            return res.json({ 
                success: true, 
                message: `Student ${student.first_name} ${student.last_name} has been removed successfully` 
            });
        });
    });
});

// Get orders by email (for registration redirection)
app.get('/api/orders/by-email/:email', (req, res) => {
    const email = req.params.email;
    
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    db.all(
        `SELECT * FROM orders WHERE customer_email = ? AND status = 'approved' ORDER BY created_at DESC`,
        [email],
        (err, rows) => {
            if (err) {
                console.error('Error fetching orders by email:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            res.json({ success: true, orders: rows || [] });
        }
    );
});

// Get pending order details by user ID
app.get('/api/orders/pending/:userId', authenticateJWT, (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    // Get the most recent pending order for this user
    db.get(
        `SELECT * FROM orders WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
        [userId],
        (err, row) => {
            if (err) {
                console.error('Error fetching pending order:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            if (!row) {
                return res.status(404).json({ success: false, error: 'No pending order found' });
            }
            
            res.json({ success: true, order: row });
        }
    );
});

// Get all orders for admin
app.get('/api/admin/orders', authenticateJWT, requireAdmin, (req, res) => {
    const { status } = req.query;
    
    let query = `SELECT o.*, u.first_name, u.last_name, u.email 
                 FROM orders o 
                 LEFT JOIN users u ON o.user_id = u.id`;
    let params = [];
    
    if (status) {
        query += ` WHERE o.status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY o.created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }
        
        res.json({ success: true, orders: rows || [] });
    });
});

// POST /api/admin/approve-order { order_id }
app.post('/api/admin/approve-order', authenticateJWT, requireAdmin, (req, res) => {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ success: false, error: 'order_id is required' });

    // Attempt to fetch order row
    db.get(`SELECT * FROM orders WHERE id = ?`, [order_id], (err, order) => {
        if (err) {
            if (err.message && err.message.includes('no such table')) return res.status(500).json({ success: false, error: 'Orders table missing' });
            console.error('DB error fetching order:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        // Mark order approved
        const now = new Date().toISOString();
        const adminId = req.user.id;
        const updateSql = `UPDATE orders SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?`;
        db.run(updateSql, [now, adminId, order_id], function(uErr) {
            if (uErr) {
                console.error('DB error updating order status:', uErr);
                return res.status(500).json({ success: false, error: 'Failed to approve order' });
            }

            // Parse courses from JSON and create enrollments for each
            const studentId = order.user_id;
            let courses = [];
            
            try {
                courses = JSON.parse(order.courses);
                if (!Array.isArray(courses)) courses = [courses];
            } catch (parseErr) {
                console.error('Error parsing courses JSON:', parseErr);
                return res.json({ success: true, message: 'Order approved but could not parse courses' });
            }

            // Create enrollments for each course
            let enrollmentsCreated = 0;
            let enrollmentsProcessed = 0;
            
            courses.forEach((course) => {
                // Match course by title to find correct database course_id
                const courseTitle = course.title;
                
                db.get(`SELECT id FROM courses WHERE title LIKE ?`, [`%${courseTitle}%`], (err, dbCourse) => {
                    enrollmentsProcessed++;
                    
                    if (err || !dbCourse) {
                        console.error('Could not find course in database:', courseTitle, err);
                    } else {
                        const actualCourseId = dbCourse.id;
                        db.run(`INSERT OR IGNORE INTO enrollments (student_id, user_id, course_id, granted_by_admin, enrolled_at) VALUES (?, ?, ?, ?, ?)`,
                            [studentId, studentId, actualCourseId, adminId, now],
                            function(enrollErr) {
                                if (!enrollErr) {
                                    console.log(`✅ Created enrollment: User ${studentId} -> Course ${actualCourseId} (${courseTitle})`);
                                    enrollmentsCreated++;
                                } else {
                                    console.error('Error creating enrollment:', enrollErr);
                                }
                            }
                        );
                    }
                    
                    // Send response after all courses processed
                    if (enrollmentsProcessed === courses.length) {
                        setTimeout(() => {
                            res.json({ 
                                success: true, 
                                message: `Order approved. ${enrollmentsCreated} enrollment(s) created.`,
                                enrollmentsCreated
                            });
                        }, 100);
                    }
                });
            });
        });
    });
});

// Create new course (POST)
app.post('/api/courses', (req, res) => {
    const { title, instructor, price, level, description, icon, is_active } = req.body;
    
    if (!title || !price || !level) {
        return res.status(400).json({ error: 'Title, price, and level are required' });
    }
    
    const query = `INSERT INTO courses (title, instructor, price, level, description, icon, is_active) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [title, instructor || '', price, level, description || '', icon || '', is_active ? 1 : 0], function(err) {
        if (err) {
            console.error('Error creating course:', err);
            return res.status(500).json({ error: 'Failed to create course' });
        }
        
        res.json({ 
            success: true,
            courseId: this.lastID,
            message: 'Course created successfully'
        });
    });
});

// Create course pages (dashboard and content manager)
app.post('/api/admin/create-course-pages', (req, res) => {
    const { courseName, shortName, icon } = req.body;
    
    if (!courseName || !shortName) {
        return res.status(400).json({ error: 'Course name and short name are required' });
    }
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Read templates
        const dashboardTemplate = fs.readFileSync(path.join(__dirname, '../student-dashboard.html'), 'utf8');
        const contentManagerTemplate = fs.readFileSync(path.join(__dirname, '../admin-content-manager.html'), 'utf8');
        
        // Create dashboard page
        let dashboardContent = dashboardTemplate
            .replace(/<title>.*?<\/title>/, `<title>${courseName} | IG Nation</title>`)
            .replace(/Mathematics/g, courseName.replace(' IGCSE', '').replace(' A-Level', ''))
            .replace(/mathematics/g, shortName);
        
        // Create content manager page
        let contentManagerContent = contentManagerTemplate
            .replace(/<title>.*?<\/title>/, `<title>${courseName} Content Manager - IG Nation Admin</title>`)
            .replace(/<h1>📁 Content Manager<\/h1>/, `<h1>📁 ${courseName} Content Manager</h1>`)
            .replace(/Manage course videos and PDFs/, `Manage ${courseName} videos and PDFs`)
            .replace(/let currentCourse = 'mathematics';/, `let currentCourse = '${shortName}';`)
            .replace(/localStorage\.getItem\('courseContentData'\)/, `localStorage.getItem('${shortName}ContentData')`)
            .replace(/localStorage\.setItem\('courseContentData'/, `localStorage.setItem('${shortName}ContentData'`)
            .replace(/contentData = \{[^}]+mathematics[^}]+\}/, `contentData = { ${shortName}: { name: '${courseName}', folders: [], files: [] } }`)
            .replace(/contentData\.mathematics\.folders = \[/, `contentData.${shortName}.folders = [`);
        
        // Write files
        fs.writeFileSync(path.join(__dirname, `../${shortName}-dashboard.html`), dashboardContent);
        fs.writeFileSync(path.join(__dirname, `../${shortName}-content-manager.html`), contentManagerContent);
        
        res.json({ 
            success: true,
            message: 'Course pages created successfully',
            pages: {
                dashboard: `${shortName}-dashboard.html`,
                contentManager: `${shortName}-content-manager.html`
            }
        });
    } catch (error) {
        console.error('Error creating course pages:', error);
        res.status(500).json({ error: 'Failed to create course pages: ' + error.message });
    }
});

// Parent API Endpoints

// Get parent's children progress
app.get('/api/parent/children', authenticateJWT, (req, res) => {
    const parentId = req.user.id;
    
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Access denied. Parent role required.' });
    }
    
    // Get all students linked to this parent
    db.all(`
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.created_at,
               COUNT(DISTINCT e.course_id) as enrolled_courses,
               SUM(CASE WHEN e.course_id IS NOT NULL THEN 1 ELSE 0 END) as total_enrollments
        FROM users u
        LEFT JOIN enrollments e ON u.id = e.user_id
        WHERE u.parent_id = ? AND u.role = 'student'
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.created_at
        ORDER BY u.first_name, u.last_name
    `, [parentId], (err, children) => {
        if (err) {
            console.error('Error fetching children:', err);
            return res.status(500).json({ error: 'Failed to fetch children data' });
        }
        
        res.json({ children });
    });
});

// Get specific child's detailed progress with activity data
app.get('/api/parent/child/:studentId/progress', authenticateJWT, (req, res) => {
    const parentId = req.user.id;
    const studentId = parseInt(req.params.studentId);
    
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Access denied. Parent role required.' });
    }
    
    // Verify the student belongs to this parent
    db.get(`
        SELECT id FROM users 
        WHERE id = ? AND parent_id = ? AND role = 'student'
    `, [studentId, parentId], (err, student) => {
        if (err || !student) {
            return res.status(404).json({ error: 'Student not found or access denied' });
        }
        
        // Get student info
        db.get(`
            SELECT first_name, last_name, email, phone, created_at
            FROM users WHERE id = ?
        `, [studentId], (err, studentInfo) => {
            if (err) {
                console.error('Error fetching student info:', err);
                return res.status(500).json({ error: 'Failed to fetch student info' });
            }
            
            // Get student's course enrollments
            db.all(`
                SELECT c.id, c.title, c.short_name, c.level, c.instructor,
                       e.enrolled_at
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                WHERE e.user_id = ?
                ORDER BY e.enrolled_at DESC
            `, [studentId], (err, courses) => {
                if (err) {
                    console.error('Error fetching courses:', err);
                    return res.status(500).json({ error: 'Failed to fetch courses' });
                }
                
                // Prepare to fetch activity data from localStorage-based sources
                // Since assignments, quizzes, and exams are stored in localStorage,
                // we'll need to structure the response to allow frontend to display them
                
                // For now, return structure that frontend can populate from localStorage
                res.json({
                    student: studentInfo,
                    courses: courses,
                    total_courses: courses.length,
                    // Activity data will be fetched from localStorage on frontend
                    activity_structure: {
                        assignments: {
                            keys: ['mathematicsAssignments', 'physicsAssignments', 'englishAssignments',
                                   'mathematicsTeacherAssignments', 'physicsTeacherAssignments', 'englishTeacherAssignments'],
                            description: 'Student assignments with completion status and grades'
                        },
                        quizzes: {
                            keys: ['mathematicsQuizzes', 'physicsQuizzes', 'englishQuizzes',
                                   'mathematicsTeacherQuizzes', 'physicsTeacherQuizzes', 'englishTeacherQuizzes'],
                            description: 'Student quizzes with scores and completion status'
                        },
                        exams: {
                            keys: ['mathematicsExams', 'physicsExams', 'englishExams',
                                   'mathematicsTeacherExams', 'physicsTeacherExams', 'englishTeacherExams'],
                            description: 'Student exams with results and grades'
                        }
                    }
                });
            });
        });
    });
});

// Link student to parent
app.post('/api/parent/link-student', authenticateJWT, (req, res) => {
    const parentId = req.user.id;
    const { studentEmail } = req.body;
    
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Access denied. Parent role required.' });
    }
    
    if (!studentEmail) {
        return res.status(400).json({ error: 'Student email is required' });
    }
    
    // Find student by email
    db.get(`
        SELECT id, first_name, last_name, parent_id 
        FROM users 
        WHERE email = ? AND role = 'student'
    `, [studentEmail.toLowerCase()], (err, student) => {
        if (err) {
            console.error('Error finding student:', err);
            return res.status(500).json({ error: 'Failed to find student' });
        }
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found with this email' });
        }
        
        if (student.parent_id && student.parent_id !== parentId) {
            return res.status(400).json({ error: 'Student is already linked to another parent' });
        }
        
        if (student.parent_id === parentId) {
            return res.status(400).json({ error: 'Student is already linked to you' });
        }
        
        // Link student to parent
        db.run(`
            UPDATE users 
            SET parent_id = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [parentId, student.id], function(err) {
            if (err) {
                console.error('Error linking student:', err);
                return res.status(500).json({ error: 'Failed to link student' });
            }
            
            res.json({ 
                message: 'Student linked successfully',
                student: {
                    id: student.id,
                    name: `${student.first_name} ${student.last_name}`,
                    email: studentEmail
                }
            });
        });
    });
});

// Unlink student from parent
app.delete('/api/parent/unlink-student/:studentId', authenticateJWT, (req, res) => {
    const parentId = req.user.id;
    const studentId = parseInt(req.params.studentId);
    
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Access denied. Parent role required.' });
    }
    
    // Verify the student belongs to this parent
    db.get(`
        SELECT id FROM users 
        WHERE id = ? AND parent_id = ? AND role = 'student'
    `, [studentId, parentId], (err, student) => {
        if (err || !student) {
            return res.status(404).json({ error: 'Student not found or access denied' });
        }
        
        // Unlink student from parent
        db.run(`
            UPDATE users 
            SET parent_id = NULL, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [studentId], function(err) {
            if (err) {
                console.error('Error unlinking student:', err);
                return res.status(500).json({ error: 'Failed to unlink student' });
            }
            
            res.json({ message: 'Student unlinked successfully' });
        });
    });
});

// Get parent dashboard summary
app.get('/api/parent/dashboard', authenticateJWT, (req, res) => {
    const parentId = req.user.id;
    
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Access denied. Parent role required.' });
    }
    
    // Get summary statistics
    db.get(`
        SELECT 
            COUNT(DISTINCT u.id) as total_children,
            COUNT(DISTINCT e.course_id) as total_courses,
            COUNT(DISTINCT e.id) as total_enrollments,
            MIN(e.enrolled_at) as first_enrollment,
            MAX(e.enrolled_at) as latest_enrollment
        FROM users u
        LEFT JOIN enrollments e ON u.id = e.user_id
        WHERE u.parent_id = ? AND u.role = 'student'
    `, [parentId], (err, summary) => {
        if (err) {
            console.error('Error fetching parent dashboard summary:', err);
            return res.status(500).json({ error: 'Failed to fetch dashboard summary' });
        }
        
        res.json({
            summary: summary || {
                total_children: 0,
                total_courses: 0,
                total_enrollments: 0,
                first_enrollment: null,
                latest_enrollment: null
            }
        });
    });
});

// Default route is handled above

function startServer() {
    app.listen(PORT, () => {
        console.log(`🚀 IG Nation Backend Server running at http://localhost:${PORT}/`);
        console.log(`📁 Serving static files from: ${path.join(__dirname, '..')}`);
        console.log(`🗄️  Database: ${path.join(__dirname, 'database.sqlite')}`);
    });
}

// Ensure migrations finish before starting the server.
// We'll run the migrations inside db.serialize above; to detect completion,
// attach a final no-op run that invokes startServer in its callback.
db.serialize(() => {
    // final callback to start server after queued migration statements
    db.run(`SELECT 1`, (err) => {
        if (err) console.error('Error finalizing migrations:', err);
        startServer();
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

// Additional Admin API Endpoints

// GET /api/admin/student/:id/parent
app.get('/api/admin/student/:id/parent', authenticateJWT, requireAdmin, (req, res) => {
    const studentId = req.params.id;
    
    // For now, return empty parent info since we don't have a separate parents table
    // In a real implementation, you'd query a parents table
    res.json({
        success: true,
        parent: null,
        message: 'No parent information available'
    });
});

// POST /api/admin/delete-enrollment
app.post('/api/admin/delete-enrollment', authenticateJWT, requireAdmin, (req, res) => {
    const { enrollment_id } = req.body;
    
    if (!enrollment_id) {
        return res.status(400).json({ success: false, error: 'enrollment_id is required' });
    }
    
    db.run('DELETE FROM enrollments WHERE id = ?', [enrollment_id], function(err) {
        if (err) {
            console.error('Error deleting enrollment:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Enrollment not found' });
        }
        
        res.json({ success: true, message: 'Enrollment deleted successfully' });
    });
});

// POST /api/admin/delete-order
app.post('/api/admin/delete-order', authenticateJWT, requireAdmin, (req, res) => {
    const { order_id } = req.body;
    
    if (!order_id) {
        return res.status(400).json({ success: false, error: 'order_id is required' });
    }
    
    // First delete order items
    db.run('DELETE FROM order_items WHERE order_id = ?', [order_id], (err) => {
        if (err) {
            console.error('Error deleting order items:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        // Then delete the order
        db.run('DELETE FROM orders WHERE id = ?', [order_id], function(err) {
            if (err) {
                console.error('Error deleting order:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            
            res.json({ success: true, message: 'Order deleted successfully' });
        });
    });
});

// PUT /api/admin/update-student-points
app.put('/api/admin/update-student-points', authenticateJWT, requireAdmin, (req, res) => {
    const { student_id, points } = req.body;
    
    if (!student_id || points === undefined) {
        return res.status(400).json({ success: false, error: 'student_id and points are required' });
    }
    
    // Check if points column exists, if not add it
    db.all("PRAGMA table_info('users')", (err, cols) => {
        if (err) {
            console.error('Error checking users table schema:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        const hasPoints = cols && cols.some(c => c.name === 'points');
        
        if (!hasPoints) {
            // Add points column
            db.run('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0', (alterErr) => {
                if (alterErr) {
                    console.error('Error adding points column:', alterErr);
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                
                // Update points
                updateStudentPoints();
            });
        } else {
            updateStudentPoints();
        }
        
        function updateStudentPoints() {
            db.run('UPDATE users SET points = ? WHERE id = ?', [points, student_id], function(err) {
                if (err) {
                    console.error('Error updating student points:', err);
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ success: false, error: 'Student not found' });
                }
                
                res.json({ success: true, message: 'Student points updated successfully' });
            });
        }
    });
});

// POST /api/admin/teachers
app.post('/api/admin/teachers', authenticateJWT, requireAdmin, (req, res) => {
    const { username, email, password, full_name, subject, experience } = req.body;
    
    if (!username || !email || !password || !full_name) {
        return res.status(400).json({ success: false, error: 'username, email, password, and full_name are required' });
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ success: false, error: 'Password hashing error' });
        }
        
        db.run(
            'INSERT INTO teachers (username, email, password, full_name, subject, experience) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hash, full_name, subject || null, experience || null],
            function(err) {
                if (err) {
                    console.error('Error creating teacher:', err);
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                
                res.json({ success: true, message: 'Teacher created successfully', teacher_id: this.lastID });
            }
        );
    });
});

// POST /api/admin/teachers/:id/assistants
app.post('/api/admin/teachers/:id/assistants', authenticateJWT, requireAdmin, (req, res) => {
    const teacherId = req.params.id;
    const { assistant_name, assistant_email } = req.body;
    
    if (!assistant_name || !assistant_email) {
        return res.status(400).json({ success: false, error: 'assistant_name and assistant_email are required' });
    }
    
    // For now, just return success since we don't have an assistants table
    // In a real implementation, you'd create an assistants table
    res.json({ success: true, message: 'Assistant added successfully' });
});

// DELETE /api/admin/assistants/:id
app.delete('/api/admin/assistants/:id', authenticateJWT, requireAdmin, (req, res) => {
    const assistantId = req.params.id;
    
    // For now, just return success since we don't have an assistants table
    // In a real implementation, you'd delete from assistants table
    res.json({ success: true, message: 'Assistant deleted successfully' });
});

// DELETE /api/admin/teachers/:id
app.delete('/api/admin/teachers/:id', authenticateJWT, requireAdmin, (req, res) => {
    const teacherId = req.params.id;
    
    db.run('DELETE FROM teachers WHERE id = ?', [teacherId], function(err) {
        if (err) {
            console.error('Error deleting teacher:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }
        
        res.json({ success: true, message: 'Teacher deleted successfully' });
    });
});

// Dashboard Statistics API Endpoints
// GET /api/dashboard/stats - Get all dashboard statistics
app.get('/api/dashboard/stats', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    
    // Get counts for each category
    const queries = {
        exams: 'SELECT COUNT(*) as count FROM exams WHERE teacher_id = ? AND is_active = 1',
        assignments: 'SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ? AND is_active = 1',
        quizzes: 'SELECT COUNT(*) as count FROM quizzes WHERE teacher_id = ? AND is_active = 1',
        students: 'SELECT COUNT(*) as count FROM users WHERE role = "student"',
        pendingGrading: 'SELECT COUNT(*) as count FROM submissions WHERE status = "submitted" AND graded = 0',
        videoLectures: 'SELECT COUNT(*) as count FROM lectures WHERE teacher_id = ? AND type = "video" AND is_active = 1'
    };
    
    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;
    
    // Execute each query
    Object.keys(queries).forEach(key => {
        const query = queries[key];
        const params = (key === 'students' || key === 'pendingGrading') ? [] : [userId];
        
        db.get(query, params, (err, row) => {
            if (err) {
                console.error(`Error fetching ${key}:`, err);
                results[key] = 0;
            } else {
                results[key] = row ? row.count : 0;
            }
            
            completed++;
            if (completed === total) {
                res.json({
                    success: true,
                    data: {
                        exams: results.exams,
                        assignments: results.assignments,
                        quizzes: results.quizzes,
                        students: results.students,
                        pendingGrading: results.pendingGrading,
                        videoLectures: results.videoLectures
                    }
                });
            }
        });
    });
});

// Individual endpoint for each statistic (for flexibility)
app.get('/api/dashboard/exams/count', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    db.get('SELECT COUNT(*) as count FROM exams WHERE teacher_id = ? AND is_active = 1', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, count: row ? row.count : 0 });
    });
});

app.get('/api/dashboard/assignments/count', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    db.get('SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ? AND is_active = 1', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, count: row ? row.count : 0 });
    });
});

app.get('/api/dashboard/quizzes/count', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    db.get('SELECT COUNT(*) as count FROM quizzes WHERE teacher_id = ? AND is_active = 1', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, count: row ? row.count : 0 });
    });
});

app.get('/api/dashboard/students/count', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM users WHERE role = "student"', (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, count: row ? row.count : 0 });
    });
});

app.get('/api/dashboard/pending-grading/count', authenticateJWT, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM submissions WHERE status = "submitted" AND graded = 0', (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, count: row ? row.count : 0 });
    });
});

app.get('/api/dashboard/video-lectures/count', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    db.get('SELECT COUNT(*) as count FROM lectures WHERE teacher_id = ? AND type = "video" AND is_active = 1', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, count: row ? row.count : 0 });
    });
});

// Assignments API endpoints
app.get('/api/assignments', (req, res) => {
    const { teacher_id, subject } = req.query;
    
    let query = 'SELECT * FROM assignments WHERE is_active = 1';
    let params = [];
    
    if (teacher_id) {
        query += ' AND teacher_id = ?';
        params.push(teacher_id);
    }
    
    if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching assignments:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(rows || []);
    });
});

app.post('/api/assignments', (req, res) => {
    const { title, description, teacher_id, subject, points, difficulty, due_date } = req.body;
    
    if (!title || !teacher_id) {
        return res.status(400).json({
            success: false,
            error: 'Title and teacher_id are required'
        });
    }
    
    const sql = `INSERT INTO assignments (title, description, teacher_id, subject, points, difficulty, due_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [title, description, teacher_id, subject || 'mathematics', points || 10, difficulty || 'medium', due_date], function(err) {
        if (err) {
            console.error('Error creating assignment:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        res.json({
            success: true,
            id: this.lastID,
            message: 'Assignment created successfully'
        });
    });
});

app.delete('/api/assignments/:id', (req, res) => {
    const assignmentId = req.params.id;
    
    db.run('UPDATE assignments SET is_active = 0 WHERE id = ?', [assignmentId], function(err) {
        if (err) {
            console.error('Error deleting assignment:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        
        res.json({ success: true, message: 'Assignment deleted successfully' });
    });
});

// Exams API endpoints
app.get('/api/exams', (req, res) => {
    const { teacher_id, subject } = req.query;
    
    let query = 'SELECT * FROM exams WHERE is_active = 1';
    let params = [];
    
    if (teacher_id) {
        query += ' AND teacher_id = ?';
        params.push(teacher_id);
    }
    
    if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching exams:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(rows || []);
    });
});

// Quizzes API endpoints
app.get('/api/quizzes', (req, res) => {
    const { teacher_id, subject } = req.query;
    
    let query = 'SELECT * FROM quizzes WHERE is_active = 1';
    let params = [];
    
    if (teacher_id) {
        query += ' AND teacher_id = ?';
        params.push(teacher_id);
    }
    
    if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching quizzes:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(rows || []);
    });
});

// Assistant Management API Endpoints

// GET /api/admin/assistants - Get all assistants
app.get('/api/admin/assistants', authenticateJWT, requireAdmin, (req, res) => {
    // Check if assistants table exists, if not create it
    db.run(`CREATE TABLE IF NOT EXISTS assistants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        subject TEXT NOT NULL,
        availability TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        qualifications TEXT,
        specializations TEXT,
        roleDescription TEXT,
        createdBy TEXT DEFAULT 'admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating assistants table:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        // Fetch all assistants
        db.all('SELECT * FROM assistants ORDER BY createdAt DESC', (err, rows) => {
            if (err) {
                console.error('Error fetching assistants:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            res.json(rows || []);
        });
    });
});

// POST /api/admin/add-assistant - Add new assistant
app.post('/api/admin/add-assistant', authenticateJWT, requireAdmin, (req, res) => {
    const { name, email, phone, subject, availability, status, qualifications, specializations, roleDescription, createdBy } = req.body;

    if (!name || !email || !subject || !availability) {
        return res.status(400).json({ success: false, error: 'Name, email, subject, and availability are required' });
    }

    // Check if assistants table exists, if not create it
    db.run(`CREATE TABLE IF NOT EXISTS assistants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        subject TEXT NOT NULL,
        availability TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        qualifications TEXT,
        specializations TEXT,
        roleDescription TEXT,
        createdBy TEXT DEFAULT 'admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating assistants table:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        // Insert new assistant
        const insertSql = `INSERT INTO assistants (name, email, phone, subject, availability, status, qualifications, specializations, roleDescription, createdBy) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(insertSql, [name, email, phone, subject, availability, status || 'pending', qualifications, specializations, roleDescription, createdBy || 'admin'], function(err) {
            if (err) {
                console.error('Error inserting assistant:', err);
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(400).json({ success: false, error: 'Assistant with this email already exists' });
                }
                return res.status(500).json({ success: false, error: 'Database error' });
            }

            res.json({ 
                success: true, 
                message: 'Assistant added successfully',
                id: this.lastID 
            });
        });
    });
});

// PUT /api/admin/assistants/:id/approve - Approve assistant
app.put('/api/admin/assistants/:id/approve', authenticateJWT, requireAdmin, (req, res) => {
    const assistantId = req.params.id;
    
    if (!assistantId) {
        return res.status(400).json({ success: false, error: 'Assistant ID is required' });
    }

    const updateSql = `UPDATE assistants SET status = 'active', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(updateSql, [assistantId], function(err) {
        if (err) {
            console.error('Error updating assistant status:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Assistant not found' });
        }

        res.json({ success: true, message: 'Assistant approved successfully' });
    });
});

// DELETE /api/admin/assistants/:id - Delete assistant
app.delete('/api/admin/assistants/:id', authenticateJWT, requireAdmin, (req, res) => {
    const assistantId = req.params.id;
    
    if (!assistantId) {
        return res.status(400).json({ success: false, error: 'Assistant ID is required' });
    }

    const deleteSql = `DELETE FROM assistants WHERE id = ?`;
    
    db.run(deleteSql, [assistantId], function(err) {
        if (err) {
            console.error('Error deleting assistant:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Assistant not found' });
        }

        res.json({ success: true, message: 'Assistant deleted successfully' });
    });
});

// PUT /api/admin/assistants/:id - Update assistant
app.put('/api/admin/assistants/:id', authenticateJWT, requireAdmin, (req, res) => {
    const assistantId = req.params.id;
    const { name, email, phone, subject, availability, status, qualifications, specializations, roleDescription } = req.body;
    
    if (!assistantId) {
        return res.status(400).json({ success: false, error: 'Assistant ID is required' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (subject !== undefined) { updates.push('subject = ?'); values.push(subject); }
    if (availability !== undefined) { updates.push('availability = ?'); values.push(availability); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (qualifications !== undefined) { updates.push('qualifications = ?'); values.push(qualifications); }
    if (specializations !== undefined) { updates.push('specializations = ?'); values.push(specializations); }
    if (roleDescription !== undefined) { updates.push('roleDescription = ?'); values.push(roleDescription); }
    
    if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    
    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(assistantId);
    
    const updateSql = `UPDATE assistants SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(updateSql, values, function(err) {
        if (err) {
            console.error('Error updating assistant:', err);
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(400).json({ success: false, error: 'Assistant with this email already exists' });
            }
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Assistant not found' });
        }

        res.json({ success: true, message: 'Assistant updated successfully' });
    });
});

// Zoom API Integration
// Note: These are demo credentials. In production, use proper Zoom API credentials
const ZOOM_API_KEY = process.env.ZOOM_API_KEY || 'demo-zoom-api-key';
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET || 'demo-zoom-api-secret';
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID || 'demo-zoom-account-id';

// Function to generate Zoom JWT token
function generateZoomJWT() {
    const payload = {
        iss: ZOOM_API_KEY,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
    };
    
    return jwt.sign(payload, ZOOM_API_SECRET);
}

// Function to create a real Zoom meeting
async function createZoomMeeting(meetingData) {
    try {
        const token = generateZoomJWT();
        
        // If using demo credentials, return a simulated response
        if (ZOOM_API_KEY === 'demo-zoom-api-key') {
            console.log('Using demo Zoom API - returning simulated meeting');
            return {
                success: true,
                meeting: {
                    id: Math.floor(Math.random() * 9000000000) + 1000000000,
                    topic: meetingData.topic,
                    join_url: `https://zoom.us/j/${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                    start_url: `https://zoom.us/s/${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                    password: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    settings: {
                        host_video: true,
                        participant_video: true,
                        join_before_host: false,
                        mute_upon_entry: false,
                        waiting_room: false
                    }
                }
            };
        }

        // Real Zoom API call (uncomment when you have real credentials)
        /*
        const response = await axios.post('https://api.zoom.us/v2/users/me/meetings', {
            topic: meetingData.topic,
            type: 2, // Scheduled meeting
            start_time: meetingData.startTime || new Date().toISOString(),
            duration: parseInt(meetingData.duration) || 60,
            timezone: 'UTC',
            agenda: meetingData.description || '',
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: false,
                mute_upon_entry: false,
                waiting_room: false,
                auto_recording: meetingData.recordSession ? 'cloud' : 'none',
                enforce_login: false,
                enforce_login_domains: '',
                alternative_hosts: '',
                global_dial_in_countries: ['US'],
                registrants_confirmation_email: false,
                registrants_email_notification: false
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            success: true,
            meeting: response.data
        };
        */

        // For now, return simulated response
        return {
            success: true,
            meeting: {
                id: Math.floor(Math.random() * 9000000000) + 1000000000,
                topic: meetingData.topic,
                join_url: `https://zoom.us/j/${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                start_url: `https://zoom.us/s/${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                password: Math.random().toString(36).substring(2, 8).toUpperCase(),
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: false,
                    waiting_room: false
                }
            }
        };

    } catch (error) {
        console.error('Error creating Zoom meeting:', error);
        return {
            success: false,
            error: error.message || 'Failed to create Zoom meeting'
        };
    }
}

// Test endpoint to verify API connectivity
app.get('/api/zoom/test', (req, res) => {
    res.json({
        success: true,
        message: 'Zoom API endpoint is working',
        timestamp: new Date().toISOString()
    });
});

// API endpoint to create a Zoom meeting
app.post('/api/zoom/create-meeting', authenticateJWT, (req, res) => {
    console.log('Received request to create Zoom meeting:', req.body);
    const { title, topic, description, duration, maxParticipants, recordSession, subject } = req.body;

    if (!title || !topic) {
        return res.status(400).json({ 
            success: false, 
            error: 'Title and topic are required' 
        });
    }

    const meetingData = {
        topic: title,
        description: description || '',
        duration: duration || 60,
        maxParticipants: maxParticipants || 100,
        recordSession: recordSession || false,
        startTime: new Date().toISOString()
    };

    createZoomMeeting(meetingData)
        .then(result => {
            console.log('Zoom meeting creation result:', result);
            if (result.success) {
                // Store the meeting in database or localStorage equivalent
                const meetingRecord = {
                    id: Date.now(),
                    title: title,
                    topic: topic,
                    description: description,
                    duration: parseInt(duration),
                    maxParticipants: parseInt(maxParticipants),
                    recordSession: recordSession,
                    meetingId: result.meeting.id,
                    meetingPassword: result.meeting.password,
                    meetingUrl: result.meeting.join_url,
                    startUrl: result.meeting.start_url,
                    subject: subject,
                    status: 'live',
                    startTime: new Date().toISOString(),
                    participants: 0,
                    messages: 0,
                    instructor: 'Current Teacher',
                    createdBy: req.user.id
                };

                res.json({
                    success: true,
                    message: 'Zoom meeting created successfully',
                    meeting: meetingRecord,
                    zoomMeeting: result.meeting
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }
        })
        .catch(error => {
            console.error('Error in create-meeting endpoint:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });
});

// API endpoint to get meeting details
app.get('/api/zoom/meeting/:meetingId', authenticateJWT, (req, res) => {
    const { meetingId } = req.params;
    
    // In a real implementation, you would fetch from database
    // For now, return a placeholder response
    res.json({
        success: true,
        meeting: {
            id: meetingId,
            status: 'live',
            join_url: `https://zoom.us/j/${meetingId}`,
            start_url: `https://zoom.us/s/${meetingId}`
        }
    });
});

// API endpoint to end a meeting
app.post('/api/zoom/end-meeting/:meetingId', authenticateJWT, (req, res) => {
    const { meetingId } = req.params;
    
    // In a real implementation, you would update the meeting status in database
    // and potentially call Zoom API to end the meeting
    
    res.json({
        success: true,
        message: 'Meeting ended successfully'
    });
});

// Serve files from the repository root as a fallback for legacy pages
// (this lets requests such as /admin-panel.html work when the file lives at repo root)
// IMPORTANT: This must be after API routes to prevent interference
app.use(express.static(path.join(__dirname, '..')));
