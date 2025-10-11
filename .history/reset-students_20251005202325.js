const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔄 RESETTING STUDENTS SECTION');
    console.log('==============================\n');
    
    // Delete all students
    db.run('DELETE FROM students', function(err) {
        if (err) {
            console.error('❌ Error deleting students:', err.message);
            return;
        }
        
        console.log(`✅ Deleted ${this.changes} students from database`);
        
        // Reset the auto-increment counter
        db.run('DELETE FROM sqlite_sequence WHERE name="students"', (err) => {
            if (err) {
                console.error('❌ Error resetting sequence:', err.message);
            } else {
                console.log('✅ Reset students table auto-increment counter');
            }
            
            // Also clear any related data
            const relatedTables = ['enrollments', 'orders', 'order_items', 'student_progress', 'student_parents'];
            let completed = 0;
            
            if (relatedTables.length === 0) {
                console.log('\n🎉 STUDENTS SECTION RESET COMPLETE!');
                console.log('=====================================');
                console.log('✅ All students deleted');
                console.log('✅ Auto-increment counter reset');
                console.log('✅ Ready for fresh registrations');
                db.close();
                return;
            }
            
            relatedTables.forEach(table => {
                db.run(`DELETE FROM ${table}`, function(err) {
                    if (err) {
                        console.error(`❌ Error clearing ${table}:`, err.message);
                    } else {
                        console.log(`✅ Cleared ${table} (${this.changes} rows)`);
                    }
                    
                    completed++;
                    if (completed === relatedTables.length) {
                        console.log('\n🎉 STUDENTS SECTION RESET COMPLETE!');
                        console.log('=====================================');
                        console.log('✅ All students deleted');
                        console.log('✅ All enrollments cleared');
                        console.log('✅ All orders cleared');
                        console.log('✅ All student progress cleared');
                        console.log('✅ Auto-increment counter reset');
                        console.log('✅ Ready for fresh registrations');
                        db.close();
                    }
                });
            });
        });
    });
});
