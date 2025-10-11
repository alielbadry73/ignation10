const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Syncing points for alielbadry279@gmail.com...\n');

// Update points to 5 for the user
db.run(`UPDATE users SET points = ? WHERE email = ?`, [5, 'alielbadry279@gmail.com'], function(err) {
    if (err) {
        console.error('Error updating points:', err);
    } else if (this.changes === 0) {
        console.log('❌ User not found');
    } else {
        console.log('✅ Successfully updated points to 5');
        
        // Verify the update
        db.get('SELECT first_name, last_name, email, points FROM users WHERE email = ?', ['alielbadry279@gmail.com'], (err, user) => {
            if (user) {
                console.log('\n📊 User Info:');
                console.log(`   Name: ${user.first_name} ${user.last_name}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Points: ${user.points}`);
            }
            db.close();
        });
    }
});

