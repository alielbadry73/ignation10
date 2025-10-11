const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Database connected successfully');
});

// Check if courses table exists and its structure
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='courses'", (err, tables) => {
    if (err) {
        console.error('Error checking courses table:', err);
    } else if (tables.length === 0) {
        console.log('Courses table does not exist. Creating it...');
        
        // Create courses table
        db.run(`CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            level TEXT,
            instructor TEXT,
            price DECIMAL(10,2),
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (createErr) => {
            if (createErr) {
                console.error('Error creating courses table:', createErr);
            } else {
                console.log('✅ Courses table created successfully');
                
                // Insert some sample courses
                const sampleCourses = [
                    ['IGCSE Mathematics (Extended)', 'Master advanced mathematical concepts with comprehensive coverage of IGCSE Extended Mathematics curriculum.', 'Extended', 'Dr. Sarah Mitchell', 299.00],
                    ['IGCSE Physics (Extended)', 'Master fundamental physics concepts with comprehensive coverage of IGCSE Extended Physics curriculum.', 'Extended', 'Prof. Michael Chen', 279.00],
                    ['IGCSE English Language', 'Master English language skills with comprehensive coverage of reading, writing, speaking, and listening.', 'Extended', 'Dr. Emily Rodriguez', 249.00]
                ];
                
                const stmt = db.prepare(`INSERT INTO courses (title, description, level, instructor, price) VALUES (?, ?, ?, ?, ?)`);
                sampleCourses.forEach(course => {
                    stmt.run(course, (insertErr) => {
                        if (insertErr) console.error('Error inserting course:', insertErr);
                    });
                });
                stmt.finalize();
                console.log('✅ Sample courses inserted');
            }
            db.close();
        });
    } else {
        console.log('✅ Courses table exists');
        
        // Check courses count
        db.get("SELECT COUNT(*) as count FROM courses", (err, row) => {
            if (err) {
                console.error('Error counting courses:', err);
            } else {
                console.log(`Courses count: ${row.count}`);
            }
            db.close();
        });
    }
});
