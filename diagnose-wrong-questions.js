// Diagnostic script to check wrong questions data
// Run this in browser console on physics-wrong-questions-assignments.html page

console.log('🔍 DIAGNOSING WRONG QUESTIONS DATA');
console.log('====================================');

// Check localStorage for physics wrong questions
const physicsWrongQuestions = JSON.parse(localStorage.getItem('physicsWrongQuestions') || '[]');
console.log('📊 Total Physics Wrong Questions:', physicsWrongQuestions.length);

if (physicsWrongQuestions.length > 0) {
    console.log('\n📝 ALL QUESTIONS:');
    physicsWrongQuestions.forEach((q, index) => {
        console.log(`\nQuestion ${index + 1}:`);
        console.log('- ID:', q.id);
        console.log('- questionText:', q.questionText);
        console.log('- question:', q.question);
        console.log('- text:', q.text);
        console.log('- studentAnswer:', q.studentAnswer);
        console.log('- correctAnswer:', q.correctAnswer);
        console.log('- activityType:', q.activityType);
        console.log('- activityTitle:', q.activityTitle);
        console.log('- assignmentTitle:', q.assignmentTitle);
        console.log('- questionType:', q.questionType);
        console.log('- options:', q.options);
        console.log('- userAnswer:', q.userAnswer);
        console.log('- correctAnswerIndex:', q.correctAnswerIndex);
        console.log('- source:', q.source);
        console.log('- subject:', q.subject);
    });
    
    console.log('\n🎯 ASSIGNMENT FILTERING:');
    const assignmentQuestions = physicsWrongQuestions.filter(q => q.activityType === 'assignments');
    console.log('Questions with activityType === "assignments":', assignmentQuestions.length);
    
    const assignmentQuestionsAlt = physicsWrongQuestions.filter(q => q.source === 'assignment' || q.source === 'assignments');
    console.log('Questions with source === "assignment" or "assignments":', assignmentQuestionsAlt.length);
    
    console.log('\n📋 ACTIVITY TYPES FOUND:');
    const activityTypes = [...new Set(physicsWrongQuestions.map(q => q.activityType))];
    console.log('Activity types:', activityTypes);
    
    console.log('\n📋 SOURCES FOUND:');
    const sources = [...new Set(physicsWrongQuestions.map(q => q.source))];
    console.log('Sources:', sources);
    
    // Check for assignment questions by title
    const assignmentByTitle = physicsWrongQuestions.filter(q => 
        q.activityTitle && q.activityTitle.toLowerCase().includes('khaled') ||
        q.assignmentTitle && q.assignmentTitle.toLowerCase().includes('khaled')
    );
    console.log('\n🔍 KHALED ASSIGNMENT QUESTIONS:');
    console.log('Questions with "khaled" in title:', assignmentByTitle.length);
    
    if (assignmentByTitle.length > 0) {
        console.log('Sample khaled question:');
        console.log(assignmentByTitle[0]);
    }
    
} else {
    console.log('❌ No physics wrong questions found');
    
    // Check other possible keys
    console.log('\n🔍 CHECKING OTHER KEYS:');
    const keys = Object.keys(localStorage);
    const relevantKeys = keys.filter(key => 
        key.toLowerCase().includes('wrong') || 
        key.toLowerCase().includes('question') ||
        key.toLowerCase().includes('physics') ||
        key.toLowerCase().includes('assignment')
    );
    console.log('Relevant keys:', relevantKeys);
    
    relevantKeys.forEach(key => {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data)) {
                console.log(`${key}: ${data.length} items`);
                if (data.length > 0) {
                    console.log(`  Sample:`, data[0]);
                }
            } else {
                console.log(`${key}:`, typeof data, data);
            }
        } catch (e) {
            console.log(`${key}: Invalid JSON`);
        }
    });
}

console.log('\n✅ Diagnosis complete!');
























