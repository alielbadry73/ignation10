// Debug script to check wrong questions data structure
// Run this in the browser console on the physics-wrong-questions-assignments.html page

console.log('🔍 DEBUGGING WRONG QUESTIONS DATA');
console.log('=====================================');

// Check localStorage for physics wrong questions
const physicsWrongQuestions = JSON.parse(localStorage.getItem('physicsWrongQuestions') || '[]');
console.log('📊 Total Physics Wrong Questions:', physicsWrongQuestions.length);

if (physicsWrongQuestions.length > 0) {
    console.log('\n📝 Sample Wrong Question Structure:');
    const sampleQuestion = physicsWrongQuestions[0];
    console.log('Full object:', sampleQuestion);
    
    console.log('\n🔍 Field Analysis:');
    console.log('- questionText:', sampleQuestion.questionText);
    console.log('- question:', sampleQuestion.question);
    console.log('- text:', sampleQuestion.text);
    console.log('- studentAnswer:', sampleQuestion.studentAnswer);
    console.log('- correctAnswer:', sampleQuestion.correctAnswer);
    console.log('- activityTitle:', sampleQuestion.activityTitle);
    console.log('- assignmentTitle:', sampleQuestion.assignmentTitle);
    console.log('- questionType:', sampleQuestion.questionType);
    console.log('- options:', sampleQuestion.options);
    console.log('- userAnswer:', sampleQuestion.userAnswer);
    console.log('- correctAnswerIndex:', sampleQuestion.correctAnswerIndex);
    console.log('- activityType:', sampleQuestion.activityType);
    
    console.log('\n📋 All Assignment Titles:');
    physicsWrongQuestions.forEach((q, index) => {
        console.log(`${index + 1}. "${q.activityTitle || q.assignmentTitle || 'No title'}" (Type: ${q.activityType})`);
    });
    
    console.log('\n🎯 Assignment-specific questions:');
    const assignmentQuestions = physicsWrongQuestions.filter(q => q.activityType === 'assignments');
    console.log('Assignment questions count:', assignmentQuestions.length);
    
    if (assignmentQuestions.length > 0) {
        console.log('\n📝 First Assignment Question Details:');
        const firstAssignment = assignmentQuestions[0];
        console.log('Question ID:', firstAssignment.id);
        console.log('Question Text:', firstAssignment.questionText || firstAssignment.question || firstAssignment.text);
        console.log('Student Answer:', firstAssignment.studentAnswer);
        console.log('Correct Answer:', firstAssignment.correctAnswer);
        console.log('Assignment Title:', firstAssignment.activityTitle || firstAssignment.assignmentTitle);
        console.log('Question Type:', firstAssignment.questionType);
        console.log('Options:', firstAssignment.options);
        console.log('User Answer Index:', firstAssignment.userAnswer);
        console.log('Correct Answer Index:', firstAssignment.correctAnswerIndex);
    }
} else {
    console.log('❌ No physics wrong questions found in localStorage');
    
    // Check other possible keys
    console.log('\n🔍 Checking other possible localStorage keys:');
    const keys = Object.keys(localStorage);
    const wrongQuestionKeys = keys.filter(key => key.toLowerCase().includes('wrong') || key.toLowerCase().includes('question'));
    console.log('Possible wrong question keys:', wrongQuestionKeys);
    
    wrongQuestionKeys.forEach(key => {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            console.log(`${key}:`, data.length || 0, 'items');
        } catch (e) {
            console.log(`${key}: Invalid JSON`);
        }
    });
}

console.log('\n✅ Debug complete! Check the output above for data structure issues.');
























