const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔧 FIXING EXISTING ORDERS');
    console.log('=========================\n');
    
    // Get all orders that don't have order_items
    db.all(`
        SELECT o.id, o.user_id, o.total_amount, o.payment_method
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.order_id IS NULL
        ORDER BY o.created_at DESC
    `, (err, orders) => {
        if (err) {
            console.error('Error querying orders:', err.message);
            return;
        }
        
        console.log(`Found ${orders.length} orders without items`);
        
        if (orders.length === 0) {
            console.log('✅ All orders already have items');
            db.close();
            return;
        }
        
        // Get available courses
        db.all("SELECT id, title, price FROM courses", (err, courses) => {
            if (err) {
                console.error('Error querying courses:', err.message);
                return;
            }
            
            console.log(`Available courses: ${courses.length}`);
            courses.forEach(course => {
                console.log(`- Course ${course.id}: ${course.title} (£${course.price})`);
            });
            
            // Add default course to orders without items
            let completed = 0;
            orders.forEach(order => {
                // Add a default course (Mathematics) to each order
                const defaultCourse = courses.find(c => c.id === 1) || courses[0];
                
                if (defaultCourse) {
                    db.run(
                        'INSERT INTO order_items (order_id, course_id, quantity, price) VALUES (?, ?, ?, ?)',
                        [order.id, defaultCourse.id, 1, defaultCourse.price],
                        function(err) {
                            if (err) {
                                console.error(`Error adding item to order ${order.id}:`, err.message);
                            } else {
                                console.log(`✅ Added ${defaultCourse.title} to order ${order.id}`);
                            }
                            
                            completed++;
                            if (completed === orders.length) {
                                console.log('\n✅ All orders fixed!');
                                db.close();
                            }
                        }
                    );
                } else {
                    console.log(`❌ No courses available for order ${order.id}`);
                    completed++;
                    if (completed === orders.length) {
                        db.close();
                    }
                }
            });
        });
    });
});

