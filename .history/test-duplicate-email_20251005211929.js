const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDuplicateEmail() {
    console.log('🧪 TESTING DUPLICATE EMAIL FUNCTIONALITY');
    console.log('========================================\n');

    const testEmail = 'test@example.com';
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
    try {
        const response1 = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });

        const data1 = await response1.json();
        console.log('Response status:', response1.status);
        console.log('Response data:', data1);

        if (response1.ok && data1.success) {
            console.log('✅ First registration successful');
        } else {
            console.log('❌ First registration failed:', data1.message);
        }
    } catch (error) {
        console.error('❌ Error in first registration:', error.message);
    }

    console.log('\n2. Second registration attempt (duplicate email)...');
    try {
        const response2 = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });

        const data2 = await response2.json();
        console.log('Response status:', response2.status);
        console.log('Response data:', data2);

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

    console.log('\n📋 FRONTEND BEHAVIOR:');
    console.log('When a user tries to register with an existing email:');
    console.log('1. Backend returns: "This email address is already registered. Please use the login form instead."');
    console.log('2. Frontend shows warning toast with the message');
    console.log('3. Registration modal closes automatically');
    console.log('4. Login modal opens after 1 second');
    console.log('5. Email field is pre-filled in login form');
    console.log('6. User can also click "Login here" link in registration modal');
}

testDuplicateEmail();
