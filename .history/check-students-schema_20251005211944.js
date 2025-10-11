const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('🔍 CHECKING STUDENTS TABLE SCHEMA');
console.log('=================================\n');

db.all("PRAGMA table_info(students)", (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Students table schema:');
        console.table(rows);
        
        // Check for unique constraints
        console.log('\n🔍 Checking for unique constraints...');
        db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='students'", (err, tableInfo) => {
            if (err) {
                console.error('Error getting table info:', err);
            } else {
                console.log('Table creation SQL:');
                console.log(tableInfo[0]?.sql || 'No SQL found');
            }
            db.close();
        });
    }
});
