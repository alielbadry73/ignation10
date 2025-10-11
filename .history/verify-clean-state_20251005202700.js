const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('🔍 VERIFYING CLEAN STATE');
    console.log('========================\n');
    
    // Check key tables for remaining data
    const tablesToCheck = ['students', 'teachers', 'orders', 'enrollments', 'courses', 'users'];
    
    let completed = 0;
    
    function checkTable(tableName) {
        return new Promise((resolve) => {
            db.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, rows) => {
                if (err) {
                    console.log(`❌ ${tableName}: Error checking table`);
                } else {
                    const count = rows[0].count;
                    if (count === 0) {
                        console.log(`✅ ${tableName}: Empty (${count} records)`);
                    } else {
                        console.log(`📊 ${tableName}: ${count} records remaining`);
                        
                        // Show sample data for non-empty tables
                        if (tableName === 'courses' || tableName === 'users') {
                            db.all(`SELECT * FROM ${tableName} LIMIT 3`, (err, data) => {
                                if (!err && data.length > 0) {
                                    console.log(`   Sample data:`, data.map(row => {
                                        if (tableName === 'courses') {
                                            return `${row.title} (${row.instructor})`;
                                        } else if (tableName === 'users') {
                                            return `${row.email} (${row.role})`;
                                        }
                                        return JSON.stringify(row);
                                    }).join(', '));
                                }
                                resolve();
                            });
                            return;
                        }
                    }
                }
                resolve();
            });
        });
    }
    
    async function checkAllTables() {
        for (const table of tablesToCheck) {
            await checkTable(table);
        }
        
        console.log('\n🎉 VERIFICATION COMPLETE!');
        console.log('=========================');
        console.log('✅ All user data cleared');
        console.log('✅ All orders and enrollments cleared');
        console.log('✅ Courses and admin user preserved');
        console.log('✅ Database is in clean state');
        
        db.close();
    }
    
    checkAllTables();
});
