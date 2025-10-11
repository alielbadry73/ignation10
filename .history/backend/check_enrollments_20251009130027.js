const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking enrollments data...\n');

// Get all enrollments with user details
db.all(`
    SELECT 
        e.*,
        u.first_name,
        u.last_name,
        u.email,
        u.points
    FROM enrollments e
    LEFT JOIN users u ON (e.student_id = u.id OR e.user_id = u.id)
`, (err, enrollments) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log(`📚 Total Enrollments: ${enrollments.length}\n`);
        enrollments.forEach(e => {
            console.log(`Enrollment #${e.id}:`);
            console.log(`  Student: ${e.first_name} ${e.last_name} (${e.email})`);
            console.log(`  Course ID: ${e.course_id}`);
            console.log(`  Points: ${e.points || 0}`);
            console.log(`  Enrolled: ${e.enrolled_at}`);
            console.log('');
        });
    }
    
    // Get course list
    db.all('SELECT * FROM courses', (err, courses) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log(`\n📖 Available Courses: ${courses.length}\n`);
            courses.forEach(c => {
                console.log(`Course #${c.id}: ${c.subject || c.title}`);
            });
        }
        
        // Count enrollments per course
        db.all(`
            SELECT 
                e.course_id,
                COUNT(*) as student_count
            FROM enrollments e
            GROUP BY e.course_id
        `, (err, counts) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('\n\n📊 Students per Course:\n');
                counts.forEach(c => {
                    console.log(`  Course ${c.course_id}: ${c.student_count} student(s)`);
                });
            }
            db.close();
        });
    });
});

