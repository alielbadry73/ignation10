const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔧 UPDATING STUDENTS TABLE SCHEMA');
    console.log('==================================\n');
    
    // Add first_name and last_name columns
    db.run('ALTER TABLE students ADD COLUMN first_name TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding first_name column:', err.message);
            return;
        }
        console.log('✅ Added first_name column');
        
        db.run('ALTER TABLE students ADD COLUMN last_name TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding last_name column:', err.message);
                return;
            }
            console.log('✅ Added last_name column');
            
            // Check final schema
            db.all('PRAGMA table_info(students)', (err, cols) => {
                if (err) {
                    console.error('Error checking schema:', err.message);
                    return;
                }
                
                console.log('\n📋 Updated students table schema:');
                cols.forEach(col => {
                    console.log(`- ${col.name} (${col.type})`);
                });
                
                console.log('\n🎉 Schema update complete!');
                db.close();
            });
        });
    });
});
