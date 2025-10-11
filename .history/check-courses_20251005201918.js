const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔍 CHECKING COURSES TABLE');
    console.log('==========================\n');
    
    // Check if courses table exists
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='courses'", (err, tables) => {
        if (err) {
            console.error('Error checking tables:', err.message);
            return;
        }
        
        console.log('Courses table exists:', tables.length > 0);
        
        if (tables.length > 0) {
            // Check table schema
            db.all("PRAGMA table_info(courses)", (err, columns) => {
                if (err) {
                    console.error('Error checking schema:', err.message);
                    return;
                }
                
                console.log('\nCourses table schema:');
                console.table(columns);
                
                // Get sample courses
                db.all("SELECT * FROM courses LIMIT 5", (err, courses) => {
                    if (err) {
                        console.error('Error getting courses:', err.message);
                        return;
                    }
                    
                    console.log('\nSample courses:');
                    console.table(courses);
                    db.close();
                });
            });
        } else {
            console.log('\n❌ Courses table does not exist!');
            db.close();
        }
    });
});
