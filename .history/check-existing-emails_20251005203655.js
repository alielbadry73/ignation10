const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 CHECKING EXISTING EMAILS IN DATABASE');
console.log('=======================================\n');

// Check students table
db.all("SELECT id, email, first_name, last_name, full_name FROM students", (err, rows) => {
    if (err) {
        console.error('Error querying students:', err);
        return;
    }
    
    console.log('Students in database:');
    console.log('====================');
    if (rows.length === 0) {
        console.log('No students found');
    } else {
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Email: ${row.email}, Name: ${row.first_name} ${row.last_name} (${row.full_name})`);
        });
    }
    
    console.log('\nTotal students:', rows.length);
    
    // Check for common test emails
    const testEmails = ['alielbadry279@gmail.com', 'testuser@example.com', 'testuser2@example.com'];
    console.log('\nChecking for common test emails:');
    testEmails.forEach(email => {
        const found = rows.find(row => row.email === email);
        if (found) {
            console.log(`✅ Found: ${email} (ID: ${found.id})`);
        } else {
            console.log(`❌ Not found: ${email}`);
        }
    });
    
    db.close();
});
