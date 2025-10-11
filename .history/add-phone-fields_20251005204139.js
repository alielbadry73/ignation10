const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('🔧 Adding phone fields to students table...');

// Add phone and parent_phone columns to students table
db.serialize(() => {
    // Add phone column
    db.run(`ALTER TABLE students ADD COLUMN phone TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding phone column:', err);
        } else {
            console.log('✅ Phone column added successfully');
        }
    });
    
    // Add parent_phone column
    db.run(`ALTER TABLE students ADD COLUMN parent_phone TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding parent_phone column:', err);
        } else {
            console.log('✅ Parent phone column added successfully');
        }
    });
    
    // Verify the changes
    db.all('PRAGMA table_info(students)', (err, rows) => {
        if (err) {
            console.error('Error checking table schema:', err);
        } else {
            console.log('\nUpdated students table schema:');
            console.table(rows);
        }
        db.close();
    });
});
