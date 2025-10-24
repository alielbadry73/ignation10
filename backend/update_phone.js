const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

const phoneNumber = '+1234567890'; // You can change this to your actual phone number

console.log('Updating phone number for Ali Elbadry...');

db.run(
    'UPDATE users SET phone = ? WHERE email = ?',
    [phoneNumber, 'alielbadry279@gmail.com'],
    function(err) {
        if (err) {
            console.error('Error updating phone number:', err);
        } else {
            console.log(`✅ Phone number updated successfully!`);
            console.log(`Email: alielbadry279@gmail.com`);
            console.log(`Phone: ${phoneNumber}`);
            console.log(`Rows affected: ${this.changes}`);
        }
        db.close();
    }
);

































