const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the root database (what the server uses)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening root database:', err.message);
        return;
    }
    console.log('Connected to the root database.');
});

// Check current students
db.all("SELECT id, first_name, last_name, email, points FROM users WHERE role = 'student'", (err, rows) => {
    if (err) {
        console.error('Error fetching students:', err.message);
        return;
    }
    
    console.log('Current students in root database:');
    rows.forEach(row => {
        console.log(`ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, Points: ${row.points}`);
    });
    
    db.close();
});
