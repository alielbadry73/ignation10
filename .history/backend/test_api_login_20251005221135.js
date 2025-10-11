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

console.log('Testing login API...');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Login response status:', res.statusCode);
    console.log('Login response:', data);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        if (response.token) {
          console.log('✅ Login successful! Token received.');
          
          // Test students API with token
          testStudentsAPI(response.token);
        } else {
          console.log('❌ No token in response');
        }
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
      }
    } else {
      console.log('❌ Login failed');
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Request error:', err.message);
});

req.write(postData);
req.end();

function testStudentsAPI(token) {
  console.log('\nTesting students API...');
  
  const options2 = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/students',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req2 = http.request(options2, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Students API response status:', res.statusCode);
      console.log('Students API response:', data);
      
      if (res.statusCode === 200) {
        try {
          const students = JSON.parse(data);
          console.log(`✅ Students API working! Found ${students.length} students.`);
          if (students.length > 0) {
            console.log('First student:', students[0]);
          }
        } catch (e) {
          console.log('❌ Error parsing students response:', e.message);
        }
      } else {
        console.log('❌ Students API failed');
      }
    });
  });
  
  req2.on('error', (err) => {
    console.log('❌ Students API request error:', err.message);
  });
  
  req2.end();
}
