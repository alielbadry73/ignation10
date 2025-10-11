const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

function showRow(table) {
  db.get(`SELECT * FROM ${table} WHERE email = 'admin@ignation.com'`, (err, row) => {
    if (err) console.error(table, 'error:', err.message);
    else console.log(table, 'row:', row);
  });
}

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) console.error('tables error', err.message);
    else console.log('tables:', rows.map(r=>r.name));

    showRow('users');
    showRow('teachers');
    showRow('students');
  });
});

process.on('exit', () => db.close());
