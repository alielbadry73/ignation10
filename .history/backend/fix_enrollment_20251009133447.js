const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking enrollment issue...\n');

// First, check courses
db.all('SELECT id, subject, title FROM courses', (err, courses) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    console.log('📚 Available Courses:');
    courses.forEach(c => {
        console.log(`  ID ${c.id}: ${c.subject || c.title}`);
    });
    
    // Check enrollments for alielbadry279@gmail.com
    db.all(`
        SELECT e.*, u.email 
        FROM enrollments e 
        JOIN users u ON (e.student_id = u.id OR e.user_id = u.id)
        WHERE u.email = 'alielbadry279@gmail.com'
    `, (err, enrollments) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }
        
        console.log('\n📋 Current Enrollments for alielbadry279@gmail.com:');
        enrollments.forEach(e => {
            console.log(`  Enrollment ID ${e.id}: Course ID ${e.course_id}`);
        });
        
        // Check the order
        db.get(`
            SELECT * FROM orders WHERE customer_email = 'alielbadry279@gmail.com'
        `, (err, order) => {
            if (err) {
                console.error('Error:', err);
                db.close();
                return;
            }
            
            console.log('\n📦 Order Details:');
            console.log('  Courses JSON:', order.courses);
            
            const orderCourses = JSON.parse(order.courses);
            console.log('\n  Parsed courses:', orderCourses);
            
            // Fix: Delete wrong enrollment and create correct one
            console.log('\n🔧 Fixing enrollment...');
            
            // Delete the wrong enrollment (Biology - course_id 4)
            db.run('DELETE FROM enrollments WHERE course_id = 4 AND user_id = 9', function(err) {
                if (err) {
                    console.error('Error deleting wrong enrollment:', err);
                } else {
                    console.log('✅ Deleted wrong enrollment (Biology)');
                }
                
                // Create correct enrollment (English - course_id 5)
                db.run(`
                    INSERT INTO enrollments (student_id, user_id, course_id, enrolled_at)
                    VALUES (9, 9, 5, datetime('now'))
                `, function(err) {
                    if (err) {
                        console.error('❌ Error creating enrollment:', err);
                    } else {
                        console.log('✅ Created correct enrollment (English - course_id 5)');
                    }
                    
                    db.close();
                    console.log('\n✅ Fix complete!');
                });
            });
        });
    });
});

