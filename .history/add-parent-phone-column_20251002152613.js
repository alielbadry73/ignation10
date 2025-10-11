const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the root database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the database.');
});

// Add parent_phone column to users table
const addColumn = `
    ALTER TABLE users ADD COLUMN parent_phone TEXT
`;

db.run(addColumn, function(err) {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('parent_phone column already exists');
        } else {
            console.error('Error adding parent_phone column:', err.message);
            return;
        }
    } else {
        console.log('parent_phone column added successfully');
    }
    
    // Update existing students with parent phone numbers
    const updateStudents = `
        UPDATE users 
        SET parent_phone = '01234567890' 
        WHERE id = 7 AND parent_phone IS NULL
    `;
    
    db.run(updateStudents, function(err) {
        if (err) {
            console.error('Error updating Ahmed:', err.message);
        } else {
            console.log('Updated Ahmed with parent phone');
        }
        
        const updateSaad = `
            UPDATE users 
            SET parent_phone = '01234567891' 
            WHERE id = 8 AND parent_phone IS NULL
        `;
        
        db.run(updateSaad, function(err) {
            if (err) {
                console.error('Error updating Saad:', err.message);
            } else {
                console.log('Updated Saad with parent phone');
            }
            
            // Verify the changes
            db.all("SELECT id, first_name, last_name, email, phone, parent_phone, points FROM users WHERE role = 'student'", (err, rows) => {
                if (err) {
                    console.error('Error fetching students:', err.message);
                    return;
                }
                
                console.log('\nUpdated student data:');
                rows.forEach(row => {
                    console.log(`ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, Phone: ${row.phone}, Parent Phone: ${row.parent_phone}, Points: ${row.points}`);
                });
                
                db.close();
            });
        });
    });
});
