const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('Checking users table...');
db.all('SELECT id, email, first_name, last_name FROM users', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Users table:');
        rows.forEach(row => console.log(row));
    }
    
    console.log('\nChecking students table...');
    db.all('SELECT id, email, first_name, last_name FROM students LIMIT 5', (err2, rows2) => {
        if (err2) {
            console.error('Error:', err2);
        } else {
            console.log('Students table (first 5):');
            rows2.forEach(row => console.log(row));
        }
        
        db.close();
    });
});
