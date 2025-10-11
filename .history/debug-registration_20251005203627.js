const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugRegistration() {
    console.log('🔍 DEBUGGING REGISTRATION 400 ERROR');
    console.log('=====================================\n');
    
    // Test with the same data that's likely being sent
    const testData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'testuser2@example.com',
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
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
            console.log('❌ Registration failed with status:', response.status);
            console.log('Error message:', data.message);
            console.log('Full error response:', data);
        } else {
            console.log('✅ Registration successful');
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

debugRegistration();
