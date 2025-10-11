const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testPhoneRegistration() {
    console.log('🧪 TESTING REGISTRATION WITH PHONE DATA');
    console.log('========================================\n');
    
    const testData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'johndoe@example.com',
        password: 'password123',
        phone: '01012345678',
        parent_phone: '01234567890',
        userType: 'student'
    };
    
    console.log('Testing registration with phone data:', testData);
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            console.log('✅ Registration successful!');
            console.log('   User ID:', data.user.id);
            console.log('   Phone saved:', data.user.phone);
            console.log('   Parent phone saved:', data.user.parent_phone);
            
            // Verify the data was saved in the database
            console.log('\n🔍 Verifying database storage...');
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database('./backend/database.sqlite');
            
            db.get('SELECT * FROM students WHERE id = ?', [data.user.id], (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                } else if (row) {
                    console.log('✅ Database verification successful:');
                    console.log('   Phone:', row.phone);
                    console.log('   Parent Phone:', row.parent_phone);
                } else {
                    console.log('❌ Student not found in database');
                }
                db.close();
            });
            
        } else {
            console.log('❌ Registration failed:', data.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testPhoneRegistration();
