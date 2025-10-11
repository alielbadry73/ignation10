// Test script to check assignments API
const fetch = require('node-fetch');

async function testAssignmentsAPI() {
    try {
        console.log('Testing assignments API...');
        
        // First, let's test the login to get a token
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('Login failed, trying with email...');
            const loginResponse2 = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'admin@ignation.com',
                    password: 'admin123'
                })
            });
            
            if (!loginResponse2.ok) {
                console.log('Login failed with both username and email');
                return;
            }
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        if (!token) {
            console.log('No token received from login');
            return;
        }
        
        console.log('Login successful, testing dashboard stats...');
        
        // Test the dashboard stats API
        const statsResponse = await fetch('http://localhost:3000/api/dashboard/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('Dashboard stats:', statsData);
        } else {
            console.log('Failed to fetch dashboard stats:', statsResponse.status);
        }
        
    } catch (error) {
        console.error('Error testing API:', error);
    }
}

testAssignmentsAPI();
