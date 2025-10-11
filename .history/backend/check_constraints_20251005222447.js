const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

console.log('Checking users table constraints...');

db.all("PRAGMA table_info('users')", (err, cols) => {
  if (err) {
    console.error('Error getting users table schema:', err.message);
    return;
  }
  
  console.log('Users table columns with constraints:');
  cols.forEach(col => {
    console.log(`- ${col.name}: ${col.type} (nullable: ${col.notnull === 0}, default: ${col.dflt_value || 'none'})`);
  });
  
  // Check for unique constraints
  db.all("PRAGMA index_list('users')", (err, indexes) => {
    if (err) {
      console.error('Error getting indexes:', err.message);
      return;
    }
    
    console.log('\nIndexes on users table:');
    indexes.forEach(idx => {
      console.log(`- ${idx.name}: ${idx.unique ? 'UNIQUE' : 'NON-UNIQUE'}`);
    });
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  });
});
