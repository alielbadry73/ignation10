const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database-current-broken.sqlite');

console.log('Checking old database for students...');

db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
        console.error('Database error:', err);
        db.close();
        return;
    }
    
    console.log('Total users in old database:', rows.length);
    console.log('\nAll users:');
    rows.forEach(row => {
        console.log(`- ID: ${row.id}, Email: ${row.email}, Role: ${row.role}`);
    });
    
    // Check for your specific email
    const yourEmail = 'alielbadry279@gmail.com';
    const yourAccount = rows.find(row => row.email === yourEmail);
    
    if (yourAccount) {
        console.log(`\n✅ Your account found in old database:`);
        console.log(`   ID: ${yourAccount.id}`);
        console.log(`   Email: ${yourAccount.email}`);
        console.log(`   Role: ${yourAccount.role}`);
    } else {
        console.log(`\n❌ Your account (${yourEmail}) not found in old database`);
    }
    
    // Count students
    const students = rows.filter(row => row.role === 'student');
    console.log(`\n📊 Students count in old database: ${students.length}`);
    
    db.close();
});
