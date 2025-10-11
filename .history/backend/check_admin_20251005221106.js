const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

db.all('SELECT * FROM users WHERE role = "admin"', (err, rows) => {
  if (err) {
    console.error('Error getting admin users:', err.message);
  } else {
    console.log('Admin users:');
    if (rows.length === 0) {
      console.log('No admin users found!');
    } else {
      rows.forEach(r => console.log(`- ${r.email} (${r.first_name} ${r.last_name})`));
    }
  }
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
  });
});
