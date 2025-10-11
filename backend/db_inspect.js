const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite', sqlite3.OPEN_READONLY, (err) => {
  if (err) return console.error('Failed to open DB:', err.message);
});

function dump(query, label, cb) {
  db.all(query, (err, rows) => {
    console.log('\n--- ' + label + ' ---');
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    if (cb) cb();
  });
}

db.serialize(() => {
  dump('SELECT id, username, email, password FROM users LIMIT 50', 'users');
  dump('SELECT id, username, email, password FROM students LIMIT 50', 'students');
  dump('SELECT id, username, email, password, full_name FROM teachers LIMIT 50', 'teachers', () => {
    db.close();
  });
});
