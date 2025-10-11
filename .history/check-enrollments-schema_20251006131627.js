const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./igway.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Database connected successfully');
});

// Check enrollments table structure
db.all("PRAGMA table_info('enrollments')", (err, columns) => {
    if (err) {
        console.error('Error checking enrollments schema:', err);
    } else {
        console.log('Enrollments table structure:');
        columns.forEach(col => {
            console.log(`- ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
    }
    
    // Check if there are any enrollments
    db.all("SELECT * FROM enrollments LIMIT 5", (err, rows) => {
        if (err) {
            console.error('Error querying enrollments:', err);
        } else {
            console.log(`\nEnrollments count: ${rows.length}`);
            if (rows.length > 0) {
                console.log('Sample enrollments:');
                rows.forEach(row => console.log(JSON.stringify(row, null, 2)));
            }
        }
        db.close();
    });
});
