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

// Add points column to users table
db.run("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0", (err) => {
    if (err) {
        console.error('Error adding points column:', err.message);
    } else {
        console.log('Successfully added points column to users table');
        
        // Now add points to students
        const students = [
            { id: 7, name: 'Ahmed Zaher', points: 2850 },
            { id: 8, name: 'Saad Samir', points: 2640 }
        ];
        
        let completed = 0;
        students.forEach(student => {
            const updateQuery = `UPDATE users SET points = ? WHERE id = ?`;
            
            db.run(updateQuery, [student.points, student.id], function(err) {
                if (err) {
                    console.error(`Error updating ${student.name}:`, err.message);
                } else {
                    console.log(`Updated ${student.name} with ${student.points} points`);
                }
                
                completed++;
                if (completed === students.length) {
                    // Verify the updates
                    db.all("SELECT id, first_name, last_name, points FROM users WHERE role = 'student'", (err, rows) => {
                        if (err) {
                            console.error('Error fetching students:', err.message);
                        } else {
                            console.log('\nUpdated students:');
                            rows.forEach(row => {
                                console.log(`${row.first_name} ${row.last_name}: ${row.points} points`);
                            });
                        }
                        db.close();
                    });
                }
            });
        });
    }
});
