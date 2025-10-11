const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-for-prod';

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Serve static files from parent directory
// Serve only the public folder to avoid exposing backend files (database, code, etc.)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

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
    // Ensure students table has a username column. Use PRAGMA to check first.
    db.all(`PRAGMA table_info('students')`, (err, cols) => {
        if (err) {
            console.error('Error checking students table schema:', err);
        } else {
            const hasUsername = cols && cols.some(c => c.name === 'username');
            if (!hasUsername) {
                db.run(`ALTER TABLE students ADD COLUMN username TEXT`, (aErr) => {
                    if (aErr && !aErr.message.includes('duplicate column name')) {
                        console.error('Error adding username column:', aErr);
                    }
                    // After ALTER completes (or fails with duplicate), try to populate username
                    db.run(`UPDATE students SET username = email WHERE username IS NULL`, (uErr) => {
                        if (uErr) console.error('Error updating students usernames after ALTER:', uErr);
                    });
                });
            } else {
                // still ensure null usernames get filled
                db.run(`UPDATE students SET username = email WHERE username IS NULL`, (uErr) => {
                    if (uErr) console.error('Error updating students usernames:', uErr);
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
});

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'IG Nation Backend Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

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

    // If userType is given, prefer that table
    if (userType) {
        const table = userType === 'teacher' ? 'teachers' : 'students';
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
            if (stored === password) return sendSuccess(row, userType);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        });
    }

    // No userType: try unified users table first (if present), then fallback to students/teachers
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`, (tableErr, tableRow) => {
        if (tableErr) {
            console.error('Database error:', tableErr);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        const tryStudentsTeachers = () => {
            getRowByIdentifier('students', identifier, (sErr, sRow) => {
                if (sErr) { console.error('Database error:', sErr); return res.status(500).json({ success: false, message: 'Database error', error: 'Database error' }); }
                if (sRow) {
                    const stored = sRow.password || sRow.pass || sRow.passsword;
                    if (stored && (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$'))) {
                        return bcrypt.compare(password, stored, (bErr, same) => {
                            if (bErr) { console.error('bcrypt error:', bErr); return res.status(500).json({ success: false, message: 'Authentication error', error: 'Authentication error' }); }
                            if (same) return sendSuccess(sRow, 'student');
                            return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
                        });
                    }
                    if (stored === password) return sendSuccess(sRow, 'student');
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                }

                getRowByIdentifier('teachers', identifier, (tErr, tRow) => {
                    if (tRow) {
                        const stored = tRow.password || tRow.pass || tRow.passsword;
                        if (stored && (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$'))) {
                            return bcrypt.compare(password, stored, (bErr, same) => {
                                if (bErr) { console.error('bcrypt error:', bErr); return res.status(500).json({ success: false, message: 'Authentication error', error: 'Authentication error' }); }
                                if (same) return sendSuccess(tRow, 'teacher');
                                return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
                            });
                        }
                        if (stored === password) return sendSuccess(tRow, 'teacher');
                        return res.status(401).json({ success: false, message: 'Invalid credentials' });
                    }
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                });
            });
        };

        if (tableRow && tableRow.name === 'users') {
            // Use the safe helper so we don't query non-existent columns like username
            getRowByIdentifier('users', identifier, (uErr, uRow) => {
                    if (uErr) { console.error('Database error:', uErr); return res.status(500).json({ success: false, message: 'Database error', error: 'Database error' }); }
                if (uRow && uRow.password) {
                    return bcrypt.compare(password, uRow.password, (bErr, same) => {
                        if (bErr) { console.error('bcrypt error:', bErr); return res.status(500).json({ success: false, message: 'Authentication error', error: 'Authentication error' }); }
                        if (same) return sendSuccess(uRow, uRow.role || 'user');
                        // fallthrough to students/teachers on mismatch
                        tryStudentsTeachers();
                    });
                }
                // No matching users row or no password -> fallback
                tryStudentsTeachers();
            });
        } else {
            // users table not present - fallback immediately
            tryStudentsTeachers();
        }
    });
});

// Register endpoint
app.post('/api/register', (req, res) => {
    const { username, email, password, fullName, userType } = req.body;
    
    if (!username || !email || !password || !userType) {
        return res.status(400).json({ 
            success: false, 
            message: 'All fields are required' 
        });
    }

    const table = userType === 'teacher' ? 'teachers' : 'students';
    
    db.run(
        `INSERT INTO ${table} (username, email, password, full_name) VALUES (?, ?, ?, ?)`,
        [username, email, password, fullName],
        function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(400).json({
                        success: false,
                        message: 'Username or email already exists'
                    });
                }
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            res.json({
                success: true,
                message: 'Registration successful',
                userId: this.lastID
            });
        }
    );
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

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

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