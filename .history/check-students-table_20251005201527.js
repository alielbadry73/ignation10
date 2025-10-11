const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔍 CHECKING STUDENTS TABLE');
    console.log('==========================\n');
    
    // Check if students table exists
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='students'", (err, tables) => {
        if (err) {
            console.error('Error checking tables:', err.message);
            return;
        }
        
        console.log('Students table exists:', tables.length > 0);
        
        if (tables.length > 0) {
            // Check table schema
            db.all("PRAGMA table_info(students)", (err, columns) => {
                if (err) {
                    console.error('Error checking schema:', err.message);
                    return;
                }
                
                console.log('\nStudents table schema:');
                console.table(columns);
                
                // Check if we can insert a test record
                db.run("INSERT INTO students (username, email, password, full_name) VALUES (?, ?, ?, ?)", 
                    ['test@example.com', 'test@example.com', 'hashedpassword', 'Test User'], 
                    function(err) {
                        if (err) {
                            console.error('\n❌ Insert test failed:', err.message);
                        } else {
                            console.log('\n✅ Insert test successful, ID:', this.lastID);
                            // Clean up test record
                            db.run("DELETE FROM students WHERE id = ?", [this.lastID]);
                        }
                        db.close();
                    }
                );
            });
        } else {
            console.log('\n❌ Students table does not exist!');
            db.close();
        }
    });
});
