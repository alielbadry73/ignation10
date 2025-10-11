const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// Your order data for the English course
const orderData = {
    user_id: 9, // Your user ID from the database
    customer_name: 'Ali Elbadry',
    customer_email: 'alielbadry279@gmail.com',
    customer_phone: '+1234567890', // You can change this
    courses: JSON.stringify([
        {
            id: 4, // English course ID
            courseId: 117, // English course ID (from homenocourses)
            title: 'IGCSE English Language',
            instructor: 'Dr. Emily Rodriguez',
            board: 'Cambridge Board',
            price: 279.00,
            quantity: 1
        }
    ]),
    total_amount: 279.00,
    payment_method: 'Credit Card',
    payment_screenshot: 'payment_english_course.jpg',
    status: 'pending' // You can change this to 'approved' if you want to grant access immediately
};

console.log('Creating order for English course purchase...');

db.run(
    `INSERT INTO orders (
        user_id, customer_name, customer_email, customer_phone, 
        courses, total_amount, payment_method, payment_screenshot, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        orderData.user_id,
        orderData.customer_name,
        orderData.customer_email,
        orderData.customer_phone,
        orderData.courses,
        orderData.total_amount,
        orderData.payment_method,
        orderData.payment_screenshot,
        orderData.status
    ],
    function(err) {
        if (err) {
            console.error('Error creating order:', err);
        } else {
            console.log(`✅ Order created successfully with ID: ${this.lastID}`);
            console.log(`Customer: ${orderData.customer_name}`);
            console.log(`Email: ${orderData.customer_email}`);
            console.log(`Course: IGCSE English Language`);
            console.log(`Amount: £${orderData.total_amount}`);
            console.log(`Status: ${orderData.status}`);
        }
        db.close();
    }
);
