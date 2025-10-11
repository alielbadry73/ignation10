const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Adding profile columns to users table...\n');

// Check existing columns
db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
        console.error('Error checking table:', err);
        db.close();
        return;
    }
    
    const columnNames = columns.map(col => col.name);
    console.log('Existing columns:', columnNames);
    
    const columnsToAdd = [
        { name: 'country', type: 'TEXT' },
        { name: 'date_of_birth', type: 'TEXT' },
        { name: 'avatar', type: 'TEXT' },
        { name: 'points', type: 'INTEGER DEFAULT 0' },
        { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    let addedCount = 0;
    
    function addColumn(index) {
        if (index >= columnsToAdd.length) {
            console.log(`\n✅ Migration complete! Added ${addedCount} new column(s).`);
            db.close();
            return;
        }
        
        const col = columnsToAdd[index];
        
        if (columnNames.includes(col.name)) {
            console.log(`⏭️  Column '${col.name}' already exists, skipping...`);
            addColumn(index + 1);
        } else {
            db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`, (err) => {
                if (err) {
                    console.error(`❌ Error adding column '${col.name}':`, err.message);
                } else {
                    console.log(`✅ Added column '${col.name}'`);
                    addedCount++;
                }
                addColumn(index + 1);
            });
        }
    }
    
    addColumn(0);
});

