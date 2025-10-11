const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('Checking all users with cyber in email...');

// Check users table
db.all("SELECT id, email, first_name, last_name FROM users WHERE email LIKE '%cyber%'", (err, rows) => {
    if (err) {
        console.error('Users table error:', err);
    } else {
        console.log('Users table matches:', rows.length);
        rows.forEach(row => console.log(row));
    }
    
    // Check students table
    db.all("SELECT id, email, first_name, last_name FROM students WHERE email LIKE '%cyber%'", (err2, rows2) => {
        if (err2) {
            console.error('Students table error:', err2);
        } else {
            console.log('Students table matches:', rows2.length);
            rows2.forEach(row => console.log(row));
        }
        
        // Also check case variations
        console.log('\nChecking case variations...');
        db.all("SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) = LOWER(?)", ['cybernight@gmail.com'], (err3, rows3) => {
            if (err3) {
                console.error('Case check error:', err3);
            } else {
                console.log('Case-insensitive matches in users:', rows3.length);
                rows3.forEach(row => console.log(row));
            }
            
            db.all("SELECT id, email, first_name, last_name FROM students WHERE LOWER(email) = LOWER(?)", ['cybernight@gmail.com'], (err4, rows4) => {
                if (err4) {
                    console.error('Case check error:', err4);
                } else {
                    console.log('Case-insensitive matches in students:', rows4.length);
                    rows4.forEach(row => console.log(row));
                }
                
                db.close();
            });
        });
    });
});
