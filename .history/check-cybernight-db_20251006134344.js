const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('Checking cybernight user in database...');

// Check users table
db.all('SELECT id, email, password, first_name, last_name, phone FROM users WHERE email = ?', ['cybernight@gmail.com'], (err, rows) => {
    if (err) {
        console.error('Users table error:', err);
    } else {
        console.log('Users table matches:', rows.length);
        if (rows.length > 0) {
            rows.forEach(row => {
                console.log({
                    id: row.id,
                    email: row.email,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    phone: row.phone,
                    password_hash: row.password ? row.password.substring(0, 20) + '...' : 'null'
                });
            });
        }
    }
    
    // Check students table
    db.all('SELECT id, email, password, first_name, last_name, phone FROM students WHERE email = ?', ['cybernight@gmail.com'], (err2, rows2) => {
        if (err2) {
            console.error('Students table error:', err2);
        } else {
            console.log('Students table matches:', rows2.length);
            if (rows2.length > 0) {
                rows2.forEach(row => {
                    console.log({
                        id: row.id,
                        email: row.email,
                        first_name: row.first_name,
                        last_name: row.last_name,
                        phone: row.phone,
                        password_hash: row.password ? row.password.substring(0, 20) + '...' : 'null'
                    });
                });
            }
        }
        
        // Also check with case-insensitive search
        console.log('\nChecking case-insensitive...');
        db.all('SELECT id, email, password FROM users WHERE LOWER(email) = LOWER(?)', ['cybernight@gmail.com'], (err3, rows3) => {
            if (err3) {
                console.error('Case-insensitive search error:', err3);
            } else {
                console.log('Case-insensitive users matches:', rows3.length);
                if (rows3.length > 0) {
                    rows3.forEach(row => {
                        console.log({
                            id: row.id,
                            email: row.email,
                            password_hash: row.password ? row.password.substring(0, 20) + '...' : 'null'
                        });
                    });
                }
            }
            
            db.close();
        });
    });
});
