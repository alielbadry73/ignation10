const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('Checking cybernight user...');

db.all('SELECT id, email, password, first_name, last_name FROM users WHERE email = ?', ['cybernight@gmail.com'], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Found users:', rows.length);
        rows.forEach(row => {
            console.log({
                id: row.id,
                email: row.email,
                first_name: row.first_name,
                last_name: row.last_name,
                password_hash: row.password ? row.password.substring(0, 20) + '...' : 'null'
            });
        });
    }
    
    // Also check students table
    console.log('\nChecking students table...');
    db.all('SELECT id, email, password, first_name, last_name FROM students WHERE email = ?', ['cybernight@gmail.com'], (err2, rows2) => {
        if (err2) {
            console.error('Error:', err2);
        } else {
            console.log('Found students:', rows2.length);
            rows2.forEach(row => {
                console.log({
                    id: row.id,
                    email: row.email,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    password_hash: row.password ? row.password.substring(0, 20) + '...' : 'null'
                });
            });
        }
        
        db.close();
    });
});
