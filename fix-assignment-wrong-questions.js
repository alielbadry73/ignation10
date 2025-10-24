// Comprehensive fix for assignment wrong questions data
// Run this in the browser console on the physics-wrong-questions-assignments.html page

console.log('🔧 COMPREHENSIVE FIX FOR ASSIGNMENT WRONG QUESTIONS');
console.log('====================================================');

function fixAssignmentWrongQuestions() {
    // Get physics wrong questions
    const physicsWrongQuestions = JSON.parse(localStorage.getItem('physicsWrongQuestions') || '[]');
    
    if (physicsWrongQuestions.length === 0) {
        console.log('❌ No physics wrong questions found');
        return;
    }
    
    console.log(`📊 Found ${physicsWrongQuestions.length} physics wrong questions`);
    
    let fixedCount = 0;
    let assignmentQuestions = 0;
    
    // Process each wrong question
    const fixedQuestions = physicsWrongQuestions.map((question, index) => {
        console.log(`\n🔍 Processing question ${index + 1}:`);
        console.log('- Original data:', question);
        
        const fixed = { ...question };
        
        // Fix question text
        if (!fixed.questionText) {
            if (fixed.question) {
                fixed.questionText = fixed.question;
                console.log('✅ Fixed questionText from question field');
                fixedCount++;
            } else if (fixed.text) {
                fixed.questionText = fixed.text;
                console.log('✅ Fixed questionText from text field');
                fixedCount++;
            }
        }
        
        // Fix assignment title
        if (!fixed.activityTitle) {
            if (fixed.assignmentTitle) {
                fixed.activityTitle = fixed.assignmentTitle;
                console.log('✅ Fixed activityTitle from assignmentTitle field');
                fixedCount++;
            }
        }
        
        // Fix activityType
        if (!fixed.activityType || fixed.activityType !== 'assignments') {
            if (fixed.source === 'assignment' || fixed.source === 'assignments') {
                fixed.activityType = 'assignments';
                console.log('✅ Fixed activityType to assignments');
                fixedCount++;
            }
        }
        
        // Fix student answer - this is the critical part
        if (!fixed.studentAnswer || fixed.studentAnswer === 'No answer provided') {
            console.log('🔧 Fixing student answer...');
            console.log('- userAnswer:', fixed.userAnswer);
            console.log('- options:', fixed.options);
            console.log('- questionType:', fixed.questionType);
            
            if (fixed.questionType === 'multiple-choice' && fixed.options && fixed.userAnswer !== undefined) {
                // For multiple choice questions
                const userIndex = parseInt(fixed.userAnswer);
                if (userIndex >= 0 && fixed.options[userIndex]) {
                    fixed.studentAnswer = fixed.options[userIndex].text || fixed.options[userIndex];
                    console.log('✅ Fixed studentAnswer for multiple choice:', fixed.studentAnswer);
                    fixedCount++;
                } else {
                    fixed.studentAnswer = `Option ${userIndex + 1}`;
                    console.log('✅ Set fallback studentAnswer for multiple choice');
                    fixedCount++;
                }
            } else if (fixed.userAnswer && typeof fixed.userAnswer === 'string') {
                // For text questions
                fixed.studentAnswer = fixed.userAnswer;
                console.log('✅ Fixed studentAnswer for text question:', fixed.studentAnswer);
                fixedCount++;
            } else if (fixed.userAnswer !== undefined) {
                // Fallback
                fixed.studentAnswer = String(fixed.userAnswer);
                console.log('✅ Set fallback studentAnswer:', fixed.studentAnswer);
                fixedCount++;
            }
        }
        
        // Fix correct answer - this is also critical
        if (!fixed.correctAnswer || fixed.correctAnswer === 'Correct answer not provided') {
            console.log('🔧 Fixing correct answer...');
            console.log('- correctAnswerIndex:', fixed.correctAnswerIndex);
            console.log('- options:', fixed.options);
            
            if (fixed.questionType === 'multiple-choice' && fixed.options && fixed.correctAnswerIndex !== undefined) {
                // For multiple choice questions
                const correctIndex = parseInt(fixed.correctAnswerIndex);
                if (correctIndex >= 0 && fixed.options[correctIndex]) {
                    fixed.correctAnswer = fixed.options[correctIndex].text || fixed.options[correctIndex];
                    console.log('✅ Fixed correctAnswer for multiple choice:', fixed.correctAnswer);
                    fixedCount++;
                } else {
                    fixed.correctAnswer = `Option ${correctIndex + 1}`;
                    console.log('✅ Set fallback correctAnswer for multiple choice');
                    fixedCount++;
                }
            } else if (fixed.correctAnswerIndex !== undefined) {
                // Fallback for other question types
                fixed.correctAnswer = String(fixed.correctAnswerIndex);
                console.log('✅ Set fallback correctAnswer:', fixed.correctAnswer);
                fixedCount++;
            }
        }
        
        // Count assignment questions
        if (fixed.activityType === 'assignments') {
            assignmentQuestions++;
        }
        
        console.log('- Fixed data:', fixed);
        return fixed;
    });
    
    // Save fixed data back to localStorage
    localStorage.setItem('physicsWrongQuestions', JSON.stringify(fixedQuestions));
    
    console.log(`\n✅ FIX COMPLETE!`);
    console.log(`📊 Fixed ${fixedCount} field issues across ${fixedQuestions.length} questions`);
    console.log(`📋 Assignment questions: ${assignmentQuestions}`);
    console.log('🔄 Data has been updated in localStorage');
    
    // Show sample of fixed assignment questions
    const assignmentQuestionsList = fixedQuestions.filter(q => q.activityType === 'assignments');
    if (assignmentQuestionsList.length > 0) {
        console.log('\n📝 Sample Fixed Assignment Questions:');
        assignmentQuestionsList.slice(0, 3).forEach((q, i) => {
            console.log(`\nQuestion ${i + 1}:`);
            console.log('- Question Text:', q.questionText);
            console.log('- Student Answer:', q.studentAnswer);
            console.log('- Correct Answer:', q.correctAnswer);
            console.log('- Assignment Title:', q.activityTitle);
            console.log('- Question Type:', q.questionType);
        });
    }
    
    return fixedQuestions;
}

// Run the fix
const fixedQuestions = fixAssignmentWrongQuestions();

console.log('\n🎯 NEXT STEPS:');
console.log('1. Refresh the physics-wrong-questions-assignments.html page');
console.log('2. The questions should now show proper text instead of "No answer provided"');
console.log('3. If issues persist, check the browser console for any JavaScript errors');

// Also try to reload the page data
if (typeof loadWrongQuestions === 'function') {
    console.log('🔄 Attempting to reload wrong questions data...');
    loadWrongQuestions();
    displayContent();
}
























