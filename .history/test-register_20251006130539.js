const http = require('http');

const postData = JSON.stringify({
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    phone: '1234567890',
    parent_phone: '0987654321',
    password: 'test123',
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

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`Body: ${chunk}`);
    });
    
    res.on('end', () => {
        console.log('Request completed');
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
