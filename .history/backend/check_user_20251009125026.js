const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

const email = 'alielbadry279@gmail.com';

console.log(`Checking user account: ${email}\n`);

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
    
    console.log('✅ User account found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Role:', user.role);
    console.log('   Phone:', user.phone || 'N/A');
    console.log('   Password hash:', user.password);
    
    // Test common passwords
    const testPasswords = ['123456', 'password', 'Password123', 'alielbadry', user.first_name?.toLowerCase()];
    console.log('\nTesting common passwords...');
    
    let foundMatch = false;
    testPasswords.forEach(pwd => {
        if (pwd) {
            const matches = bcrypt.compareSync(pwd, user.password);
            if (matches) foundMatch = true;
            console.log(`   "${pwd}": ${matches ? '✅ MATCHES' : '❌ no match'}`);
        }
    });
    
    if (!foundMatch) {
        console.log('\n⚠️  No common password matched. Password needs to be reset.');
    }
    
    db.close();
});

