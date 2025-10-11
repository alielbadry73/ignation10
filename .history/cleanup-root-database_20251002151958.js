const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the root database (what the server uses)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening root database:', err.message);
        return;
    }
    console.log('Connected to the root database.');
});

// Delete all trial students (IDs 2-6)
const deleteStudents = `
    DELETE FROM users WHERE id IN (2, 3, 4, 5, 6)
`;

db.run(deleteStudents, function(err) {
    if (err) {
        console.error('Error deleting trial students:', err.message);
        return;
    }
    console.log(`Deleted ${this.changes} trial students`);
    
    // Add Ahmed Zaher and Saad Samir
    const insertStudents = `
        INSERT INTO users (id, first_name, last_name, email, password, phone, parent_phone, role, points, created_at) VALUES
        (7, 'ahmed zaher', 'ahmed zaher', 'salmaahmed76@icloud.com', '$2a$10$1hPbdO6QgP9Vp1GXtUQX7.SbFyE38RwrD/fhP6zrL55krPquvERem', '01234567890', '01234567890', 'student', 2850, datetime('now')),
        (8, 'saad samir', 'saad samir', 'saadsamir2006@gmail.com', '$2a$10$1hPbdO6QgP9Vp1GXtUQX7.SbFyE38RwrD/fhP6zrL55krPquvERem', '01234567891', '01234567891', 'student', 2640, datetime('now'))
    `;
    
    db.run(insertStudents, function(err) {
        if (err) {
            console.error('Error inserting students:', err.message);
            return;
        }
        console.log(`Inserted ${this.changes} students`);
        
        // Verify the changes
        db.all("SELECT id, first_name, last_name, email, points FROM users WHERE role = 'student'", (err, rows) => {
            if (err) {
                console.error('Error fetching students:', err.message);
                return;
            }
            
            console.log('Current students after cleanup:');
            rows.forEach(row => {
                console.log(`ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, Points: ${row.points}`);
            });
            
            db.close();
        });
    });
});
