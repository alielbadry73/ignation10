const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const NEW_PASSWORD = 'admin123';
const ADMIN_EMAIL = 'admin@ignation.com';

console.log('Resetting admin password to:', NEW_PASSWORD);

bcrypt.hash(NEW_PASSWORD, 10, (err, hash) => {
  if (err) {
    console.error('Failed to hash password:', err);
    process.exit(1);
  }

  db.run(`UPDATE users SET password = ? WHERE email = ?`, [hash, ADMIN_EMAIL], function(uErr) {
    if (uErr) {
      console.error('Failed to update admin password:', uErr.message || uErr);
      process.exit(1);
    }
    console.log(`✅ Updated admin (${ADMIN_EMAIL}) password to '${NEW_PASSWORD}' (bcrypt-hashed). Rows affected: ${this.changes}`);
    db.close();
  });
});
