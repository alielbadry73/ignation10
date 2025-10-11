const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🧹 CLEANING USERS TABLE');
    console.log('=======================\n');
    
    // Keep only admin users, remove all students
    db.run("DELETE FROM users WHERE role = 'student'", function(err) {
        if (err) {
            console.error('❌ Error cleaning users table:', err.message);
            return;
        }
        
        console.log(`✅ Removed ${this.changes} student records from users table`);
        
        // Check remaining users
        db.all("SELECT * FROM users", (err, users) => {
            if (err) {
                console.error('Error checking remaining users:', err.message);
                return;
            }
            
            console.log('\n📊 Remaining users:');
            users.forEach(user => {
                console.log(`- ${user.email} (${user.role})`);
            });
            
            console.log('\n🎉 Users table cleaned!');
            console.log('Only admin users remain.');
            
            db.close();
        });
    });
});
