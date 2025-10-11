const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRegistration() {
    console.log('🧪 TESTING REGISTRATION API');
    console.log('============================\n');
    
    const testData = {
        first_name: 'Ali',
        last_name: 'Elbadry',
        email: 'alielbadry279@gmail.com',
        password: 'assadamgad12!A',
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
