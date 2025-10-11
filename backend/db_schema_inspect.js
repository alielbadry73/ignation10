const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

const tables = ['students', 'teachers', 'users', 'lectures'];

function inspectTable(table) {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info('${table}')`, (err, rows) => {
      if (err) return resolve({ table, error: err.message });
      resolve({ table, cols: rows });
    });
  });
}

(async () => {
  for (const t of tables) {
    const info = await inspectTable(t);
    console.log(JSON.stringify(info, null, 2));
  }
  db.close();
})();
