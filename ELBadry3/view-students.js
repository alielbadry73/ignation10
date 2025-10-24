const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'igway.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to the database');
});

// Function to view all students
function viewAllStudents() {
    console.log('\n📊 STUDENT DATABASE INFORMATION');
    console.log('=' .repeat(80));
    
    db.all(`
        SELECT 
            id,
            first_name,
            last_name,
            email,
            phone,
            password,
            role,
            created_at
        FROM users 
        WHERE role = 'student'
        ORDER BY created_at DESC
    `, (err, rows) => {
        if (err) {
            console.error('❌ Error querying students:', err.message);
            return;
        }
        
        if (rows.length === 0) {
            console.log('📭 No students found in the database');
            return;
        }
        
        console.log(`\n👥 Found ${rows.length} student(s) in the database:\n`);
        
        rows.forEach((student, index) => {
            console.log(`🔹 STUDENT #${index + 1}`);
            console.log('─'.repeat(40));
            console.log(`🆔 ID: ${student.id}`);
            console.log(`👤 Name: ${student.first_name} ${student.last_name}`);
            console.log(`📧 Email: ${student.email}`);
            console.log(`📱 Phone: ${student.phone || 'Not provided'}`);
            console.log(`🔐 Password (Hashed): ${student.password}`);
            console.log(`👤 Role: ${student.role}`);
            console.log(`📅 Created: ${student.created_at}`);
            console.log('');
        });
        
        // Also show total count
        console.log(`📈 Total Students: ${rows.length}`);
    });
}

// Function to view student enrollments
function viewStudentEnrollments() {
    console.log('\n📚 STUDENT ENROLLMENTS');
    console.log('=' .repeat(50));
    
    db.all(`
        SELECT 
            u.first_name,
            u.last_name,
            u.email,
            c.title as course_title,
            e.status,
            e.created_at as enrolled_at
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE u.role = 'student'
        ORDER BY e.created_at DESC
    `, (err, rows) => {
        if (err) {
            console.error('❌ Error querying enrollments:', err.message);
            return;
        }
        
        if (rows.length === 0) {
            console.log('📭 No enrollments found');
            return;
        }
        
        console.log(`\n📖 Found ${rows.length} enrollment(s):\n`);
        
        rows.forEach((enrollment, index) => {
            console.log(`🔹 ENROLLMENT #${index + 1}`);
            console.log('─'.repeat(30));
            console.log(`👤 Student: ${enrollment.first_name} ${enrollment.last_name}`);
            console.log(`📧 Email: ${enrollment.email}`);
            console.log(`📚 Course: ${enrollment.course_title}`);
            console.log(`📊 Status: ${enrollment.status}`);
            console.log(`📅 Enrolled: ${enrollment.enrolled_at}`);
            console.log('');
        });
    });
}

// Function to view student orders
function viewStudentOrders() {
    console.log('\n🛒 STUDENT ORDERS');
    console.log('=' .repeat(40));
    
    db.all(`
        SELECT 
            o.id as order_id,
            u.first_name,
            u.last_name,
            u.email,
            o.total_amount,
            o.payment_method,
            o.status,
            o.created_at as order_date
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE u.role = 'student'
        ORDER BY o.created_at DESC
    `, (err, rows) => {
        if (err) {
            console.error('❌ Error querying orders:', err.message);
            return;
        }
        
        if (rows.length === 0) {
            console.log('📭 No orders found');
            return;
        }
        
        console.log(`\n🛍️ Found ${rows.length} order(s):\n`);
        
        rows.forEach((order, index) => {
            console.log(`🔹 ORDER #${index + 1}`);
            console.log('─'.repeat(25));
            console.log(`🆔 Order ID: ${order.order_id}`);
            console.log(`👤 Student: ${order.first_name} ${order.last_name}`);
            console.log(`📧 Email: ${order.email}`);
            console.log(`💰 Amount: £${order.total_amount}`);
            console.log(`💳 Payment: ${order.payment_method}`);
            console.log(`📊 Status: ${order.status}`);
            console.log(`📅 Date: ${order.order_date}`);
            console.log('');
        });
    });
}

// Main execution
console.log('🔍 IG WAY DATABASE - STUDENT INFORMATION VIEWER');
console.log('=' .repeat(60));

// View all student information
viewAllStudents();

// Wait a bit then show enrollments
setTimeout(() => {
    viewStudentEnrollments();
}, 1000);

// Wait a bit then show orders
setTimeout(() => {
    viewStudentOrders();
}, 2000);

// Close database connection after showing all data
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('\n✅ Database connection closed');
        }
    });
}, 3000);

