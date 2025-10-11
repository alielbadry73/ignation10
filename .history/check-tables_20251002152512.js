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

// Get all table names
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('Error fetching tables:', err.message);
        return;
    }
    
    console.log('Available tables:');
    rows.forEach(row => {
        console.log('- ' + row.name);
    });
    
    // Check if there's a parent_phone column in users table
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error('Error getting table info:', err.message);
            return;
        }
        
        console.log('\nUsers table columns:');
        columns.forEach(col => {
            console.log(`- ${col.name}: ${col.type}`);
        });
        
        db.close();
    });
});
