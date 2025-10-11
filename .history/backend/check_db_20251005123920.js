const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

console.log('🔍 Checking database schema...');

// Check tables
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
    if (err) {
        console.error('❌ Error getting tables:', err);
        return;
    }
    
    console.log('📋 Tables found:', tables.map(t => t.name));
    
    // Check students table structure
    db.all('PRAGMA table_info(students)', (err, columns) => {
        if (err) {
            console.error('❌ Error getting students table info:', err);
        } else {
            console.log('👥 Students table columns:', columns.map(c => `${c.name} (${c.type})`));
        }
        
        // Check teachers table structure
        db.all('PRAGMA table_info(teachers)', (err, columns) => {
            if (err) {
                console.error('❌ Error getting teachers table info:', err);
            } else {
                console.log('👨‍🏫 Teachers table columns:', columns.map(c => `${c.name} (${c.type})`));
            }
            
            // Check user count
            db.get('SELECT COUNT(*) as count FROM students', (err, result) => {
                if (err) {
                    console.error('❌ Error counting students:', err);
                } else {
                    console.log('👥 Students count:', result.count);
                }
                
                db.get('SELECT COUNT(*) as count FROM teachers', (err, result) => {
                    if (err) {
                        console.error('❌ Error counting teachers:', err);
                    } else {
                        console.log('👨‍🏫 Teachers count:', result.count);
                    }
                    
                    db.close();
                });
            });
        });
    });
});
