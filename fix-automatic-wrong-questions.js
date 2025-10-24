// Script to fix automatic wrong question creation in all quiz pages
// This script adds the createWrongQuestionEntry function and modifies submitQuiz to automatically create wrong questions

const fs = require('fs');
const path = require('path');

// List of quiz pages to update
const quizPages = [
    'physics-quiz.html',
    'mathematics-quiz.html', 
    'chemistry-quiz.html'
];

// The createWrongQuestionEntry function to add
const createWrongQuestionEntryFunction = `
        // Function to automatically create wrong question entries
        function createWrongQuestionEntry(question, questionIndex, activityType) {
            const wrongQuestion = {
                id: 'wrong_' + Date.now() + '_' + questionIndex,
                questionId: question.id,
                questionText: question.text, // This is the key field
                studentAnswer: question.options && question.options[userAnswers[questionIndex]] ? 
                              question.options[userAnswers[questionIndex]] : 
                              userAnswers[questionIndex] || 'No answer provided',
                correctAnswer: question.options && question.options[question.correctAnswer] ? 
                              question.options[question.correctAnswer] : 
                              question.correctAnswer || 'Correct answer not provided',
                course: getCourseFromPage(), // Dynamic course detection
                activityType: activityType + 's', // quizzes, assignments, exams
                activityTitle: currentQuiz.title, // Use quiz title like "yf"
                questionType: question.type,
                studentName: 'Student',
                studentId: 'student_001',
                difficulty: question.difficulty || 'medium',
                notes: 'Automatically created from incorrect quiz answer',
                attempts: 1,
                createdAt: new Date().toISOString(),
                source: activityType,
                subject: getCourseFromPage(),
                // Multiple choice specific fields
                options: question.options || null,
                userAnswer: userAnswers[questionIndex] || null,
                correctAnswerIndex: question.correctAnswer || null,
                // Ensure proper categorization
                inActivityFolder: true
            };

            // Save to wrong questions collection
            const course = getCourseFromPage();
            const wrongQuestions = JSON.parse(localStorage.getItem(course + 'WrongQuestions') || '[]');
            wrongQuestions.push(wrongQuestion);
            localStorage.setItem(course + 'WrongQuestions', JSON.stringify(wrongQuestions));
            
            console.log('Created wrong question entry:', wrongQuestion);
        }

        // Helper function to get course name from page
        function getCourseFromPage() {
            const pageName = window.location.pathname;
            if (pageName.includes('physics')) return 'physics';
            if (pageName.includes('mathematics')) return 'mathematics';
            if (pageName.includes('chemistry')) return 'chemistry';
            return 'physics'; // Default fallback
        }`;

// The modified submitQuiz logic
const submitQuizModification = `
            currentQuiz.questions.forEach((question, index) => {
                totalPoints += question.points || 1;
                if (question.type === 'multiple-choice') {
                    if (userAnswers[index] === question.correctAnswer) {
                        score += question.points || 1;
                    } else {
                        // Student answered incorrectly - create wrong question entry
                        createWrongQuestionEntry(question, index, 'quiz');
                    }
                } else if (question.type === 'text' || question.type === 'file') {
                    // For text and file questions, no automatic scoring - manual grading required
                    hasManualGradingQuestions = true;
                }
            });`;

console.log('Automatic Wrong Questions Fix Script');
console.log('====================================');
console.log('This script will update the following quiz pages:');
quizPages.forEach(page => {
    console.log(`- ${page}`);
});

console.log('\nChanges to be applied:');
console.log('1. Add createWrongQuestionEntry() function');
console.log('2. Modify submitQuiz() to automatically create wrong questions for incorrect answers');
console.log('3. Add helper function to detect course from page URL');

console.log('\nExpected behavior after fix:');
console.log('- When students answer multiple choice questions incorrectly, wrong questions are automatically created');
console.log('- Wrong questions will have proper question text, assignment title, and answers');
console.log('- Questions are automatically categorized into correct activity folders');
console.log('- No more "Question text not available" or "Unknown Assignment"');

console.log('\nTo apply these changes manually:');
console.log('1. Add the createWrongQuestionEntry function after the submitQuiz function');
console.log('2. Replace the forEach loop in submitQuiz with the modified version');
console.log('3. Test by creating a quiz in teacher panel and answering incorrectly');

module.exports = {
    quizPages,
    createWrongQuestionEntryFunction,
    submitQuizModification
};


























