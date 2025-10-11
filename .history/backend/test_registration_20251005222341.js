const http = require('http');

const postData = JSON.stringify({
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  phone: '+1234567890',
  parent_phone: '+0987654321'
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

console.log('Testing registration API...');
console.log('Request data:', postData);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    console.log('Response body:', data);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('✅ Registration successful!');
          console.log('User ID:', response.user.id);
          console.log('Token:', response.token ? 'Present' : 'Missing');
        }
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
      }
    } else {
      console.log('❌ Registration failed');
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Request error:', err.message);
});

req.write(postData);
req.end();
