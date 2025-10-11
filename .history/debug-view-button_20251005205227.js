const fs = require('fs');

console.log('🔍 DEBUGGING VIEW BUTTON ISSUE');
console.log('==============================\n');

// Read the admin panel file
const adminPanelContent = fs.readFileSync('admin-panel-new.html', 'utf8');

// Check for potential issues
console.log('1. Checking viewStudent function...');
const viewStudentMatch = adminPanelContent.match(/async function viewStudent\(studentId\) \{[\s\S]*?\n\s*\}/);
if (viewStudentMatch) {
    console.log('✅ viewStudent function found');
    console.log('Function length:', viewStudentMatch[0].length, 'characters');
} else {
    console.log('❌ viewStudent function not found');
}

console.log('\n2. Checking for JavaScript syntax errors...');
// Look for common syntax issues
if (adminPanelContent.includes('apiCall(')) {
    console.log('❌ Found apiCall references - these should be removed');
} else {
    console.log('✅ No apiCall references found');
}

console.log('\n3. Checking Bootstrap modal references...');
if (adminPanelContent.includes('bootstrap.Modal')) {
    console.log('✅ Bootstrap modal references found');
} else {
    console.log('❌ Bootstrap modal references not found');
}

console.log('\n4. Checking for onclick handlers...');
if (adminPanelContent.includes('onclick="viewStudent(')) {
    console.log('✅ onclick handler found');
} else {
    console.log('❌ onclick handler not found');
}

console.log('\n5. Checking for modal HTML...');
if (adminPanelContent.includes('viewStudentModal')) {
    console.log('✅ Modal HTML found');
} else {
    console.log('❌ Modal HTML not found');
}

console.log('\n6. Checking for authentication token usage...');
if (adminPanelContent.includes('authToken')) {
    console.log('✅ authToken usage found');
} else {
    console.log('❌ authToken usage not found');
}

console.log('\n📋 Debugging complete. If all checks pass, the issue might be:');
console.log('   - Browser cache (try hard refresh: Ctrl+F5)');
console.log('   - JavaScript errors in browser console');
console.log('   - Authentication token not set');
