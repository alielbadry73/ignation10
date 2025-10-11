const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./backend/database.sqlite');

console.log('Testing admin login...');

db.get('SELECT * FROM users WHERE email = ?', ['admin@ignation.com'], (err, row) => {
    if (err) {
        console.error('Database error:', err);
        db.close();
        return;
    }
    
    if (!row) {
        console.log('❌ No admin user found');
        db.close();
        return;
    }
    
    console.log('✅ Admin user found:');
    console.log('  ID:', row.id);
    console.log('  Email:', row.email);
    console.log('  Role:', row.role);
    console.log('  Password hash:', row.password ? 'Present' : 'Missing');
    
    if (row.password) {
        console.log('  Hash starts with:', row.password.substring(0, 20) + '...');
        
        // Test password comparison
        bcrypt.compare('admin123', row.password, (err, result) => {
            console.log('  Password "admin123" comparison:', result ? '✅ Match' : '❌ No match');
            
            // Test with different passwords
            bcrypt.compare('admin1234', row.password, (err, result) => {
                console.log('  Password "admin1234" comparison:', result ? '✅ Match' : '❌ No match');
                db.close();
            });
        });
    } else {
        console.log('❌ No password hash found');
        db.close();
    }
});
