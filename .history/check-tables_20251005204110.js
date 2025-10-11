const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('All tables:');
        rows.forEach(row => console.log('- ' + row.name));
    }
    db.close();
});
