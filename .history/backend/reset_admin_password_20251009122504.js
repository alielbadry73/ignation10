const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

const newPassword = 'admin123';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

console.log('Resetting admin password to "admin123"...\n');

db.run(
    'UPDATE users SET password = ? WHERE email = ?',
    [hashedPassword, 'admin@ignation.com'],
    function(err) {
        if (err) {
            console.error('❌ Error:', err);
        } else if (this.changes === 0) {
            console.log('❌ Admin account not found!');
        } else {
            console.log('✅ Admin password successfully reset to "admin123"');
            console.log(`   Email: admin@ignation.com`);
            console.log(`   Password: admin123`);
        }
        db.close();
    }
);
