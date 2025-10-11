const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

const studentData = {
    email: 'alielbadry279@gmail.com',
    password: 'password123', // You can change this
    first_name: 'Ali',
    last_name: 'Elbadry',
    role: 'student'
};

console.log('Adding student account...');

// Hash the password
bcrypt.hash(studentData.password, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        db.close();
        return;
    }

    // Insert the student
    db.run(
        'INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
        [studentData.email, hash, studentData.first_name, studentData.last_name, studentData.role],
        function(err) {
            if (err) {
                console.error('Error adding student:', err);
            } else {
                console.log(`✅ Student added successfully with ID: ${this.lastID}`);
                console.log(`Email: ${studentData.email}`);
                console.log(`Password: ${studentData.password}`);
                console.log(`Role: ${studentData.role}`);
            }
            db.close();
        }
    );
});
