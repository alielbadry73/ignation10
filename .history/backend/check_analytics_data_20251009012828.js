const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking Course Analytics data...');

// Check courses
db.all('SELECT COUNT(*) as count FROM courses', (err, courses) => {
    if (err) {
        console.error('Error checking courses:', err);
    } else {
        console.log(`📚 Total Courses: ${courses[0].count}`);
    }
    
    // Check enrollments
    db.all('SELECT COUNT(*) as count FROM enrollments', (err, enrollments) => {
        if (err) {
            console.error('Error checking enrollments:', err);
        } else {
            console.log(`🎓 Total Enrollments: ${enrollments[0].count}`);
        }
        
        // Check students
        db.all('SELECT COUNT(*) as count FROM users WHERE role = "student"', (err, students) => {
            if (err) {
                console.error('Error checking students:', err);
            } else {
                console.log(`👥 Total Students: ${students[0].count}`);
            }
            
            // Check orders
            db.all('SELECT COUNT(*) as count FROM orders', (err, orders) => {
                if (err) {
                    console.error('Error checking orders:', err);
                } else {
                    console.log(`📋 Total Orders: ${orders[0].count}`);
                }
                
                // Check orders revenue
                db.all('SELECT SUM(total_amount) as revenue FROM orders', (err, revenue) => {
                    if (err) {
                        console.error('Error checking revenue:', err);
                    } else {
                        console.log(`💰 Total Revenue: £${(revenue[0].revenue || 0).toFixed(2)}`);
                    }
                    
                    db.close();
                    console.log('\n✅ Analytics data check complete!');
                });
            });
        });
    });
});
