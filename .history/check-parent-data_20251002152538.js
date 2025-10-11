const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the root database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the database.');
});

// Check parents table
db.all("SELECT * FROM parents", (err, rows) => {
    if (err) {
        console.error('Error fetching parents:', err.message);
        return;
    }
    
    console.log('Parents table data:');
    if (rows.length > 0) {
        console.log('Columns:', Object.keys(rows[0]));
        console.log('Data:', JSON.stringify(rows, null, 2));
    } else {
        console.log('No parents found');
    }
    
    // Check student_parents table
    db.all("SELECT * FROM student_parents", (err, studentParentRows) => {
        if (err) {
            console.error('Error fetching student_parents:', err.message);
            return;
        }
        
        console.log('\nStudent_parents table data:');
        if (studentParentRows.length > 0) {
            console.log('Columns:', Object.keys(studentParentRows[0]));
            console.log('Data:', JSON.stringify(studentParentRows, null, 2));
        } else {
            console.log('No student_parent relationships found');
        }
        
        db.close();
    });
});
