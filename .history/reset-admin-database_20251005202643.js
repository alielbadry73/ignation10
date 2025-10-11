const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔄 RESETTING ADMIN PANEL AND DATABASE');
    console.log('=====================================\n');
    
    // List of all tables to clear (in order to respect foreign key constraints)
    const tablesToClear = [
        'order_items',
        'orders', 
        'enrollments',
        'password_resets',
        'assignment_submissions',
        'quiz_submissions',
        'student_progress',
        'student_parents',
        'parent_followup_settings',
        'mathematics_data',
        'physics_data',
        'chemistry_data',
        'teacher_lectures',
        'teacher_assignments',
        'teacher_exams',
        'teacher_quizzes',
        'lectures',
        'assistants',
        'parents',
        'students',
        'teachers'
    ];
    
    let completed = 0;
    
    function clearTable(tableName) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM ${tableName}`, function(err) {
                if (err) {
                    console.error(`❌ Error clearing ${tableName}:`, err.message);
                    reject(err);
                } else {
                    console.log(`✅ Cleared ${tableName} (${this.changes} rows deleted)`);
                    resolve();
                }
            });
        });
    }
    
    function resetSequence(tableName) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM sqlite_sequence WHERE name="${tableName}"`, function(err) {
                if (err) {
                    // Table might not have auto-increment, that's okay
                    resolve();
                } else {
                    console.log(`✅ Reset ${tableName} auto-increment counter`);
                    resolve();
                }
            });
        });
    }
    
    // Clear all tables and reset sequences
    async function clearAllTables() {
        try {
            // Clear all data tables
            for (const table of tablesToClear) {
                await clearTable(table);
            }
            
            // Reset auto-increment sequences
            for (const table of tablesToClear) {
                await resetSequence(table);
            }
            
            console.log('\n🎉 ADMIN PANEL AND DATABASE RESET COMPLETE!');
            console.log('==========================================');
            console.log('✅ All students cleared');
            console.log('✅ All teachers cleared');
            console.log('✅ All orders cleared');
            console.log('✅ All enrollments cleared');
            console.log('✅ All lectures cleared');
            console.log('✅ All assignments cleared');
            console.log('✅ All progress data cleared');
            console.log('✅ All auto-increment counters reset');
            console.log('\n📊 Admin user and courses preserved');
            console.log('🔗 Admin login: admin@igway.com / admin123');
            console.log('\nThe admin panel is now clean and ready to use!');
            
        } catch (error) {
            console.error('❌ Error during reset:', error);
        } finally {
            db.close();
        }
    }
    
    clearAllTables();
});
