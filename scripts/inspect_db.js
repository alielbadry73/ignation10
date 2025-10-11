const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) return console.error('Error listing tables', err);
    console.log('Tables:', rows.map(r => r.name).join(', '));

    const tables = ['students', 'teachers', 'users'];
    tables.forEach((t) => {
      db.all(`SELECT * FROM ${t} LIMIT 5`, (err2, r2) => {
        if (err2) return; // skip if table doesn't exist
        console.log('\n--- ' + t + ' ---');
        console.table(r2);
      });
    });
  });
});

setTimeout(() => db.close(), 1000);
