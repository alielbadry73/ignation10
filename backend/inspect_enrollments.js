const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all(`PRAGMA table_info('enrollments')`, (err, cols) => {
    if (err) return console.error('Error reading enrollments schema:', err);
    console.log('enrollments schema:', cols);
    db.close();
});
