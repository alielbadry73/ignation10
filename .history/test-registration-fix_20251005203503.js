const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRegistrationFix() {
    console.log('🧪 TESTING REGISTRATION FIX');
    console.log('===========================\n');
    
    const testData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'testuser@example.com',
        password: 'password123',
        userType: 'student'
    };
    
    console.log('Testing registration with data:', testData);
    
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
            
            // Check if user object exists
            if (data.user) {
                console.log('✅ User object present in response');
                console.log('   User ID:', data.user.id);
                console.log('   First Name:', data.user.first_name);
                console.log('   Last Name:', data.user.last_name);
                console.log('   Email:', data.user.email);
                console.log('   Token present:', !!data.token);
            } else {
                console.log('❌ User object missing from response');
            }
        } else {
            console.log('❌ Registration failed:', data.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRegistrationFix();
