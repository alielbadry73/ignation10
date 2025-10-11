const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-for-prod';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from backend/public (we'll populate it with frontend assets)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Also serve files from the repository root as a fallback for legacy pages
// (this lets requests such as /admin-panel.html work when the file lives at repo root)
app.use(express.static(path.join(__dirname, '..')));

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
const db = new sqlite3.Database('../igway.db');

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Register endpoint
app.post('/api/register', (req, res) => {
    // Accept either legacy fields (username, fullName, userType) or frontend fields (first_name, last_name, phone, parent_phone)
    const { username, email, password, fullName, userType, first_name, last_name, phone, phone_country, parent_phone, parent_phone_country } = req.body;

    const derivedEmail = (email || '').toString().trim().toLowerCase();
    const derivedPassword = (password || '').toString();
    const derivedUserType = (userType || 'student').toString();
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

        const sql = `INSERT INTO ${table} (email, password, first_name, last_name, phone, phone_country, parent_phone, parent_phone_country, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [derivedEmail, hash, first_name || 'Unknown', last_name || 'User', phone || null, phone_country || null, parent_phone || null, parent_phone_country || null, derivedUserType];
        
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
            }
        );
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
                        return res.json({ success: true, message: 'Verification code sent' });
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

        // Mark order approved if status column exists, otherwise set a generic approved flag if present
        const now = new Date().toISOString();
        const updateSql = `UPDATE orders SET status = 'approved', approved_at = ? WHERE id = ?`;
        db.run(updateSql, [now, order_id], function(uErr) {
            if (uErr) {
                console.error('DB error updating order status:', uErr);
                // Don't fail the whole flow; attempt to grant access if possible
            }

            // Try to grant enrollment if order contains student_id and course_id columns
            const studentId = order.student_id || order.user_id || order.buyer_id || null;
            const courseId = order.course_id || order.product_id || null;

            if (studentId && courseId) {
                db.all(`PRAGMA table_info('enrollments')`, (eErr2, cols2) => {
                    const names2 = (cols2 || []).map(c => c.name.toLowerCase());
                    if (names2.includes('user_id') && names2.includes('course_id')) {
                        db.run(`INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`, [studentId, courseId], function(eErr3) {
                            if (!eErr3) return res.json({ success: true, message: 'Order approved', enrollmentId: this.lastID });
                            console.error('Simple enrollments insert failed during approve-order, falling back to flexible:', eErr3);
                            insertIntoEnrollmentsFlexible({ student_id: studentId, course_id: courseId, granted_by_admin: req.user.id || null, created_at: new Date().toISOString() }, (iErr, lastId) => {
                                if (iErr) { console.error('Error creating enrollment while approving order (flexible):', iErr); return res.json({ success: true, message: 'Order approved (enrollment not created due to schema mismatch)' }); }
                                return res.json({ success: true, message: 'Order approved', enrollmentId: lastId });
                            });
                        });
                        return;
                    }
                    if (names2.includes('student_id') && names2.includes('course_id')) {
                        db.run(`INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)`, [studentId, courseId], function(eErr3) {
                            if (!eErr3) return res.json({ success: true, message: 'Order approved', enrollmentId: this.lastID });
                            console.error('Simple enrollments insert failed during approve-order (student path), falling back to flexible:', eErr3);
                            insertIntoEnrollmentsFlexible({ student_id: studentId, course_id: courseId, granted_by_admin: req.user.id || null, created_at: new Date().toISOString() }, (iErr, lastId) => {
                                if (iErr) { console.error('Error creating enrollment while approving order (flexible):', iErr); return res.json({ success: true, message: 'Order approved (enrollment not created due to schema mismatch)' }); }
                                return res.json({ success: true, message: 'Order approved', enrollmentId: lastId });
                            });
                        });
                        return;
                    }
                    // fallback
                    insertIntoEnrollmentsFlexible({ student_id: studentId, course_id: courseId, granted_by_admin: req.user.id || null, created_at: new Date().toISOString() }, (iErr, lastId) => {
                        if (iErr) { console.error('Error creating enrollment while approving order (flexible fallback):', iErr); return res.json({ success: true, message: 'Order approved (enrollment not created due to schema mismatch)' }); }
                        return res.json({ success: true, message: 'Order approved', enrollmentId: lastId });
                    });
                });
            } else {
                return res.json({ success: true, message: 'Order approved (no enrollment created - missing student/course fields)' });
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
