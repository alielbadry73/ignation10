const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

const email = 'alielbadry279@gmail.com';
const testPassword = 'assadamgad12!A';

console.log(`Testing password for: ${email}\n`);

db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    if (!user) {
        console.log('❌ User account not found!');
        db.close();
        return;
    }
    
    console.log('Testing password: "assadamgad12!A"');
    const matches = bcrypt.compareSync(testPassword, user.password);
    console.log(`Result: ${matches ? '✅ PASSWORD MATCHES!' : '❌ Password does not match'}`);
    
    if (!matches) {
        console.log('\n⚠️  The stored password hash does not match "assadamgad12!A"');
        console.log('The account may have been created with a different password or the hash was overwritten.');
        console.log('\nWould you like me to reset it to "assadamgad12!A"?');
    }
    
    db.close();
});

