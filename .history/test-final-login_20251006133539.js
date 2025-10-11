const http = require('http');

function testFinalLogin() {
    const postData = JSON.stringify({
        email: 'testuser123@example.com',
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
    
    console.log('Testing final login...');
    
    const req = http.request(options, (res) => {
        console.log('Login response status:', res.statusCode);
        
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log('Login response:', responseData);
            try {
                const result = JSON.parse(responseData);
                if (result.success && result.token) {
                    console.log('✅ Login successful!');
                    console.log('Token:', result.token.substring(0, 20) + '...');
                    testEnrollmentsFinal(result.token);
                } else {
                    console.log('❌ Login failed:', result.message);
                }
            } catch (e) {
                console.log('Failed to parse login JSON:', e.message);
            }
        });
    });
    
    req.on('error', (e) => {
        console.error('Login request error:', e.message);
    });
    
    req.write(postData);
    req.end();
}

function testEnrollmentsFinal(token) {
    console.log('Testing enrollments endpoint...');
    
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
                    if (result.enrollments.length === 0) {
                        console.log('🎯 This user should be redirected to home.html (no enrollments)');
                        console.log('✅ All systems working! Login redirect should work now.');
                    } else {
                        console.log('🎯 This user should be redirected to test-dashboard.html (has enrollments)');
                    }
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

testFinalLogin();
