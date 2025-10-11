const https = require('https');
const http = require('http');

async function testLogin() {
    try {
        console.log('Testing login...');
        
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identifier: 'cybernight@gmail.com',
                password: 'password123'
            })
        });
        
        const result = await response.json();
        console.log('Login response:', result);
        
        if (result.success && result.token) {
            console.log('✅ Login successful!');
            
            // Test my-enrollments endpoint
            console.log('Testing my-enrollments endpoint...');
            const enrollmentsResponse = await fetch('http://localhost:3000/api/my-enrollments', {
                headers: {
                    'Authorization': `Bearer ${result.token}`
                }
            });
            
            const enrollmentsResult = await enrollmentsResponse.json();
            console.log('Enrollments response:', enrollmentsResult);
            
            if (enrollmentsResult.success) {
                console.log('✅ Enrollments fetched successfully!');
                console.log('User has', enrollmentsResult.enrollments.length, 'enrollments');
            } else {
                console.log('❌ Failed to fetch enrollments:', enrollmentsResult.message);
            }
        } else {
            console.log('❌ Login failed:', result.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLogin();
