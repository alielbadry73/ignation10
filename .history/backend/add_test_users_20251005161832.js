const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

// Add test student user
db.run(
    `INSERT OR REPLACE INTO students (id, username, email, password, full_name) VALUES (1, 'test@example.com', 'test@example.com', 'password123', 'Test Student')`,
    function(err) {
        if (err) {
            console.error('Error creating test student:', err);
        } else {
            console.log('✅ Test student user created successfully!');
            console.log('Username: test@example.com');
            console.log('Password: password123');
        }
    }
);

// Add test teacher user
db.run(
    `INSERT OR REPLACE INTO teachers (id, username, email, password, full_name) VALUES (1, 'teacher@example.com', 'teacher@example.com', 'password123', 'Test Teacher')`,
    function(err) {
        if (err) {
            console.error('Error creating test teacher:', err);
        } else {
            console.log('✅ Test teacher user created successfully!');
            console.log('Username: teacher@example.com');
            console.log('Password: password123');
        }
        
        db.close();
    }
);



