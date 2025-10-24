const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

// Check teachers table schema
db.all("PRAGMA table_info(teachers)", (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Teachers table schema:');
        console.table(rows);
    }
    
    // Check students table schema
    db.all("PRAGMA table_info(students)", (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('Students table schema:');
            console.table(rows);
        }
        
        db.close();
    });
});












































