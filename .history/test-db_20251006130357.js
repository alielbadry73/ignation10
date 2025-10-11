const sqlite3 = require('sqlite3').verbose();

console.log('Testing database connection...');

const db = new sqlite3.Database('../igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Database connected successfully');
});

// Test a simple query
db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) {
        console.error('Database query error:', err);
    } else {
        console.log('Users count:', row.count);
    }
    
    // Test specific user query
    db.get("SELECT * FROM users WHERE email = ?", ['cybernight@gmail.com'], (err, user) => {
        if (err) {
            console.error('User query error:', err);
        } else {
            console.log('User found:', user ? 'Yes' : 'No');
            if (user) {
                console.log('User data:', {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    phone: user.phone,
                    parent_phone: user.parent_phone
                });
            }
        }
        
        db.close();
    });
});