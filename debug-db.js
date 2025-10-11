const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔍 DEBUGGING DATABASE ISSUES');
    console.log('============================\n');
    
    // Check if order_items table exists and has data
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='order_items'", (err, tables) => {
        if (err) {
            console.error('Error checking tables:', err.message);
            return;
        }
        
        if (tables.length === 0) {
            console.log('❌ order_items table does not exist!');
            return;
        }
        
        console.log('✅ order_items table exists');
        
        // Check order_items data
        db.all("SELECT * FROM order_items", (err, items) => {
            if (err) {
                console.error('Error querying order_items:', err.message);
                return;
            }
            
            console.log(`\n📦 ORDER_ITEMS TABLE (${items.length} records):`);
            console.log('=====================================');
            if (items.length === 0) {
                console.log('❌ No data in order_items table!');
            } else {
                items.forEach(item => {
                    console.log(`Order ID: ${item.order_id}, Course ID: ${item.course_id}, Quantity: ${item.quantity}, Price: £${item.price}`);
                });
            }
            
            // Check orders table
            db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 3", (err, orders) => {
                if (err) {
                    console.error('Error querying orders:', err.message);
                    return;
                }
                
                console.log(`\n📋 ORDERS TABLE (${orders.length} records):`);
                console.log('==================================');
                orders.forEach(order => {
                    console.log(`Order ID: ${order.id}, User ID: ${order.user_id}, Amount: £${order.total_amount}, Status: ${order.status}`);
                });
                
                // Check courses table
                db.all("SELECT id, title FROM courses", (err, courses) => {
                    if (err) {
                        console.error('Error querying courses:', err.message);
                        return;
                    }
                    
                    console.log(`\n📚 COURSES TABLE (${courses.length} records):`);
                    console.log('==================================');
                    courses.forEach(course => {
                        console.log(`Course ID: ${course.id}, Title: ${course.title}`);
                    });
                    
                    // Test the JOIN query that's failing
                    console.log('\n🔗 TESTING JOIN QUERY:');
                    console.log('======================');
                    db.all(`
                        SELECT o.id, o.user_id, u.first_name, u.last_name,
                               GROUP_CONCAT(c.title) as course_titles,
                               GROUP_CONCAT(oi.course_id) as course_ids
                        FROM orders o
                        JOIN users u ON o.user_id = u.id
                        LEFT JOIN order_items oi ON o.id = oi.order_id
                        LEFT JOIN courses c ON oi.course_id = c.id
                        GROUP BY o.id
                        ORDER BY o.created_at DESC
                        LIMIT 3
                    `, (err, results) => {
                        if (err) {
                            console.error('Error in JOIN query:', err.message);
                        } else {
                            console.log('JOIN Query Results:');
                            results.forEach(result => {
                                console.log(`Order ${result.id}: ${result.first_name} ${result.last_name} - Courses: ${result.course_titles || 'NULL'} - Course IDs: ${result.course_ids || 'NULL'}`);
                            });
                        }
                        
                        db.close();
                    });
                });
            });
        });
    });
});

