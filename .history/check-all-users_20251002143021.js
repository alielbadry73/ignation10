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

// Check all users in the database
db.all("SELECT id, first_name, last_name, email, phone, role, created_at FROM users ORDER BY id", (err, rows) => {
    if (err) {
        console.error('Error fetching users:', err.message);
        return;
    }
    
    console.log('All users in backend database:');
    console.log('Total count:', rows.length);
    console.log('----------------------------------------');
    
    rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Name: ${row.first_name} ${row.last_name}`);
        console.log(`Email: ${row.email}`);
        console.log(`Phone: ${row.phone || 'N/A'}`);
        console.log(`Role: ${row.role}`);
        console.log(`Created: ${row.created_at}`);
        console.log('----------------------------------------');
    });
    
    // Check specifically for students
    const students = rows.filter(row => row.role === 'student');
    console.log(`\nStudents only (${students.length}):`);
    students.forEach(student => {
        console.log(`- ${student.first_name} ${student.last_name} (${student.email})`);
    });
    
    // Check specifically for teachers
    const teachers = rows.filter(row => row.role === 'teacher');
    console.log(`\nTeachers only (${teachers.length}):`);
    teachers.forEach(teacher => {
        console.log(`- ${teacher.first_name} ${teacher.last_name} (${teacher.email})`);
    });
    
    // Check specifically for admins
    const admins = rows.filter(row => row.role === 'admin');
    console.log(`\nAdmins only (${admins.length}):`);
    admins.forEach(admin => {
        console.log(`- ${admin.first_name} ${admin.last_name} (${admin.email})`);
    });
    
    db.close();
});
