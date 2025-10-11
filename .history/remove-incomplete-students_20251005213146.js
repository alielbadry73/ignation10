const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('🧹 REMOVING INCOMPLETE STUDENT REGISTRATIONS');
console.log('===========================================\n');

// Get incomplete students (missing phone or parent_phone)
db.all('SELECT id, username, email, first_name, last_name, phone, parent_phone FROM students WHERE phone IS NULL OR parent_phone IS NULL', (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    if (rows.length === 0) {
        console.log('✅ No incomplete registrations found');
        db.close();
        return;
    }

    console.log(`Found ${rows.length} incomplete registrations to remove:`);
    rows.forEach(student => {
        console.log(`  ID ${student.id}: ${student.email} (${student.first_name} ${student.last_name})`);
    });

    // Remove incomplete students
    const incompleteIds = rows.map(student => student.id);
    const placeholders = incompleteIds.map(() => '?').join(',');
    
    db.run(`DELETE FROM students WHERE id IN (${placeholders})`, incompleteIds, function(err) {
        if (err) {
            console.error('Error removing incomplete students:', err);
        } else {
            console.log(`\n✅ Successfully removed ${this.changes} incomplete student registrations`);
            
            // Get updated count
            db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
                if (err) {
                    console.error('Error getting updated count:', err);
                } else {
                    console.log(`📊 Remaining students: ${row.count}`);
                }
                db.close();
            });
        }
    });
});
