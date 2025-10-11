const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Database connected successfully');
});

// Insert sample courses
const sampleCourses = [
    ['IGCSE Mathematics (Extended)', 'Master advanced mathematical concepts with comprehensive coverage of IGCSE Extended Mathematics curriculum.', 'Extended', 'Dr. Sarah Mitchell', 299.00],
    ['IGCSE Physics (Extended)', 'Master fundamental physics concepts with comprehensive coverage of IGCSE Extended Physics curriculum.', 'Extended', 'Prof. Michael Chen', 279.00],
    ['IGCSE English Language', 'Master English language skills with comprehensive coverage of reading, writing, speaking, and listening.', 'Extended', 'Dr. Emily Rodriguez', 249.00]
];

const stmt = db.prepare(`INSERT INTO courses (title, description, level, instructor, price) VALUES (?, ?, ?, ?, ?)`);

sampleCourses.forEach((course, index) => {
    stmt.run(course, (insertErr) => {
        if (insertErr) {
            console.error('Error inserting course:', insertErr);
        } else {
            console.log(`✅ Course ${index + 1} inserted: ${course[0]}`);
        }
    });
});

stmt.finalize((finalizeErr) => {
    if (finalizeErr) {
        console.error('Error finalizing statement:', finalizeErr);
    } else {
        console.log('✅ All sample courses inserted successfully');
    }
    
    // Check final count
    db.get("SELECT COUNT(*) as count FROM courses", (err, row) => {
        if (err) {
            console.error('Error counting courses:', err);
        } else {
            console.log(`Total courses in database: ${row.count}`);
        }
        db.close();
    });
});
