// Quick fix for wrong questions - Copy and paste this into browser console
// Run this on the physics-wrong-questions-assignments.html page

(function() {
    console.log('🔧 Quick fixing wrong questions...');
    const questions = JSON.parse(localStorage.getItem('physicsWrongQuestions') || '[]');
    const fixed = questions.map(q => {
        const fixed = {...q};
        if (!fixed.questionText && fixed.text) fixed.questionText = fixed.text;
        if (!fixed.studentAnswer && fixed.userAnswer !== undefined) {
            if (fixed.questionType === 'multiple-choice' && fixed.options && fixed.options[fixed.userAnswer]) {
                fixed.studentAnswer = fixed.options[fixed.userAnswer].text || fixed.options[fixed.userAnswer];
            } else {
                fixed.studentAnswer = String(fixed.userAnswer);
            }
        }
        if (!fixed.correctAnswer && fixed.correctAnswerIndex !== undefined && fixed.options && fixed.options[fixed.correctAnswerIndex]) {
            fixed.correctAnswer = fixed.options[fixed.correctAnswerIndex].text || fixed.options[fixed.correctAnswerIndex];
        }
        if (!fixed.activityTitle && fixed.assignmentTitle) fixed.activityTitle = fixed.assignmentTitle;
        if (!fixed.activityType || fixed.activityType !== 'assignments') {
            if (fixed.source === 'assignment') fixed.activityType = 'assignments';
        }
        return fixed;
    });
    localStorage.setItem('physicsWrongQuestions', JSON.stringify(fixed));
    console.log('✅ Fixed! Refresh the page to see changes.');
    location.reload();
})();
























