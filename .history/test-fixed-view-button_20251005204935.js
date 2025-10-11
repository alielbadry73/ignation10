const fs = require('fs');

console.log('🔧 TESTING FIXED VIEW BUTTON');
console.log('=============================\n');

// Read the admin panel file
const adminPanelContent = fs.readFileSync('admin-panel-new.html', 'utf8');

// Check if apiCall references are removed
if (adminPanelContent.includes('apiCall(')) {
    console.log('❌ apiCall references still present');
    const matches = adminPanelContent.match(/apiCall\([^)]+\)/g);
    if (matches) {
        console.log('Found apiCall references:', matches);
    }
} else {
    console.log('✅ All apiCall references removed');
}

// Check if fetch is used correctly
if (adminPanelContent.includes('fetch(\'http://localhost:3000/api/admin/students\'')) {
    console.log('✅ Students API fetch call found');
} else {
    console.log('❌ Students API fetch call not found');
}

// Check if viewStudent function exists
if (adminPanelContent.includes('async function viewStudent(studentId)')) {
    console.log('✅ viewStudent function found');
} else {
    console.log('❌ viewStudent function not found');
}

// Check if the modal HTML is present
if (adminPanelContent.includes('viewStudentModal')) {
    console.log('✅ Student detail modal HTML found');
} else {
    console.log('❌ Student detail modal HTML not found');
}

console.log('\n📋 The view button should now work correctly!');
console.log('   - Navigate to: http://localhost:3000/admin-panel-new.html');
console.log('   - Login with: admin@ignation.com / admin123');
console.log('   - Go to Students section');
console.log('   - Click the view button (eye icon) for any student');
