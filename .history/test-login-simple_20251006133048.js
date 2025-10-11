const http = require('http');

function makeRequest(path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : null;
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: data ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }
        
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function testLogin() {
    try {
        console.log('Testing login...');
        
        const loginResult = await makeRequest('/api/login', {
            identifier: 'cybernight@gmail.com',
            password: 'password123'
        });
        
        console.log('Login response:', loginResult);
        
        if (loginResult.data.success && loginResult.data.token) {
            console.log('✅ Login successful!');
            
            // Test my-enrollments endpoint
            console.log('Testing my-enrollments endpoint...');
            const enrollmentsResult = await makeRequest('/api/my-enrollments', null, loginResult.data.token);
            
            console.log('Enrollments response:', enrollmentsResult);
            
            if (enrollmentsResult.data.success) {
                console.log('✅ Enrollments fetched successfully!');
                console.log('User has', enrollmentsResult.data.enrollments.length, 'enrollments');
            } else {
                console.log('❌ Failed to fetch enrollments:', enrollmentsResult.data.message);
            }
        } else {
            console.log('❌ Login failed:', loginResult.data.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLogin();
