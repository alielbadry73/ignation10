const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

// Test login with different passwords
const testPasswords = ['admin123', 'password', 'admin', '123456'];

db.get('SELECT * FROM users WHERE email = "admin@igway.com"', (err, user) => {
  if (err) {
    console.error('Error getting admin user:', err.message);
    return;
  }
  
  if (!user) {
    console.log('❌ Admin user not found!');
    return;
  }
  
  console.log('Admin user found:', user.email);
  console.log('Stored password hash:', user.password);
  
  // Test each password
  testPasswords.forEach(password => {
    const isValid = bcrypt.compareSync(password, user.password);
    console.log(`Password "${password}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
  });
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
  });
});