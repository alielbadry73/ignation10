const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking admin account...\n');

db.get('SELECT * FROM users WHERE email = ?', ['admin@ignation.com'], (err, admin) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    if (!admin) {
        console.log('❌ Admin account not found!');
        db.close();
        return;
    }
    
    console.log('✅ Admin account found:');
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Password hash:', admin.password);
    
    // Test passwords
    const testPasswords = ['admin123', 'admin1234', 'Admin123'];
    console.log('\nTesting passwords...');
    
    testPasswords.forEach(pwd => {
        const matches = bcrypt.compareSync(pwd, admin.password);
        console.log(`   "${pwd}": ${matches ? '✅ MATCHES' : '❌ no match'}`);
    });
    
    db.close();
});

