// Test script to verify assignment wrong question creation works properly
// This script creates test data and provides instructions for testing

console.log('Assignment Wrong Questions Test Script');
console.log('====================================');

// Function to create test assignment questions in teacher panel format
function createTestAssignmentQuestions() {
    console.log('Creating test assignment questions...');
    
    const testQuestions = [
        {
            id: 'test_assignment_q1_' + Date.now(),
            text: 'What is the formula for kinetic energy?',
            questionText: 'What is the formula for kinetic energy?',
            questionType: 'multiple-choice',
            activityType: 'assignment',
            activityTitle: 'yf', // Match user's example
            course: 'physics',
            points: 5,
            difficulty: 'medium',
            options: [
                { text: 'KE = mv²', isCorrect: false },
                { text: 'KE = 1/2mv²', isCorrect: true },
                { text: 'KE = mv', isCorrect: false },
                { text: 'KE = 2mv²', isCorrect: false }
            ],
            correctAnswer: 1, // Index of correct answer
            createdAt: new Date().toISOString()
        },
        {
            id: 'test_assignment_q2_' + Date.now(),
            text: 'What is Newton\'s second law of motion?',
            questionText: 'What is Newton\'s second law of motion?',
            questionType: 'multiple-choice',
            activityType: 'assignment',
            activityTitle: 'yf',
            course: 'physics',
            points: 5,
            difficulty: 'medium',
            options: [
                { text: 'F = ma', isCorrect: true },
                { text: 'F = mv', isCorrect: false },
                { text: 'F = m/a', isCorrect: false },
                { text: 'F = ma²', isCorrect: false }
            ],
            correctAnswer: 0,
            createdAt: new Date().toISOString()
        }
    ];
    
    // Save to physics questions (teacher panel format)
    const existingQuestions = JSON.parse(localStorage.getItem('physicsQuestions') || '[]');
    testQuestions.forEach(q => {
        if (!existingQuestions.find(existing => existing.id === q.id)) {
            existingQuestions.push(q);
        }
    });
    localStorage.setItem('physicsQuestions', JSON.stringify(existingQuestions));
    
    console.log('✅ Test assignment questions created in physicsQuestions');
    console.log('Questions:', testQuestions.map(q => ({ title: q.text, assignment: q.activityTitle })));
    
    return testQuestions;
}

// Function to clear existing wrong questions for clean testing
function clearWrongQuestions() {
    console.log('Clearing existing wrong questions...');
    localStorage.removeItem('physicsWrongQuestions');
    localStorage.removeItem('mathematicsWrongQuestions');
    localStorage.removeItem('chemistryWrongQuestions');
    console.log('✅ All wrong questions cleared');
}

// Function to test the complete workflow
function runAssignmentTest() {
    console.log('\n🧪 Running Assignment Wrong Questions Test');
    console.log('==========================================');
    
    // Step 1: Clear existing data
    clearWrongQuestions();
    
    // Step 2: Create test questions
    const testQuestions = createTestAssignmentQuestions();
    
    console.log('\n📋 Test Instructions:');
    console.log('====================');
    console.log('1. Go to: http://localhost:3000/physics-assignments.html');
    console.log('2. You should see the "yf" assignment');
    console.log('3. Click "Start Assignment"');
    console.log('4. Answer the first question INCORRECTLY (choose option 0: "KE = mv²")');
    console.log('5. Answer the second question INCORRECTLY (choose option 1: "F = mv")');
    console.log('6. Submit the assignment');
    console.log('7. Go to: http://localhost:3000/physics-wrong-questions-assignments.html');
    console.log('8. You should see the wrong questions with proper text and answers');
    
    console.log('\n🎯 Expected Results:');
    console.log('===================');
    console.log('✅ Question 1 should show:');
    console.log('   - Question: "What is the formula for kinetic energy?"');
    console.log('   - Your Answer: "KE = mv²" (in red)');
    console.log('   - Correct Answer: "KE = 1/2mv²" (in green)');
    console.log('   - Assignment: "yf"');
    console.log('');
    console.log('✅ Question 2 should show:');
    console.log('   - Question: "What is Newton\'s second law of motion?"');
    console.log('   - Your Answer: "F = mv" (in red)');
    console.log('   - Correct Answer: "F = ma" (in green)');
    console.log('   - Assignment: "yf"');
    
    console.log('\n🔍 Debugging:');
    console.log('=============');
    console.log('- Open browser console (F12) to see debug logs');
    console.log('- Check localStorage for "physicsWrongQuestions"');
    console.log('- Verify questions have "questionText", "activityTitle", etc.');
    
    return testQuestions;
}

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createTestAssignmentQuestions,
        clearWrongQuestions,
        runAssignmentTest
    };
} else {
    // Make functions available globally for browser testing
    window.createTestAssignmentQuestions = createTestAssignmentQuestions;
    window.clearWrongQuestions = clearWrongQuestions;
    window.runAssignmentTest = runAssignmentTest;
}

console.log('\n🚀 Ready to test!');
console.log('Run: runAssignmentTest() to start the test');


























