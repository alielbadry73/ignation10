const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

const email = 'alielbadry279@gmail.com';
const newPassword = 'assadamgad12!A';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

console.log(`Resetting password for: ${email}`);
console.log(`New password: ${newPassword}\n`);

db.run(
    'UPDATE users SET password = ? WHERE email = ?',
    [hashedPassword, email],
    function(err) {
        if (err) {
            console.error('❌ Error:', err);
        } else if (this.changes === 0) {
            console.log('❌ User account not found!');
        } else {
            console.log('✅ Password successfully reset!');
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${newPassword}`);
            console.log('\nYou can now log in with these credentials.');
        }
        db.close();
    }
);

