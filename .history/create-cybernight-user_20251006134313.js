const http = require('http');

function createCybernightUser() {
    const postData = JSON.stringify({
        email: 'cybernight@gmail.com',
        password: 'password123',
        first_name: 'Cyber',
        last_name: 'Knight',
        phone: '01240450814',
        parent_phone: '01234567890',
        userType: 'student'
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    console.log('Creating cybernight user...');
    console.log('Body:', postData);
    
    const req = http.request(options, (res) => {
        console.log('Response status:', res.statusCode);
        
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:', responseData);
            try {
                const result = JSON.parse(responseData);
                if (result.success) {
                    console.log('✅ User created successfully!');
                    console.log('User ID:', result.user.id);
                    console.log('Email:', result.user.email);
                    console.log('Password: password123');
                    testCybernightLogin();
                } else {
                    console.log('❌ Registration failed:', result.message);
                    // If user already exists, try login
                    if (result.message.includes('already registered')) {
                        console.log('User already exists, testing login...');
                        testCybernightLogin();
                    }
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

function testCybernightLogin() {
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
    
    console.log('\nTesting cybernight login...');
    
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
                    testEnrollments(result.token);
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

function testEnrollments(token) {
    console.log('Testing enrollments...');
    
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
                        console.log('✅ All systems working! The user can now login and will be redirected correctly.');
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

createCybernightUser();
