const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking enrollments table structure...');

db.all('PRAGMA table_info(enrollments)', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Enrollments table structure:');
        rows.forEach(row => {
            console.log(`${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : 'NULL'}`);
        });
    }
    db.close();
});
