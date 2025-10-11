const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Database connected successfully');
});

// List all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error listing tables:', err);
    } else {
        console.log('Available tables:');
        tables.forEach(table => {
            console.log('-', table.name);
        });
    }
    
    // Check users table
    db.all("SELECT * FROM users ORDER BY id DESC LIMIT 3", (err, users) => {
        if (err) {
            console.error('Error querying users:', err);
        } else {
            console.log('\nRecent users:');
            users.forEach(user => {
                console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Phone: ${user.phone}, Parent Phone: ${user.parent_phone}`);
            });
        }
        db.close();
    });
});
