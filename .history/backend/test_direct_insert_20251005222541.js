const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

// Test direct insert
const email = 'test2@example.com';
const password = 'password123';
const firstName = 'Test';
const lastName = 'User';
const phone = '+1234567890';
const parentPhone = '+0987654321';
const role = 'student';

console.log('Testing direct insert...');

bcrypt.hash(password, 10, (hErr, hash) => {
  if (hErr) {
    console.error('Hash error:', hErr);
    return;
  }
  
  console.log('Password hashed successfully');
  
  const sql = `INSERT INTO users (email, password, first_name, last_name, phone, parent_phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [email, hash, firstName, lastName, phone, parentPhone, role];
  
  console.log('SQL:', sql);
  console.log('Params:', params);
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error('❌ Insert error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
    } else {
      console.log('✅ Insert successful!');
      console.log('Last ID:', this.lastID);
    }
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  });
});
