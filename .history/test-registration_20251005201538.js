const fetch = require('node-fetch');

async function testRegistration() {
    console.log('🧪 TESTING REGISTRATION API');
    console.log('============================\n');
    
    const testData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        password: 'password123',
        userType: 'student'
    };
    
    console.log('Sending registration request with data:', testData);
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.text();
        console.log('Response body:', data);
        
        try {
            const jsonData = JSON.parse(data);
            console.log('Parsed JSON:', jsonData);
        } catch (e) {
            console.log('Response is not valid JSON');
        }
        
    } catch (error) {
        console.error('Request failed:', error.message);
    }
}

testRegistration();
