const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the root database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the database.');
});

// Get all student data to verify what's available
db.all("SELECT * FROM users WHERE role = 'student'", (err, rows) => {
    if (err) {
        console.error('Error fetching students:', err.message);
        return;
    }
    
    console.log('Available student data:');
    console.log('Number of students:', rows.length);
    
    if (rows.length > 0) {
        console.log('\nSample student data:');
        const student = rows[0];
        console.log('ID:', student.id);
        console.log('Name:', student.first_name, student.last_name);
        console.log('Email:', student.email);
        console.log('Phone:', student.phone);
        console.log('Parent Phone:', student.parent_phone);
        console.log('Points:', student.points);
        console.log('Role:', student.role);
        console.log('Is Active:', student.is_active);
        console.log('Created At:', student.created_at);
        console.log('Last Login:', student.last_login);
        console.log('Updated At:', student.updated_at);
    }
    
    db.close();
});
