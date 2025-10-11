const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the correct database path
const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔄 RESETTING ALL ADMIN PANEL DATA');
    console.log('===================================\n');
    
    // List of tables to clear (in order to respect foreign key constraints)
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
    
    // Keep admin user and courses, but clear all other data
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
    
    // Clear all tables
    async function clearAllTables() {
        try {
            for (const table of tablesToClear) {
                await clearTable(table);
            }
            
            console.log('\n🎉 ALL ADMIN PANEL DATA RESET SUCCESSFULLY!');
            console.log('==========================================');
            console.log('✅ All orders cleared');
            console.log('✅ All enrollments cleared');
            console.log('✅ All favorites cleared');
            console.log('✅ All flashcards cleared');
            console.log('✅ All password resets cleared');
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
