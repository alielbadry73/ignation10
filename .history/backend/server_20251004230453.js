const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Database connection
const db = new sqlite3.Database('./backend/database.sqlite');

// Initialize database tables if they don't exist
db.serialize(() => {
    // Teachers table
    db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Lectures table
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

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password, userType } = req.body;
    
    if (!username || !password || !userType) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username, password, and user type are required' 
        });
    }

    const table = userType === 'teacher' ? 'teachers' : 'students';
    
    db.get(
        `SELECT * FROM ${table} WHERE username = ? AND password = ?`,
        [username, password],
        (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            if (row) {
                res.json({
                    success: true,
                    message: 'Login successful',
                    user: {
                        id: row.id,
                        username: row.username,
                        email: row.email,
                        full_name: row.full_name,
                        userType: userType
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        }
    );
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 IG Nation Backend Server running at http://localhost:${PORT}/`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '..')}`);
    console.log(`🗄️  Database: ${path.join(__dirname, 'database.sqlite')}`);
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