const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the root database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening root database:', err.message);
        return;
    }
    console.log('Connected to the root database.');
});

// Add Ahmed Zaher and Saad Samir with correct column names
const insertStudents = `
    INSERT INTO users (id, first_name, last_name, email, password, phone, role, is_active, points, created_at) VALUES
    (7, 'ahmed zaher', 'ahmed zaher', 'salmaahmed76@icloud.com', '$2a$10$1hPbdO6QgP9Vp1GXtUQX7.SbFyE38RwrD/fhP6zrL55krPquvERem', '01234567890', 'student', 1, 2850, datetime('now')),
    (8, 'saad samir', 'saad samir', 'saadsamir2006@gmail.com', '$2a$10$1hPbdO6QgP9Vp1GXtUQX7.SbFyE38RwrD/fhP6zrL55krPquvERem', '01234567891', 'student', 1, 2640, datetime('now'))
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
        
        console.log('Current students after adding:');
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, Points: ${row.points}`);
        });
        
        db.close();
    });
});
