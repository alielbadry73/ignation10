// Test registration with Middle East phone validation
const testData = {
    first_name: 'Ahmed',
    last_name: 'Al-Rashid',
    email: 'ahmed.rashid@example.com',
    password: 'password123',
    phone: '512345678',
    phone_country: 'SA',
    parent_phone: '966512345678',
    parent_phone_country: 'SA'
};

console.log('🧪 Testing Registration with Middle East Phone Numbers\n');
console.log('Test Data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
    console.log('\n📋 Registration Response:');
    console.log('Status:', data.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', data.message || data.error);
    if (data.userId) {
        console.log('User ID:', data.userId);
    }
})
.catch(error => {
    console.error('❌ Registration Error:', error);
});
