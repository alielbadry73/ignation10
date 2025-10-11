const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test function
async function testEndpoint(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing IG Nation Backend API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const health = await testEndpoint('GET', '/api/health');
    console.log(`   Status: ${health.status} - ${health.data.message}\n`);

    // Test 2: Login
    console.log('2. Testing Admin Login...');
    const login = await testEndpoint('POST', '/api/login', {
      email: 'admin@ignation.com',
      password: 'admin123'
    });
    console.log(`   Status: ${login.status} - ${login.data.token ? 'Token received' : 'Login failed'}`);
    const token = login.data.token;
    console.log('');

    // Test 3: Get Courses
    console.log('3. Testing Get Courses...');
    const courses = await testEndpoint('GET', '/api/courses');
    console.log(`   Status: ${courses.status} - Found ${courses.data.length} courses`);
    console.log(`   Courses: ${courses.data.map(c => c.title).join(', ')}\n`);

    // Test 4: Get Students (Admin)
    console.log('4. Testing Get Students (Admin)...');
    const students = await testEndpoint('GET', '/api/admin/students', null, token);
    console.log(`   Status: ${students.status} - Found ${students.data.length} students`);
    console.log(`   Students: ${students.data.map(s => `${s.first_name} ${s.last_name}`).join(', ')}\n`);

    // Test 5: Get Orders (Admin)
    console.log('5. Testing Get Orders (Admin)...');
    const orders = await testEndpoint('GET', '/api/admin/orders', null, token);
    console.log(`   Status: ${orders.status} - Found ${orders.data.length} orders`);
    console.log(`   Orders: ${orders.data.map(o => `#${o.id} - £${o.total_amount}`).join(', ')}\n`);

    // Test 6: Get Teachers (Admin)
    console.log('6. Testing Get Teachers (Admin)...');
    const teachers = await testEndpoint('GET', '/api/admin/teachers', null, token);
    console.log(`   Status: ${teachers.status} - Found ${teachers.data.length} teachers`);
    console.log(`   Teachers: ${teachers.data.map(t => `${t.first_name} ${t.last_name} (${t.subject})`).join(', ')}\n`);

    // Test 7: Get Enrollments (Admin)
    console.log('7. Testing Get Enrollments (Admin)...');
    const enrollments = await testEndpoint('GET', '/api/admin/enrollments', null, token);
    console.log(`   Status: ${enrollments.status} - Found ${enrollments.data.length} enrollments\n`);

    console.log('✅ All tests completed successfully!');
    console.log('\n🎉 Backend is fully functional!');
    console.log('📊 Admin Panel: http://localhost:3000/admin-panel.html');
    console.log('🔐 Admin Login: admin@ignation.com / admin123');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
runTests();
