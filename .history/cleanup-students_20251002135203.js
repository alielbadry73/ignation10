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

// Function to clean up students table
function cleanupStudents() {
    console.log('Starting student cleanup...');
    
    // First, let's see what students we have
    db.all("SELECT id, first_name, last_name, email FROM users WHERE role = 'student'", (err, rows) => {
        if (err) {
            console.error('Error fetching students:', err.message);
            return;
        }
        
        console.log('Current students in database:');
        rows.forEach(row => {
            console.log(`- ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.id}`);
        });
        
        // Find the students we want to keep
        const studentsToKeep = rows.filter(row => 
            (row.first_name.toLowerCase() === 'ahmed' && row.last_name.toLowerCase() === 'zaher') ||
            (row.first_name.toLowerCase() === 'saad' && row.last_name.toLowerCase() === 'samir')
        );
        
        console.log('\nStudents to keep:');
        studentsToKeep.forEach(student => {
            console.log(`- ${student.first_name} ${student.last_name} (${student.email}) - ID: ${student.student_id}`);
        });
        
        if (studentsToKeep.length === 0) {
            console.log('No students found with names "Ahmed Zaher" or "Saad Samir".');
            console.log('Please check the exact names in the database.');
            db.close();
            return;
        }
        
        // Get IDs of students to keep
        const keepIds = studentsToKeep.map(student => student.id);
        const placeholders = keepIds.map(() => '?').join(',');
        
        // Delete all students except the ones we want to keep
        const deleteQuery = `DELETE FROM users WHERE role = 'student' AND id NOT IN (${placeholders})`;
        
        db.run(deleteQuery, keepIds, function(err) {
            if (err) {
                console.error('Error deleting students:', err.message);
                return;
            }
            
            console.log(`\n✅ Successfully deleted ${this.changes} students from the database.`);
            console.log(`Kept ${studentsToKeep.length} students: Ahmed Zaher and Saad Samir`);
            
            // Verify the remaining students
            db.all("SELECT id, first_name, last_name, email FROM users WHERE role = 'student'", (err, remainingRows) => {
                if (err) {
                    console.error('Error fetching remaining students:', err.message);
                    return;
                }
                
                console.log('\nRemaining students in database:');
                remainingRows.forEach(row => {
                    console.log(`- ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.id}`);
                });
                
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('\n✅ Database cleanup completed successfully!');
                    }
                });
            });
        });
    });
}

// Run the cleanup
cleanupStudents();
