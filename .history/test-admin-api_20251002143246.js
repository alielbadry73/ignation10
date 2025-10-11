const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the backend database
const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening backend database:', err.message);
        return;
    }
    console.log('Connected to the backend database.');
});

// Test the same query that the API uses
db.all('SELECT * FROM users WHERE role = "student" ORDER BY created_at DESC', (err, rows) => {
    if (err) {
        console.error('Error fetching students:', err.message);
        return;
    }
    
    console.log('Students query result:');
    console.log('Total count:', rows.length);
    console.log('----------------------------------------');
    
    rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Name: ${row.first_name} ${row.last_name}`);
        console.log(`Email: ${row.email}`);
        console.log(`Phone: ${row.phone || 'N/A'}`);
        console.log(`Role: ${row.role}`);
        console.log(`Created: ${row.created_at}`);
        console.log('----------------------------------------');
    });
    
    // Check if there are any users with different roles that might be showing up
    db.all('SELECT id, first_name, last_name, email, role FROM users ORDER BY id', (err, allUsers) => {
        if (err) {
            console.error('Error fetching all users:', err.message);
            return;
        }
        
        console.log('\nAll users in database:');
        allUsers.forEach(user => {
            console.log(`ID: ${user.id}, Name: ${user.first_name} ${user.last_name}, Role: ${user.role}`);
        });
        
        db.close();
    });
});
