const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Verifying order and enrollment data...');

// Check orders
db.all('SELECT * FROM orders', (err, orders) => {
    if (err) {
        console.error('Error checking orders:', err);
    } else {
        console.log(`\n📋 Orders found: ${orders.length}`);
        orders.forEach(order => {
            console.log(`  Order ${order.id}: ${order.customer_email} - ${order.status} - £${order.total_amount}`);
        });
    }
    
    // Check enrollments
    db.all('SELECT * FROM enrollments', (err, enrollments) => {
        if (err) {
            console.error('Error checking enrollments:', err);
        } else {
            console.log(`\n🎓 Enrollments found: ${enrollments.length}`);
            enrollments.forEach(enrollment => {
                console.log(`  Enrollment ${enrollment.id}: User ${enrollment.user_id} -> Course ${enrollment.course_id} (Active: ${enrollment.is_active})`);
            });
        }
        
        db.close();
        console.log('\n✅ Verification complete!');
    });
});
