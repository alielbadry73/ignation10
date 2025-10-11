const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDuplicateEmail() {
    console.log('🔍 TESTING DUPLICATE EMAIL ERROR');
    console.log('=================================\n');
    
    // Test with an email that already exists
    const testData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'testuser2@example.com', // This email was just registered
        password: 'password123',
        userType: 'student'
    };
    
    console.log('Testing registration with existing email:', testData.email);
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
            console.log('❌ Registration failed with status:', response.status);
            console.log('Error message:', data.message);
        } else {
            console.log('✅ Registration successful');
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testDuplicateEmail();
