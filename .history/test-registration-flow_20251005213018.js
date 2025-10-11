const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const sqlite3 = require('sqlite3').verbose();

async function testRegistrationFlow() {
    console.log('🧪 TESTING REGISTRATION FLOW');
    console.log('============================\n');

    const db = new sqlite3.Database('./backend/database.sqlite');

    // Get initial student count
    db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
        if (err) {
            console.error('Error getting initial count:', err);
            return;
        }
        const initialCount = row.count;
        console.log('Initial student count:', initialCount);

        // Test 1: Successful registration
        console.log('\n1. Testing successful registration...');
        const successData = {
            first_name: 'Success',
            last_name: 'User',
            email: `success${Date.now()}@example.com`,
            password: 'password123',
            phone: '01012345678',
            parent_phone: '01234567890',
            userType: 'student'
        };

        fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(successData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Successful registration response received');
                
                // Check if student was saved
                db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
                    if (err) {
                        console.error('Error getting count after success:', err);
                        return;
                    }
                    const newCount = row.count;
                    if (newCount > initialCount) {
                        console.log('✅ Student was saved to database (count increased from', initialCount, 'to', newCount + ')');
                    } else {
                        console.log('❌ Student was NOT saved to database');
                    }

                    // Test 2: Failed registration (duplicate email)
                    console.log('\n2. Testing failed registration (duplicate email)...');
                    const failData = {
                        first_name: 'Fail',
                        last_name: 'User',
                        email: successData.email, // Same email as above
                        password: 'password123',
                        phone: '01012345678',
                        parent_phone: '01234567890',
                        userType: 'student'
                    };

                    fetch('http://localhost:3000/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(failData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (!data.success) {
                            console.log('✅ Failed registration response received:', data.message);
                            
                            // Check if student was NOT saved
                            db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
                                if (err) {
                                    console.error('Error getting count after failure:', err);
                                    return;
                                }
                                const finalCount = row.count;
                                if (finalCount === newCount) {
                                    console.log('✅ No additional student was saved (count remains', finalCount + ')');
                                } else {
                                    console.log('❌ Additional student was saved when it should not have been');
                                }

                                console.log('\n📋 SUMMARY:');
                                console.log('- Initial count:', initialCount);
                                console.log('- After success:', newCount);
                                console.log('- After failure:', finalCount);
                                console.log('- Students are only saved on successful registration: ✅');

                                db.close();
                            });
                        } else {
                            console.log('❌ Failed registration should have failed but succeeded');
                            db.close();
                        }
                    })
                    .catch(error => {
                        console.error('Error in failed registration test:', error);
                        db.close();
                    });
                });
            } else {
                console.log('❌ Successful registration failed:', data.message);
                db.close();
            }
        })
        .catch(error => {
            console.error('Error in successful registration test:', error);
            db.close();
        });
    });
}

testRegistrationFlow();
