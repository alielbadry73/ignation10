// Script to fix existing wrong questions data structure
// Run this in the browser console to fix any existing data

console.log('🔧 FIXING WRONG QUESTIONS DATA STRUCTURE');
console.log('==========================================');

function fixWrongQuestionsData() {
    // Get all wrong questions
    const physicsWrongQuestions = JSON.parse(localStorage.getItem('physicsWrongQuestions') || '[]');
    
    if (physicsWrongQuestions.length === 0) {
        console.log('❌ No physics wrong questions found');
        return;
    }
    
    console.log(`📊 Found ${physicsWrongQuestions.length} physics wrong questions`);
    
    let fixedCount = 0;
    
    // Fix each wrong question
    const fixedQuestions = physicsWrongQuestions.map(question => {
        const fixed = { ...question };
        
        // Fix question text field
        if (!fixed.questionText && (fixed.question || fixed.text)) {
            fixed.questionText = fixed.question || fixed.text;
            fixedCount++;
        }
        
        // Fix assignment title
        if (!fixed.activityTitle && fixed.assignmentTitle) {
            fixed.activityTitle = fixed.assignmentTitle;
            fixedCount++;
        }
        
        // Ensure we have proper field names
        if (!fixed.studentAnswer && fixed.userAnswer !== undefined) {
            // For multiple choice, convert index to text
            if (fixed.options && fixed.options[fixed.userAnswer]) {
                fixed.studentAnswer = fixed.options[fixed.userAnswer].text || fixed.options[fixed.userAnswer];
            } else {
                fixed.studentAnswer = fixed.userAnswer || 'No answer provided';
            }
            fixedCount++;
        }
        
        if (!fixed.correctAnswer && fixed.correctAnswerIndex !== undefined && fixed.options) {
            if (fixed.options[fixed.correctAnswerIndex]) {
                fixed.correctAnswer = fixed.options[fixed.correctAnswerIndex].text || fixed.options[fixed.correctAnswerIndex];
            }
            fixedCount++;
        }
        
        // Ensure activityType is set correctly
        if (!fixed.activityType || fixed.activityType !== 'assignments') {
            if (fixed.source === 'assignment' || fixed.source === 'assignments') {
                fixed.activityType = 'assignments';
                fixedCount++;
            }
        }
        
        return fixed;
    });
    
    // Save fixed data back to localStorage
    localStorage.setItem('physicsWrongQuestions', JSON.stringify(fixedQuestions));
    
    console.log(`✅ Fixed ${fixedCount} field issues across ${fixedQuestions.length} questions`);
    console.log('🔄 Data has been updated in localStorage');
    
    // Show sample of fixed data
    if (fixedQuestions.length > 0) {
        console.log('\n📝 Sample Fixed Question:');
        const sample = fixedQuestions[0];
        console.log('- questionText:', sample.questionText);
        console.log('- studentAnswer:', sample.studentAnswer);
        console.log('- correctAnswer:', sample.correctAnswer);
        console.log('- activityTitle:', sample.activityTitle);
        console.log('- activityType:', sample.activityType);
    }
}

// Run the fix
fixWrongQuestionsData();

console.log('\n✅ Fix complete! Refresh the wrong questions page to see the changes.');
























