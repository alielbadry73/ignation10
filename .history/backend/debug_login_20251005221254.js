const http = require('http');

const postData = JSON.stringify({
  email: 'admin@igway.com',
  password: 'admin123'
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

console.log('Testing login API with debug...');
console.log('Request data:', postData);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    console.log('Response body:', data);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        if (response.token) {
          console.log('✅ Login successful!');
          console.log('Token:', response.token.substring(0, 50) + '...');
          console.log('User:', response.user);
        }
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
      }
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Request error:', err.message);
});

req.write(postData);
req.end();
