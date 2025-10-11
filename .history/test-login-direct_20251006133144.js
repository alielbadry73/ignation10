const http = require('http');

function testLogin() {
    const postData = JSON.stringify({
        email: 'cybernight@gmail.com',
        password: 'password123'
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    console.log('Sending request:', options);
    console.log('Body:', postData);
    
    const req = http.request(options, (res) => {
        console.log('Response status:', res.statusCode);
        console.log('Response headers:', res.headers);
        
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:', responseData);
            try {
                const result = JSON.parse(responseData);
                console.log('Parsed response:', result);
                
                if (result.success && result.token) {
                    console.log('✅ Login successful!');
                    testEnrollments(result.token);
                } else {
                    console.log('❌ Login failed:', result.message);
                }
            } catch (e) {
                console.log('Failed to parse JSON:', e.message);
            }
        });
    });
    
    req.on('error', (e) => {
        console.error('Request error:', e.message);
    });
    
    req.write(postData);
    req.end();
}

function testEnrollments(token) {
    console.log('Testing enrollments with token:', token.substring(0, 20) + '...');
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/my-enrollments',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
    
    const req = http.request(options, (res) => {
        console.log('Enrollments response status:', res.statusCode);
        
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log('Enrollments response:', responseData);
            try {
                const result = JSON.parse(responseData);
                if (result.success) {
                    console.log('✅ Enrollments fetched successfully!');
                    console.log('User has', result.enrollments.length, 'enrollments');
                } else {
                    console.log('❌ Failed to fetch enrollments:', result.message);
                }
            } catch (e) {
                console.log('Failed to parse enrollments JSON:', e.message);
            }
        });
    });
    
    req.on('error', (e) => {
        console.error('Enrollments request error:', e.message);
    });
    
    req.end();
}

testLogin();
