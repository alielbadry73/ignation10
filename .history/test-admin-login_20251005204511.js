const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAdminLogin() {
    console.log('🔐 TESTING ADMIN LOGIN');
    console.log('======================\n');
    
    const adminCredentials = [
        { email: 'admin@ignation.com', password: 'admin123' },
        { email: 'admin@ignation.com', password: 'lionking123' },
        { email: 'admin@ignation.com', password: 'admin' },
        { email: 'admin@ignation.com', password: 'password' }
    ];
    
    for (const cred of adminCredentials) {
        console.log(`Testing: ${cred.email} / ${cred.password}`);
        
        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cred)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Login successful!');
                console.log('Token:', data.token ? 'Present' : 'Missing');
                return;
            } else {
                console.log('❌ Failed:', data.message);
            }
            
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
    }
    
    console.log('\n❌ All login attempts failed');
}

testAdminLogin();
