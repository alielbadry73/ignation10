const http = require('http');

function debugLogin(email, password) {
    const postData = JSON.stringify({
        email: email,
        password: password
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
    
    console.log(`Testing login for: ${email}`);
    console.log('Request body:', postData);
    
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
                
                if (result.success) {
                    console.log('✅ Login successful!');
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

// Test with the working user first
console.log('=== Testing with working user ===');
debugLogin('testuser123@example.com', 'password123');

setTimeout(() => {
    console.log('\n=== Testing with cybernight user ===');
    debugLogin('cybernight@gmail.com', 'password123');
}, 2000);
