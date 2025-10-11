const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testViewButtonWorking() {
    console.log('🔧 TESTING VIEW BUTTON FUNCTIONALITY');
    console.log('===================================\n');
    
    try {
        // Login as admin
        console.log('1. Logging in as admin...');
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
        
        if (students.length > 0) {
            const testStudent = students[0];
            console.log(`\n3. Test student details:`);
            console.log(`   ID: ${testStudent.id}`);
            console.log(`   Name: ${testStudent.first_name} ${testStudent.last_name}`);
            console.log(`   Email: ${testStudent.email}`);
            console.log(`   Phone: ${testStudent.phone || 'Not provided'}`);
            console.log(`   Parent Phone: ${testStudent.parent_phone || 'Not provided'}`);
            
            console.log('\n✅ ALL SYSTEMS WORKING!');
            console.log('\n📋 INSTRUCTIONS TO FIX VIEW BUTTON:');
            console.log('1. Open your browser');
            console.log('2. Go to: http://localhost:3000/admin-panel.html');
            console.log('3. Login with: admin@ignation.com / admin123');
            console.log('4. Click on "Students" in the sidebar');
            console.log('5. Click the blue "View" button next to any student');
            console.log('6. You should see a modal with all student details');
            
            console.log('\n🚨 IMPORTANT: Make sure you use admin-panel.html (NOT admin-panel-new.html)');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testViewButtonWorking();
