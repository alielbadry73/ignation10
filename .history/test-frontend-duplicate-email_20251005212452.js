const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFrontendDuplicateEmail() {
    console.log('🧪 TESTING FRONTEND DUPLICATE EMAIL HANDLING');
    console.log('============================================\n');

    // Use a known existing email
    const existingEmail = 'alielbadry279@gmail.com';
    
    const registrationData = {
        first_name: 'Test',
        last_name: 'User',
        email: existingEmail,
        password: 'password123',
        phone: '01012345678',
        parent_phone: '01234567890',
        userType: 'student'
    };

    console.log('Testing registration with existing email:', existingEmail);
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', data);

        if (!response.ok && data.message.includes('already registered')) {
            console.log('✅ Backend correctly returns duplicate email message');
            console.log('   Message:', data.message);
            console.log('\n📋 FRONTEND SHOULD NOW:');
            console.log('1. Show warning toast: "This email address is already registered. Please use the login form instead."');
            console.log('2. Close registration modal');
            console.log('3. Open login modal after 1 second');
            console.log('4. Pre-fill email field in login form');
        } else {
            console.log('❌ Backend response not as expected');
            console.log('   Response:', data);
        }
    } catch (error) {
        console.error('❌ Error during registration:', error.message);
    }
}

testFrontendDuplicateEmail();
