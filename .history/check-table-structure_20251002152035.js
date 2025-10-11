const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the root database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening root database:', err.message);
        return;
    }
    console.log('Connected to the root database.');
});

// Check table structure
db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
        console.error('Error getting table info:', err.message);
        return;
    }
    
    console.log('Users table structure:');
    rows.forEach(row => {
        console.log(`${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    db.close();
});
