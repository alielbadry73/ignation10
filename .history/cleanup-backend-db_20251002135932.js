const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the backend database
const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening backend database:', err.message);
        return;
    }
    console.log('Connected to the backend database.');
});

// Function to clean up backend database
function cleanupBackendDatabase() {
    console.log('Starting backend database cleanup...');
    
    // First, let's see what students we currently have
    db.all("SELECT id, first_name, last_name, email FROM users WHERE role = 'student'", (err, rows) => {
        if (err) {
            console.error('Error fetching students:', err.message);
            return;
        }
        
        console.log('Current students in backend database:');
        rows.forEach(row => {
            console.log(`- ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.id}`);
        });
        
        // Find Ahmed Zaher and Saad Samir (case insensitive)
        const studentsToKeep = rows.filter(row => 
            (row.first_name.toLowerCase().includes('ahmed') && row.last_name.toLowerCase().includes('zaher')) ||
            (row.first_name.toLowerCase().includes('saad') && row.last_name.toLowerCase().includes('samir'))
        );
        
        console.log('\nStudents to keep:');
        studentsToKeep.forEach(student => {
            console.log(`- ${student.first_name} ${student.last_name} (${student.email}) - ID: ${student.id}`);
        });
        
        if (studentsToKeep.length === 0) {
            console.log('No students found with names containing "Ahmed Zaher" or "Saad Samir".');
            console.log('Deleting all students and adding the required ones...');
            
            // Delete all students
            db.run("DELETE FROM users WHERE role = 'student'", function(err) {
                if (err) {
                    console.error('Error deleting students:', err.message);
                    return;
                }
                
                console.log(`\n✅ Deleted ${this.changes} students from the backend database.`);
                
                // Add Ahmed Zaher
                db.run(`
                    INSERT INTO users (first_name, last_name, email, password, role, phone, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `, ['Ahmed', 'Zaher', 'ahmed.zaher@example.com', 'password123', 'student', '01040450811'], function(err) {
                    if (err) {
                        console.error('Error adding Ahmed Zaher:', err.message);
                        return;
                    }
                    console.log('✅ Added Ahmed Zaher (ID: ' + this.lastID + ')');
                    
                    // Add Saad Samir
                    db.run(`
                        INSERT INTO users (first_name, last_name, email, password, role, phone, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `, ['Saad', 'Samir', 'saad.samir@example.com', 'password123', 'student', '01040450819'], function(err) {
                        if (err) {
                            console.error('Error adding Saad Samir:', err.message);
                            return;
                        }
                        console.log('✅ Added Saad Samir (ID: ' + this.lastID + ')');
                        
                        // Verify the final result
                        db.all("SELECT id, first_name, last_name, email, phone FROM users WHERE role = 'student'", (err, finalRows) => {
                            if (err) {
                                console.error('Error fetching final students:', err.message);
                                return;
                            }
                            
                            console.log('\n🎉 Final students in backend database:');
                            finalRows.forEach(row => {
                                console.log(`- ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.id} - Phone: ${row.phone}`);
                            });
                            
                            db.close((err) => {
                                if (err) {
                                    console.error('Error closing database:', err.message);
                                } else {
                                    console.log('\n✅ Backend database cleanup completed successfully!');
                                    console.log('The admin panel should now show only Ahmed Zaher and Saad Samir.');
                                }
                            });
                        });
                    });
                });
            });
        } else {
            // Keep the existing Ahmed and Saad, delete the rest
            const keepIds = studentsToKeep.map(student => student.id);
            const placeholders = keepIds.map(() => '?').join(',');
            
            const deleteQuery = `DELETE FROM users WHERE role = 'student' AND id NOT IN (${placeholders})`;
            
            db.run(deleteQuery, keepIds, function(err) {
                if (err) {
                    console.error('Error deleting students:', err.message);
                    return;
                }
                
                console.log(`\n✅ Deleted ${this.changes} students from the backend database.`);
                console.log(`Kept ${studentsToKeep.length} students: Ahmed Zaher and Saad Samir`);
                
                // Verify the remaining students
                db.all("SELECT id, first_name, last_name, email, phone FROM users WHERE role = 'student'", (err, remainingRows) => {
                    if (err) {
                        console.error('Error fetching remaining students:', err.message);
                        return;
                    }
                    
                    console.log('\nRemaining students in backend database:');
                    remainingRows.forEach(row => {
                        console.log(`- ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.id} - Phone: ${row.phone}`);
                    });
                    
                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err.message);
                        } else {
                            console.log('\n✅ Backend database cleanup completed successfully!');
                        }
                    });
                });
            });
        }
    });
}

// Run the cleanup
cleanupBackendDatabase();
