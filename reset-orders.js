const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔄 RESETTING ORDERS');
    console.log('===================\n');
    
    // Clear existing order_items
    db.run('DELETE FROM order_items', (err) => {
        if (err) {
            console.error('Error clearing order_items:', err.message);
            return;
        }
        
        console.log('✅ Cleared existing order_items');
        
        // Get all orders
        db.all('SELECT id FROM orders ORDER BY id', (err, orders) => {
            if (err) {
                console.error('Error getting orders:', err.message);
                return;
            }
            
            console.log(`Found ${orders.length} orders to process`);
            
            // Get available courses
            db.all('SELECT id, title, price FROM courses ORDER BY id', (err, courses) => {
                if (err) {
                    console.error('Error getting courses:', err.message);
                    return;
                }
                
                console.log('Available courses:');
                courses.forEach(course => {
                    console.log(`- ${course.id}: ${course.title} (£${course.price})`);
                });
                
                // Add order items for each order with different courses
                let completed = 0;
                orders.forEach((order, orderIndex) => {
                    // Assign different courses to different orders
                    const courseIndex = orderIndex % courses.length;
                    const course = courses[courseIndex];
                    
                    db.run(
                        'INSERT INTO order_items (order_id, course_id, quantity, price) VALUES (?, ?, ?, ?)',
                        [order.id, course.id, 1, course.price],
                        function(err) {
                            if (err) {
                                console.error(`Error adding item to order ${order.id}:`, err.message);
                            } else {
                                console.log(`✅ Added ${course.title} to order ${order.id}`);
                            }
                            
                            completed++;
                            if (completed === orders.length) {
                                console.log('\n✅ All orders reset successfully!');
                                console.log('Now check the admin panel - courses should show correctly.');
                                db.close();
                            }
                        }
                    );
                });
            });
        });
    });
});

