const http = require('http');

function debugRegistration() {
    // Try with a slightly different email to see if it's a specific email issue
    const emails = [
        'cybernight@gmail.com',
        'cybernight123@gmail.com',
        'CYBERNIGHT@GMAIL.COM',
        'cybernight@GMAIL.COM'
    ];
    
    let index = 0;
    
    function tryNextEmail() {
        if (index >= emails.length) {
            console.log('All email variations tried');
            return;
        }
        
        const email = emails[index];
        console.log(`\n=== Trying email: ${email} ===`);
        
        const postData = JSON.stringify({
            email: email,
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
                        console.log('✅ Registration successful with email:', email);
                        testLogin(email);
                    } else {
                        console.log('❌ Registration failed:', result.message);
                        index++;
                        setTimeout(tryNextEmail, 1000);
                    }
                } catch (e) {
                    console.log('Failed to parse JSON:', e.message);
                    index++;
                    setTimeout(tryNextEmail, 1000);
                }
            });
        });
        
        req.on('error', (e) => {
            console.error('Request error:', e.message);
            index++;
            setTimeout(tryNextEmail, 1000);
        });
        
        req.write(postData);
        req.end();
    }
    
    tryNextEmail();
}

function testLogin(email) {
    console.log(`\nTesting login with email: ${email}`);
    
    const postData = JSON.stringify({
        email: email,
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
                if (result.success) {
                    console.log('✅ Login successful!');
                    console.log('✅ User can now login with:');
                    console.log(`   Email: ${email}`);
                    console.log(`   Password: password123`);
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

debugRegistration();
