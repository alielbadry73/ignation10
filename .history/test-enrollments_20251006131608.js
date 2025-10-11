const http = require('http');

// First, let's login to get a token
const loginData = JSON.stringify({
    email: 'test@example.com',
    password: 'test123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
};

console.log('Testing login and enrollments...');

const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`Login Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
            const loginResponse = JSON.parse(data);
            console.log('✅ Login successful');
            
            // Now test enrollments endpoint
            const enrollOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/my-enrollments',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${loginResponse.token}`
                }
            };
            
            const enrollReq = http.request(enrollOptions, (enrollRes) => {
                let enrollData = '';
                
                enrollRes.on('data', (chunk) => {
                    enrollData += chunk;
                });
                
                enrollRes.on('end', () => {
                    console.log(`Enrollments Status: ${enrollRes.statusCode}`);
                    console.log(`Enrollments Response: ${enrollData}`);
                    
                    if (enrollRes.statusCode === 200) {
                        const enrollments = JSON.parse(enrollData);
                        console.log(`✅ Found ${enrollments.length} enrollments`);
                        
                        if (enrollments.length === 0) {
                            console.log('✅ User has no enrollments - should redirect to home.html');
                        } else {
                            console.log('✅ User has enrollments - should redirect to dashboard');
                        }
                    } else {
                        console.log('❌ Enrollments endpoint failed');
                    }
                });
            });
            
            enrollReq.on('error', (e) => {
                console.error(`Enrollments request error: ${e.message}`);
            });
            
            enrollReq.end();
        } else {
            console.log('❌ Login failed');
            console.log(data);
        }
    });
});

loginReq.on('error', (e) => {
    console.error(`Login request error: ${e.message}`);
});

loginReq.write(loginData);
loginReq.end();
