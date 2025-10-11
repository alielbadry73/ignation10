const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAdminStudentsAPI() {
    console.log('🧪 TESTING ADMIN STUDENTS API');
    console.log('=============================\n');
    
    try {
        // First, login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@ignation.com',
                password: 'lionking123'
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
            console.log('❌ Admin login failed:', loginData.message);
            return;
        }
        
        console.log('✅ Admin login successful');
        const token = loginData.token;
        
        // Now test the students API
        console.log('\n2. Fetching students data...');
        const studentsResponse = await fetch('http://localhost:3000/api/admin/students', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const students = await studentsResponse.json();
        
        if (!studentsResponse.ok) {
            console.log('❌ Students API failed:', students.message);
            return;
        }
        
        console.log('✅ Students API successful');
        console.log(`Found ${students.length} students:`);
        
        students.forEach(student => {
            console.log(`\n📋 Student ID: ${student.id}`);
            console.log(`   Name: ${student.first_name} ${student.last_name}`);
            console.log(`   Email: ${student.email}`);
            console.log(`   Phone: ${student.phone || 'Not provided'}`);
            console.log(`   Parent Phone: ${student.parent_phone || 'Not provided'}`);
            console.log(`   Created: ${student.created_at}`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAdminStudentsAPI();
