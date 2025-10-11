const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDuplicateEmailDetailed() {
    console.log('🧪 TESTING DUPLICATE EMAIL FUNCTIONALITY (DETAILED)');
    console.log('==================================================\n');

    // Use a unique email with timestamp
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    const registrationData = {
        first_name: 'Test',
        last_name: 'User',
        email: testEmail,
        password: 'password123',
        phone: '01012345678',
        parent_phone: '01234567890',
        userType: 'student'
    };

    console.log('1. First registration attempt...');
    console.log('   Email:', testEmail);
    
    try {
        const response1 = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });

        const data1 = await response1.json();
        console.log('   Response status:', response1.status);
        console.log('   Response data:', data1);

        if (response1.ok && data1.success) {
            console.log('✅ First registration successful');
            
            console.log('\n2. Second registration attempt (duplicate email)...');
            console.log('   Email:', testEmail);
            
            try {
                const response2 = await fetch('http://localhost:3000/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(registrationData)
                });

                const data2 = await response2.json();
                console.log('   Response status:', response2.status);
                console.log('   Response data:', data2);

                if (!response2.ok && data2.message.includes('already registered')) {
                    console.log('✅ Duplicate email detection working correctly');
                    console.log('   Error message:', data2.message);
                } else {
                    console.log('❌ Duplicate email detection not working as expected');
                    console.log('   Response:', data2);
                }
            } catch (error) {
                console.error('❌ Error in second registration:', error.message);
            }
        } else {
            console.log('❌ First registration failed:', data1.message);
        }
    } catch (error) {
        console.error('❌ Error in first registration:', error.message);
    }

    console.log('\n📋 EXPECTED BEHAVIOR:');
    console.log('1. First registration: SUCCESS');
    console.log('2. Second registration: FAIL with "This email address is already registered. Please use the login form instead."');
    console.log('3. Frontend automatically opens login modal with pre-filled email');
}

testDuplicateEmailDetailed();
