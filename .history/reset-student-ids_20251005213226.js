const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('🔄 RESETTING STUDENT ID AUTO-INCREMENT');
console.log('=====================================\n');

// Get current max ID
db.get('SELECT MAX(id) as maxId FROM students', (err, row) => {
    if (err) {
        console.error('Error getting max ID:', err);
        return;
    }

    const maxId = row.maxId || 0;
    console.log(`Current max student ID: ${maxId}`);

    // Reset the auto-increment counter
    db.run('DELETE FROM sqlite_sequence WHERE name="students"', (err) => {
        if (err) {
            console.error('Error deleting sequence:', err);
            return;
        }

        // Set the sequence to the current max ID
        db.run('INSERT INTO sqlite_sequence (name, seq) VALUES ("students", ?)', [maxId], (err) => {
            if (err) {
                console.error('Error setting sequence:', err);
            } else {
                console.log(`✅ Auto-increment counter reset to ${maxId}`);
                console.log('Next student will have ID:', maxId + 1);
            }
            db.close();
        });
    });
});
