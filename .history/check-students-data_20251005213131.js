const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('🔍 CHECKING STUDENTS DATA');
console.log('========================\n');

// Get all students
db.all('SELECT id, username, email, first_name, last_name, phone, parent_phone, created_at FROM students ORDER BY id', (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log(`Found ${rows.length} students in database:\n`);
    
    rows.forEach(student => {
        console.log(`ID: ${student.id}`);
        console.log(`  Username: ${student.username || 'N/A'}`);
        console.log(`  Email: ${student.email || 'N/A'}`);
        console.log(`  Name: ${student.first_name || 'N/A'} ${student.last_name || 'N/A'}`);
        console.log(`  Phone: ${student.phone || 'N/A'}`);
        console.log(`  Parent Phone: ${student.parent_phone || 'N/A'}`);
        console.log(`  Created: ${student.created_at || 'N/A'}`);
        console.log('  ---');
    });

    // Check for potentially incomplete registrations
    console.log('\n🔍 CHECKING FOR INCOMPLETE REGISTRATIONS:');
    
    const incompleteStudents = rows.filter(student => 
        !student.first_name || 
        !student.last_name || 
        !student.email || 
        !student.phone || 
        !student.parent_phone
    );

    if (incompleteStudents.length > 0) {
        console.log(`Found ${incompleteStudents.length} potentially incomplete registrations:`);
        incompleteStudents.forEach(student => {
            console.log(`  ID ${student.id}: ${student.email} - Missing: ${[
                !student.first_name ? 'first_name' : '',
                !student.last_name ? 'last_name' : '',
                !student.email ? 'email' : '',
                !student.phone ? 'phone' : '',
                !student.parent_phone ? 'parent_phone' : ''
            ].filter(Boolean).join(', ')}`);
        });
    } else {
        console.log('✅ All students have complete registration data');
    }

    db.close();
});
