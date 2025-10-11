const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the backend database
const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening backend database:', err.message);
        return;
    }
    console.log('Connected to the backend database.');
});

// Add Ahmed Zaher's enrollments and orders
console.log('Adding Ahmed Zaher\'s enrollments and orders...');

// Add enrollments for Ahmed Zaher (ID: 7)
const enrollments = [
    { user_id: 7, course_id: 1, status: 'active' }, // Mathematics
    { user_id: 7, course_id: 2, status: 'active' }  // Physics
];

let enrollmentCompleted = 0;
enrollments.forEach(enrollment => {
    db.run("INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)", 
           [enrollment.user_id, enrollment.course_id, enrollment.status], function(err) {
        if (err) {
            console.error('Error adding enrollment:', err.message);
        } else {
            console.log(`Added enrollment: User ${enrollment.user_id} -> Course ${enrollment.course_id}`);
        }
        
        enrollmentCompleted++;
        if (enrollmentCompleted === enrollments.length) {
            // Add orders for Ahmed Zaher
            addOrders();
        }
    });
});

function addOrders() {
    // Add orders for Ahmed Zaher (ID: 7)
    const orders = [
        { user_id: 7, total_amount: 299.00, payment_method: 'Credit Card', status: 'completed' },
        { user_id: 7, total_amount: 279.00, payment_method: 'PayPal', status: 'completed' }
    ];
    
    let orderCompleted = 0;
    orders.forEach(order => {
        db.run("INSERT INTO orders (user_id, total_amount, payment_method, status) VALUES (?, ?, ?, ?)", 
               [order.user_id, order.total_amount, order.payment_method, order.status], function(err) {
            if (err) {
                console.error('Error adding order:', err.message);
            } else {
                console.log(`Added order: User ${order.user_id}, Amount: ${order.total_amount}`);
                
                // Add order items
                const orderId = this.lastID;
                const orderItems = [
                    { order_id: orderId, course_id: 1, price: 299.00 }, // Mathematics
                    { order_id: orderId, course_id: 2, price: 279.00 }  // Physics
                ];
                
                orderItems.forEach(item => {
                    db.run("INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)", 
                           [item.order_id, item.course_id, item.price], function(err) {
                        if (err) {
                            console.error('Error adding order item:', err.message);
                        } else {
                            console.log(`Added order item: Order ${item.order_id} -> Course ${item.course_id}`);
                        }
                    });
                });
            }
            
            orderCompleted++;
            if (orderCompleted === orders.length) {
                // Verify final state
                setTimeout(() => {
                    console.log('\n=== Final Database State ===');
                    
                    db.all("SELECT id, first_name, last_name, email, points FROM users WHERE role = 'student'", (err, students) => {
                        if (err) {
                            console.error('Error fetching students:', err.message);
                        } else {
                            console.log('\nStudents:');
                            students.forEach(student => {
                                console.log(`ID: ${student.id}, Name: ${student.first_name} ${student.last_name}, Email: ${student.email}, Points: ${student.points}`);
                            });
                        }
                    });
                    
                    db.all("SELECT e.user_id, e.course_id, e.status, c.title FROM enrollments e JOIN courses c ON e.course_id = c.id", (err, enrollments) => {
                        if (err) {
                            console.error('Error fetching enrollments:', err.message);
                        } else {
                            console.log('\nEnrollments:');
                            enrollments.forEach(enrollment => {
                                console.log(`User ${enrollment.user_id} -> ${enrollment.title} (${enrollment.status})`);
                            });
                        }
                    });
                    
                    db.all("SELECT o.id, o.user_id, o.total_amount, o.status FROM orders o", (err, orders) => {
                        if (err) {
                            console.error('Error fetching orders:', err.message);
                        } else {
                            console.log('\nOrders:');
                            orders.forEach(order => {
                                console.log(`Order ${order.id}: User ${order.user_id}, Amount: ${order.total_amount}, Status: ${order.status}`);
                            });
                        }
                        
                        db.close();
                    });
                }, 500);
            }
        });
    });
}
