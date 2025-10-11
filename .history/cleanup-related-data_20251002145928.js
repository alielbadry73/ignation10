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

// Clean up related data for trial students (IDs 2, 3, 4, 5, 6)
const trialStudentIds = [2, 3, 4, 5, 6];

console.log('Cleaning up related data for trial students...');

// Clean up enrollments
db.run("DELETE FROM enrollments WHERE user_id IN (2, 3, 4, 5, 6)", function(err) {
    if (err) {
        console.error('Error deleting enrollments:', err.message);
    } else {
        console.log(`Deleted ${this.changes} enrollment records`);
    }
});

// Clean up orders
db.run("DELETE FROM orders WHERE user_id IN (2, 3, 4, 5, 6)", function(err) {
    if (err) {
        console.error('Error deleting orders:', err.message);
    } else {
        console.log(`Deleted ${this.changes} order records`);
    }
});

// Clean up order_items (if any orders were deleted)
db.run("DELETE FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)", function(err) {
    if (err) {
        console.error('Error deleting orphaned order items:', err.message);
    } else {
        console.log(`Deleted ${this.changes} orphaned order item records`);
    }
});

// Clean up student_parents
db.run("DELETE FROM student_parents WHERE student_id IN (2, 3, 4, 5, 6)", function(err) {
    if (err) {
        console.error('Error deleting student_parents:', err.message);
    } else {
        console.log(`Deleted ${this.changes} student_parent records`);
    }
});

// Verify final state
setTimeout(() => {
    console.log('\n=== Final Database State ===');
    
    // Check users
    db.all("SELECT id, first_name, last_name, email, role FROM users", (err, users) => {
        if (err) {
            console.error('Error fetching users:', err.message);
        } else {
            console.log('\nUsers:');
            users.forEach(user => {
                console.log(`ID: ${user.id}, Name: ${user.first_name} ${user.last_name}, Email: ${user.email}, Role: ${user.role}`);
            });
        }
    });
    
    // Check enrollments
    db.all("SELECT * FROM enrollments", (err, enrollments) => {
        if (err) {
            console.error('Error fetching enrollments:', err.message);
        } else {
            console.log('\nEnrollments:');
            if (enrollments.length === 0) {
                console.log('No enrollments found');
            } else {
                enrollments.forEach(enrollment => {
                    console.log(`User ID: ${enrollment.user_id}, Course ID: ${enrollment.course_id}, Status: ${enrollment.status}`);
                });
            }
        }
    });
    
    // Check orders
    db.all("SELECT * FROM orders", (err, orders) => {
        if (err) {
            console.error('Error fetching orders:', err.message);
        } else {
            console.log('\nOrders:');
            if (orders.length === 0) {
                console.log('No orders found');
            } else {
                orders.forEach(order => {
                    console.log(`Order ID: ${order.id}, User ID: ${order.user_id}, Amount: ${order.total_amount}, Status: ${order.status}`);
                });
            }
        }
        
        db.close();
    });
}, 1000);
