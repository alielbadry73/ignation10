const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'igway.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
});

// Function to add Ahmed Zaher and Saad Samir, then remove all other students
function finalStudentCleanup() {
    console.log('Starting final student cleanup...');
    
    // First, let's see what students we currently have
    db.all("SELECT id, first_name, last_name, email FROM users WHERE role = 'student'", (err, rows) => {
        if (err) {
            console.error('Error fetching students:', err.message);
            return;
        }
        
        console.log('Current students in database:');
        rows.forEach(row => {
            console.log(`- ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.id}`);
        });
        
        // Delete all existing students
        db.run("DELETE FROM users WHERE role = 'student'", function(err) {
            if (err) {
                console.error('Error deleting students:', err.message);
                return;
            }
            
            console.log(`\n✅ Deleted ${this.changes} existing students from the database.`);
            
            // Add Ahmed Zaher
            db.run(`
                INSERT INTO users (first_name, last_name, email, password, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, ['Ahmed', 'Zaher', 'ahmed.zaher@example.com', 'password123', 'student'], function(err) {
                if (err) {
                    console.error('Error adding Ahmed Zaher:', err.message);
                    return;
                }
                console.log('✅ Added Ahmed Zaher (ID: ' + this.lastID + ')');
                
                // Add Saad Samir
                db.run(`
                    INSERT INTO users (first_name, last_name, email, password, role, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `, ['Saad', 'Samir', 'saad.samir@example.com', 'password123', 'student'], function(err) {
                    if (err) {
                        console.error('Error adding Saad Samir:', err.message);
                        return;
                    }
                    console.log('✅ Added Saad Samir (ID: ' + this.lastID + ')');
                    
                    // Verify the final result
                    db.all("SELECT id, first_name, last_name, email FROM users WHERE role = 'student'", (err, finalRows) => {
                        if (err) {
                            console.error('Error fetching final students:', err.message);
                            return;
                        }
                        
                        console.log('\n🎉 Final students in database:');
                        finalRows.forEach(row => {
                            console.log(`- ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.id}`);
                        });
                        
                        db.close((err) => {
                            if (err) {
                                console.error('Error closing database:', err.message);
                            } else {
                                console.log('\n✅ Database cleanup and student addition completed successfully!');
                                console.log('Now you have only Ahmed Zaher and Saad Samir as students.');
                            }
                        });
                    });
                });
            });
        });
    });
}

// Run the function
finalStudentCleanup();
