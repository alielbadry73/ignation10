const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('🔍 CHECKING ADMIN USERS');
console.log('=======================\n');

// Check users table for admin accounts
db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
        console.error('Error querying users:', err);
        return;
    }
    
    console.log('Users in database:');
    console.log('==================');
    if (rows.length === 0) {
        console.log('No users found');
    } else {
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Email: ${row.email}, Role: ${row.role || 'N/A'}`);
        });
    }
    
    // Also check teachers table for admin accounts
    db.all('SELECT * FROM teachers WHERE email LIKE "%admin%"', (err, teacherRows) => {
        if (err) {
            console.error('Error querying teachers:', err);
        } else {
            console.log('\nTeachers with admin email:');
            console.log('===========================');
            if (teacherRows.length === 0) {
                console.log('No admin teachers found');
            } else {
                teacherRows.forEach(row => {
                    console.log(`ID: ${row.id}, Email: ${row.email}, Name: ${row.first_name} ${row.last_name}`);
                });
            }
        }
        
        db.close();
    });
});
