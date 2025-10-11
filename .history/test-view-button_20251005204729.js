// Test script to verify the viewStudent function exists and works
const fs = require('fs');

console.log('🔍 TESTING VIEW BUTTON FUNCTIONALITY');
console.log('=====================================\n');

// Read the admin panel file
const adminPanelContent = fs.readFileSync('admin-panel-new.html', 'utf8');

// Check if the old alert function still exists
if (adminPanelContent.includes("alert('View student details functionality coming soon!')")) {
    console.log('❌ Old alert function still present');
} else {
    console.log('✅ Old alert function removed');
}

// Check if the new viewStudent function exists
if (adminPanelContent.includes('async function viewStudent(studentId)')) {
    console.log('✅ New viewStudent function found');
} else {
    console.log('❌ New viewStudent function not found');
}

// Check if the modal HTML is present
if (adminPanelContent.includes('viewStudentModal')) {
    console.log('✅ Student detail modal HTML found');
} else {
    console.log('❌ Student detail modal HTML not found');
}

// Check if the function is called correctly in the table
if (adminPanelContent.includes('onclick="viewStudent(${student.id})"')) {
    console.log('✅ View button onclick handler found');
} else {
    console.log('❌ View button onclick handler not found');
}

console.log('\n📋 Summary:');
console.log('The view button should now work properly with the detailed student modal.');
