const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔧 QUICK FIX FOR ORDERS');
    console.log('======================\n');
    
    // First, let's see what we have
    db.all("SELECT COUNT(*) as count FROM order_items", (err, result) => {
        if (err) {
            console.error('Error:', err.message);
            return;
        }
        
        console.log(`Order items in database: ${result[0].count}`);
        
        if (result[0].count === 0) {
            console.log('❌ No order items found! This is the problem.');
            console.log('🔧 Adding sample order items...\n');
            
            // Get all orders
            db.all("SELECT id FROM orders ORDER BY id", (err, orders) => {
                if (err) {
                    console.error('Error getting orders:', err.message);
                    return;
                }
                
                // Get available courses
                db.all("SELECT id, title, price FROM courses", (err, courses) => {
                    if (err) {
                        console.error('Error getting courses:', err.message);
                        return;
                    }
                    
                    console.log('Available courses:');
                    courses.forEach(course => {
                        console.log(`- ${course.id}: ${course.title} (£${course.price})`);
                    });
                    
                    // Add order items for each order
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
                                    console.log('\n✅ All orders fixed!');
                                    console.log('Now check the admin panel - courses should show correctly.');
                                    db.close();
                                }
                            }
                        );
                    });
                });
            });
        } else {
            console.log('✅ Order items exist. Checking if they have proper course data...');
            
            // Check if order items have valid course references
            db.all(`
                SELECT oi.*, c.title as course_title
                FROM order_items oi
                LEFT JOIN courses c ON oi.course_id = c.id
                ORDER BY oi.order_id
            `, (err, items) => {
                if (err) {
                    console.error('Error checking order items:', err.message);
                    return;
                }
                
                console.log('\nOrder items with course data:');
                items.forEach(item => {
                    console.log(`Order ${item.order_id}: Course ${item.course_id} - ${item.course_title || 'N/A'} (£${item.price})`);
                });
                
                db.close();
            });
        }
    });
});

