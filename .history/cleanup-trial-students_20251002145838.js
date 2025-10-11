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

// First, let's see what students are currently in the database
db.all("SELECT id, first_name, last_name, email, role FROM users WHERE role = 'student'", (err, rows) => {
    if (err) {
        console.error('Error fetching students:', err.message);
        return;
    }
    
    console.log('Current students in database:');
    rows.forEach(row => {
        console.log(`ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}`);
    });
    
    // Remove trial students (John Smith, Sarah Johnson, Mike Brown, Emma Wilson, David Lee)
    const trialStudentIds = [2, 3, 4, 5, 6]; // IDs of trial students
    
    console.log('\nRemoving trial students...');
    
    let completed = 0;
    trialStudentIds.forEach(studentId => {
        // Delete from users table
        db.run("DELETE FROM users WHERE id = ?", [studentId], function(err) {
            if (err) {
                console.error(`Error deleting student ID ${studentId}:`, err.message);
            } else {
                console.log(`Deleted student ID ${studentId} (${this.changes} row affected)`);
            }
            
            completed++;
            if (completed === trialStudentIds.length) {
                // Verify the cleanup
                db.all("SELECT id, first_name, last_name, email, role FROM users WHERE role = 'student'", (err, rows) => {
                    if (err) {
                        console.error('Error fetching students after cleanup:', err.message);
                    } else {
                        console.log('\nStudents after cleanup:');
                        if (rows.length === 0) {
                            console.log('No students found');
                        } else {
                            rows.forEach(row => {
                                console.log(`ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}`);
                            });
                        }
                    }
                    db.close();
                });
            }
        });
    });
});
