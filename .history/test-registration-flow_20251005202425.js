const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRegistrationFlow() {
    console.log('🧪 TESTING COMPLETE REGISTRATION FLOW');
    console.log('=====================================\n');
    
    const testData = {
        first_name: 'Ali',
        last_name: 'Elbadry',
        email: 'alielbadry279@gmail.com',
        password: 'assadamgad12!A',
        userType: 'student'
    };
    
    console.log('1. Testing registration with data:', testData);
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('   Response status:', response.status);
        
        const data = await response.json();
        console.log('   Response data:', data);
        
        if (response.ok) {
            console.log('✅ Registration successful!');
            
            // Test admin panel API
            console.log('\n2. Testing admin panel students API...');
            
            const adminResponse = await fetch('http://localhost:3000/api/admin/students', {
                headers: {
                    'Authorization': 'Bearer test-token' // This will fail auth but we can see the endpoint
                }
            });
            
            console.log('   Admin API status:', adminResponse.status);
            
            if (adminResponse.status === 401) {
                console.log('✅ Admin API endpoint exists (auth required)');
            } else {
                const adminData = await adminResponse.json();
                console.log('   Admin API data:', adminData);
            }
            
            // Test courses API
            console.log('\n3. Testing courses API...');
            
            const coursesResponse = await fetch('http://localhost:3000/api/courses');
            console.log('   Courses API status:', coursesResponse.status);
            
            if (coursesResponse.ok) {
                const coursesData = await coursesResponse.json();
                console.log('   Courses count:', coursesData.length);
                console.log('✅ Courses API working!');
            }
            
        } else {
            console.log('❌ Registration failed:', data.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Wait for server to start
setTimeout(testRegistrationFlow, 3000);
