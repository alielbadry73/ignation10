const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔍 VERIFYING STUDENT DATA');
    console.log('==========================\n');
    
    // Get the newly registered student
    db.get("SELECT * FROM students WHERE email = ?", ['alielbadry279@gmail.com'], (err, student) => {
        if (err) {
            console.error('Error getting student:', err.message);
            return;
        }
        
        if (student) {
            console.log('✅ Student found in database:');
            console.log('ID:', student.id);
            console.log('Username:', student.username);
            console.log('Email:', student.email);
            console.log('First Name:', student.first_name);
            console.log('Last Name:', student.last_name);
            console.log('Full Name:', student.full_name);
            console.log('Created:', student.created_at);
            
            if (student.first_name && student.last_name) {
                console.log('\n🎉 SUCCESS: Student has separate first_name and last_name fields!');
            } else {
                console.log('\n❌ ISSUE: Student missing first_name or last_name');
            }
        } else {
            console.log('❌ Student not found in database');
        }
        
        db.close();
    });
});
