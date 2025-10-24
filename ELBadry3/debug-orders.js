const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔍 DEBUGGING ORDERS ISSUE');
    console.log('=========================\n');
    
    // Check orders table
    db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5", (err, orders) => {
        if (err) {
            console.error('Error querying orders:', err.message);
            return;
        }
        
        console.log('📦 ORDERS:');
        orders.forEach(order => {
            console.log(`Order ${order.id}: User ${order.user_id}, Amount: £${order.total_amount}, Status: ${order.status}`);
        });
        
        // Check order_items table
        db.all("SELECT * FROM order_items ORDER BY order_id DESC LIMIT 10", (err, items) => {
            if (err) {
                console.error('Error querying order_items:', err.message);
                return;
            }
            
            console.log('\n📋 ORDER ITEMS:');
            items.forEach(item => {
                console.log(`Order ${item.order_id}: Course ${item.course_id}, Qty: ${item.quantity}, Price: £${item.price}`);
            });
            
            // Check courses table
            db.all("SELECT * FROM courses", (err, courses) => {
                if (err) {
                    console.error('Error querying courses:', err.message);
                    return;
                }
                
                console.log('\n📚 COURSES:');
                courses.forEach(course => {
                    console.log(`Course ${course.id}: ${course.title} - £${course.price}`);
                });
                
                // Check the admin orders query
                db.all(`
                    SELECT o.*, u.first_name, u.last_name, u.email,
                           GROUP_CONCAT(c.title) as course_titles,
                           GROUP_CONCAT(oi.course_id) as course_ids
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    LEFT JOIN order_items oi ON o.id = oi.order_id
                    LEFT JOIN courses c ON oi.course_id = c.id
                    GROUP BY o.id
                    ORDER BY o.created_at DESC
                `, (err, adminOrders) => {
                    if (err) {
                        console.error('Error querying admin orders:', err.message);
                        return;
                    }
                    
                    console.log('\n👨‍💼 ADMIN ORDERS VIEW:');
                    adminOrders.forEach(order => {
                        console.log(`Order ${order.id}: ${order.first_name} ${order.last_name}`);
                        console.log(`  Courses: ${order.course_titles || 'N/A'}`);
                        console.log(`  Course IDs: ${order.course_ids || 'N/A'}`);
                        console.log('---');
                    });
                    
                    db.close();
                });
            });
        });
    });
});

