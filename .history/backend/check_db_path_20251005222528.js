const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Current working directory:', process.cwd());
console.log('Database path:', path.resolve('../igway.db'));

const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

// Check if users table exists
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, rows) => {
  if (err) {
    console.error('Error checking users table:', err.message);
    return;
  }
  
  if (rows.length === 0) {
    console.log('❌ Users table does not exist!');
  } else {
    console.log('✅ Users table exists');
  }
  
  // List all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('Error listing tables:', err.message);
      return;
    }
    
    console.log('\nAll tables in database:');
    tables.forEach(table => console.log(`- ${table.name}`));
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  });
});
