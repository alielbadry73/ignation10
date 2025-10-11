const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'igway.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
});

// Check all students currently in the database
db.all("SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE role = 'student' ORDER BY id", (err, rows) => {
    if (err) {
        console.error('Error fetching students:', err.message);
        return;
    }
    
    console.log('Current students in database:');
    console.log('Total count:', rows.length);
    console.log('----------------------------------------');
    
    rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Name: ${row.first_name} ${row.last_name}`);
        console.log(`Email: ${row.email}`);
        console.log(`Phone: ${row.phone || 'N/A'}`);
        console.log(`Role: ${row.role}`);
        console.log(`Created: ${row.created_at}`);
        console.log('----------------------------------------');
    });
    
    db.close();
});
