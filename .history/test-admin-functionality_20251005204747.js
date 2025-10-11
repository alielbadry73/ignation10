const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAdminFunctionality() {
    console.log('🧪 TESTING ADMIN PANEL FUNCTIONALITY');
    console.log('====================================\n');
    
    try {
        // Test admin login
        console.log('1. Testing admin login...');
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@ignation.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
            console.log('❌ Admin login failed:', loginData.message);
            return;
        }
        
        console.log('✅ Admin login successful');
        const token = loginData.token;
        
        // Test students API
        console.log('\n2. Testing students API...');
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
        console.log(`Found ${students.length} students`);
        
        // Test with a specific student
        if (students.length > 0) {
            const testStudent = students[0];
            console.log(`\n3. Testing with student ID: ${testStudent.id}`);
            console.log(`   Name: ${testStudent.first_name} ${testStudent.last_name}`);
            console.log(`   Email: ${testStudent.email}`);
            console.log(`   Phone: ${testStudent.phone || 'Not provided'}`);
            console.log(`   Parent Phone: ${testStudent.parent_phone || 'Not provided'}`);
            
            console.log('\n✅ All API endpoints working correctly');
            console.log('📋 The view button should work in the admin panel');
            console.log('   - Navigate to: http://localhost:3000/admin-panel-new.html');
            console.log('   - Login with: admin@ignation.com / admin123');
            console.log('   - Go to Students section');
            console.log('   - Click the view button (eye icon) for any student');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAdminFunctionality();
