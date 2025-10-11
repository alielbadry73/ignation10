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

// Get all student data
db.all("SELECT * FROM users WHERE role = 'student'", (err, rows) => {
    if (err) {
        console.error('Error fetching students:', err.message);
        return;
    }
    
    console.log('Student data available:');
    if (rows.length > 0) {
        console.log('Columns available:', Object.keys(rows[0]));
        console.log('\nSample student data:');
        console.log(JSON.stringify(rows[0], null, 2));
    } else {
        console.log('No students found');
    }
    
    db.close();
});
