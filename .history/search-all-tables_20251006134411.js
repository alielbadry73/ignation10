const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('Searching for cybernight user in all tables...');

// Get all table names
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err);
        return;
    }
    
    console.log('Found tables:', tables.map(t => t.name));
    
    let completed = 0;
    const total = tables.length;
    
    tables.forEach(table => {
        // Skip system tables
        if (table.name.startsWith('sqlite_')) {
            completed++;
            if (completed === total) db.close();
            return;
        }
        
        // Check if table has email column
        db.all(`PRAGMA table_info('${table.name}')`, (err2, columns) => {
            if (err2) {
                console.error(`Error checking ${table.name} schema:`, err2);
                completed++;
                if (completed === total) db.close();
                return;
            }
            
            const hasEmail = columns.some(col => col.name.toLowerCase() === 'email');
            
            if (hasEmail) {
                console.log(`\nChecking ${table.name} for cybernight...`);
                db.all(`SELECT * FROM ${table.name} WHERE email LIKE '%cyber%'`, (err3, rows) => {
                    if (err3) {
                        console.error(`Error searching ${table.name}:`, err3);
                    } else {
                        if (rows.length > 0) {
                            console.log(`Found ${rows.length} matches in ${table.name}:`);
                            rows.forEach(row => {
                                console.log({
                                    table: table.name,
                                    id: row.id,
                                    email: row.email,
                                    first_name: row.first_name,
                                    last_name: row.last_name
                                });
                            });
                        } else {
                            console.log(`No cybernight users found in ${table.name}`);
                        }
                    }
                    
                    completed++;
                    if (completed === total) db.close();
                });
            } else {
                completed++;
                if (completed === total) db.close();
            }
        });
    });
});
