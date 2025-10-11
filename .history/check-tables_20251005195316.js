const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    console.log('📋 CHECKING DATABASE TABLES');
    console.log('============================\n');
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('Error getting tables:', err.message);
            return;
        }
        
        console.log('Available tables:');
        tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table.name}`);
        });
        
        console.log(`\nTotal: ${tables.length} tables`);
        db.close();
    });
});
