const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to database');
    
    // Check orders table
    db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5", (err, orders) => {
        if (err) {
            console.error('Error querying orders:', err.message);
            return;
        }
        
        console.log('\n📋 ORDERS TABLE:');
        console.log('================');
        orders.forEach(order => {
            console.log(`Order ID: ${order.id}, User: ${order.user_id}, Amount: £${order.total_amount}, Status: ${order.status}`);
        });
        
        // Check order_items table
        db.all("SELECT * FROM order_items ORDER BY order_id DESC LIMIT 10", (err, items) => {
            if (err) {
                console.error('Error querying order_items:', err.message);
                return;
            }
            
            console.log('\n📦 ORDER_ITEMS TABLE:');
            console.log('====================');
            if (items.length === 0) {
                console.log('❌ No items found in order_items table!');
            } else {
                items.forEach(item => {
                    console.log(`Order ID: ${item.order_id}, Course ID: ${item.course_id}, Quantity: ${item.quantity}, Price: £${item.price}`);
                });
            }
            
            // Check courses table
            db.all("SELECT id, title FROM courses LIMIT 5", (err, courses) => {
                if (err) {
                    console.error('Error querying courses:', err.message);
                    return;
                }
                
                console.log('\n📚 COURSES TABLE:');
                console.log('=================');
                courses.forEach(course => {
                    console.log(`Course ID: ${course.id}, Title: ${course.title}`);
                });
                
                db.close();
            });
        });
    });
});

