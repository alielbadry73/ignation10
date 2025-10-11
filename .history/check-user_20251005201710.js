const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔍 CHECKING USER: alielbadry279@gmail.com');
    console.log('==========================================\n');
    
    // Check if user exists in students table
    db.get("SELECT * FROM students WHERE email = ?", ['alielbadry279@gmail.com'], (err, student) => {
        if (err) {
            console.error('Error checking students:', err.message);
            return;
        }
        
        if (student) {
            console.log('✅ User found in students table:');
            console.log('ID:', student.id);
            console.log('Username:', student.username);
            console.log('Email:', student.email);
            console.log('Full Name:', student.full_name);
            console.log('Created:', student.created_at);
        } else {
            console.log('❌ User not found in students table');
        }
        
        // Check if user exists in users table
        db.get("SELECT * FROM users WHERE email = ?", ['alielbadry279@gmail.com'], (err, user) => {
            if (err) {
                console.error('Error checking users:', err.message);
                return;
            }
            
            if (user) {
                console.log('\n✅ User found in users table:');
                console.log('ID:', user.id);
                console.log('Email:', user.email);
                console.log('First Name:', user.first_name);
                console.log('Last Name:', user.last_name);
                console.log('Role:', user.role);
                console.log('Created:', user.created_at);
            } else {
                console.log('\n❌ User not found in users table');
            }
            
            db.close();
        });
    });
});
