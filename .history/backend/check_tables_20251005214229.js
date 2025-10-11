const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('Error getting tables:', err.message);
  } else {
    console.log('Tables in database:');
    rows.forEach(r => console.log('- ' + r.name));
  }
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
  });
});
