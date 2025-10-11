const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./backend/database.sqlite');

console.log('Force creating cybernight user...');

const email = 'cybernight@gmail.com';
const password = 'password123';
const firstName = 'Cyber';
const lastName = 'Knight';
const phone = '01240450814';
const parentPhone = '01234567890';

// First, let's check if there are any constraints
db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) {
        console.error('Error checking users table schema:', err);
        return;
    }
    
    console.log('Users table schema:');
    columns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Hash the password
    bcrypt.hash(password, 10, (hashErr, hash) => {
        if (hashErr) {
            console.error('Error hashing password:', hashErr);
            return;
        }
        
        console.log('Password hashed successfully');
        
        // Try to insert the user
        const sql = `INSERT INTO users (email, password, first_name, last_name, phone, parent_phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [email, hash, firstName, lastName, phone, parentPhone, 'student'];
        
        console.log('Attempting to insert user...');
        console.log('SQL:', sql);
        console.log('Params:', params.map(p => p === hash ? '[HASH]' : p));
        
        db.run(sql, params, function(insertErr) {
            if (insertErr) {
                console.error('Error inserting user:', insertErr);
                console.error('Error code:', insertErr.code);
                console.error('Error message:', insertErr.message);
                
                // If it's a constraint error, let's see what's causing it
                if (insertErr.code === 'SQLITE_CONSTRAINT') {
                    console.log('\nChecking for existing users with similar data...');
                    
                    // Check for email conflicts
                    db.all('SELECT * FROM users WHERE email = ?', [email], (err2, rows) => {
                        if (err2) {
                            console.error('Error checking for email conflicts:', err2);
                        } else {
                            console.log('Users with same email:', rows.length);
                            rows.forEach(row => console.log(row));
                        }
                        
                        db.close();
                    });
                } else {
                    db.close();
                }
            } else {
                console.log('✅ User created successfully!');
                console.log('User ID:', this.lastID);
                console.log('Email:', email);
                console.log('Password:', password);
                
                db.close();
            }
        });
    });
});
