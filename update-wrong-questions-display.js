// Script to update all wrong questions pages with quiz-style display
// This script can be run to apply the same visual improvements to all wrong questions pages

const fs = require('fs');
const path = require('path');

// List of all wrong questions pages to update
const wrongQuestionsPages = [
    'physics-wrong-questions-assignments.html',
    'physics-wrong-questions-quizzes.html', 
    'physics-wrong-questions-exams.html',
    'mathematics-wrong-questions-assignments.html',
    'mathematics-wrong-questions-quizzes.html',
    'mathematics-wrong-questions-exams.html',
    'chemistry-wrong-questions-assignments.html',
    'chemistry-wrong-questions-quizzes.html',
    'chemistry-wrong-questions-exams.html',
    'physics-wrong-questions.html',
    'mathematics-wrong-questions.html',
    'chemistry-wrong-questions.html'
];

// CSS styles to add
const quizDisplayCSS = `
        /* Quiz-style question display */
        .quiz-question-display {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border: 2px solid #e9ecef;
        }

        .question-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            border-radius: 8px;
            margin: 1rem 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: transform 0.3s ease;
        }

        .question-image:hover {
            transform: scale(1.02);
        }

        .quiz-question-display .question-text {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: #333;
            line-height: 1.5;
        }

        .answer-section {
            margin-top: 2rem;
            padding: 1.5rem;
            border-radius: 8px;
            border: 2px solid #e9ecef;
        }

        .answer-section.student-answer {
            background: #fef2f2;
            border-color: #fca5a5;
        }

        .answer-section.correct-answer {
            background: #f0fdf4;
            border-color: #86efac;
        }

        .answer-label {
            font-weight: 700;
            font-size: 1rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .answer-label.student {
            color: #dc2626;
        }

        .answer-label.correct {
            color: #16a34a;
        }

        .answer-content {
            font-size: 1.1rem;
            line-height: 1.6;
        }

        .answer-image {
            width: 100%;
            max-width: 400px;
            height: auto;
            border-radius: 6px;
            margin-top: 1rem;
            cursor: pointer;
            transition: transform 0.3s ease;
        }

        .answer-image:hover {
            transform: scale(1.02);
        }

        .option-item {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            padding: 1rem;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .option-item.student-selected {
            border-color: #dc2626;
            background: #fef2f2;
        }

        .option-item.correct-answer {
            border-color: #16a34a;
            background: #f0fdf4;
        }

        .option-item.student-selected.correct-answer {
            border-color: #16a34a;
            background: #f0fdf4;
        }

        .option-radio {
            margin-right: 1rem;
            transform: scale(1.2);
        }

        .option-text {
            flex: 1;
            font-size: 1rem;
            font-weight: 500;
        }

        .option-status {
            margin-left: 1rem;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .option-status.correct {
            background: #dcfce7;
            color: #16a34a;
        }

        .option-status.incorrect {
            background: #fee2e2;
            color: #dc2626;
        }`;

// JavaScript function to generate quiz-style display
const quizDisplayJS = `
            container.innerHTML = filteredQuestions.map(question => {
                // Generate quiz-style display based on question type
                if (question.questionType === 'multiple-choice' && question.options) {
                    return \`
                        <div class="quiz-question-display">
                            <div class="question-text">\${question.questionText || 'Question text not available'}</div>
                            
                            \${question.questionImage ? \`
                                <img src="\${question.questionImage}" alt="Question Image" class="question-image" onclick="openImageModal('\${question.questionImage}', 'Question Image')">
                            \` : ''}
                            
                            <div class="question-options">
                                \${question.options.map((option, index) => {
                                    const isStudentSelected = question.userAnswer === index;
                                    const isCorrectAnswer = question.correctAnswerIndex === index;
                                    let optionClass = 'option-item';
                                    let statusBadge = '';
                                    
                                    if (isStudentSelected && isCorrectAnswer) {
                                        optionClass += ' student-selected correct-answer';
                                        statusBadge = '<span class="option-status correct">Your Answer & Correct</span>';
                                    } else if (isStudentSelected) {
                                        optionClass += ' student-selected';
                                        statusBadge = '<span class="option-status incorrect">Your Answer</span>';
                                    } else if (isCorrectAnswer) {
                                        optionClass += ' correct-answer';
                                        statusBadge = '<span class="option-status correct">Correct Answer</span>';
                                    }
                                    
                                    return \`
                                        <div class="\${optionClass}">
                                            <input type="radio" class="option-radio" \${isStudentSelected ? 'checked' : ''} disabled>
                                            <span class="option-text">\${option.text || option}</span>
                                            \${statusBadge}
                                        </div>
                                    \`;
                                }).join('')}
                            </div>
                            
                            <div class="question-meta">
                                <span class="chapter-badge">Assignment: \${question.activityTitle || question.assignmentTitle || 'Unknown Assignment'}</span>
                                <span class="attempts-badge">\${question.attempts} attempt\${question.attempts > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    \`;
                } else {
                    // Text or file upload questions
                    return \`
                        <div class="quiz-question-display">
                            <div class="question-text">\${question.questionText || 'Question text not available'}</div>
                            
                            \${question.questionImage ? \`
                                <img src="\${question.questionImage}" alt="Question Image" class="question-image" onclick="openImageModal('\${question.questionImage}', 'Question Image')">
                            \` : ''}
                            
                            <div class="answer-section student-answer">
                                <div class="answer-label student">
                                    <iconify-icon icon="material-symbols:person"></iconify-icon>
                                    Your Answer
                                </div>
                                <div class="answer-content">
                                    \${question.studentAnswerImage ? \`
                                        <img src="\${question.studentAnswerImage}" alt="Your Answer" class="answer-image" onclick="openImageModal('\${question.studentAnswerImage}', 'Your Answer')">
                                    \` : \`
                                        \${question.studentAnswer || 'No answer provided'}
                                    \`}
                                </div>
                            </div>
                            
                            <div class="answer-section correct-answer">
                                <div class="answer-label correct">
                                    <iconify-icon icon="material-symbols:check-circle"></iconify-icon>
                                    Correct Answer
                                </div>
                                <div class="answer-content">
                                    \${question.correctAnswerImage ? \`
                                        <img src="\${question.correctAnswerImage}" alt="Correct Answer" class="answer-image" onclick="openImageModal('\${question.correctAnswerImage}', 'Correct Answer')">
                                    \` : \`
                                        \${question.correctAnswer || 'Correct answer not provided'}
                                    \`}
                                </div>
                            </div>
                            
                            <div class="question-meta">
                                <span class="chapter-badge">Assignment: \${question.activityTitle || question.assignmentTitle || 'Unknown Assignment'}</span>
                                <span class="attempts-badge">\${question.attempts} attempt\${question.attempts > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    \`;
                }
            }).join('');`;

console.log('Wrong Questions Display Update Script');
console.log('=====================================');
console.log('This script would update the following files:');
wrongQuestionsPages.forEach(page => {
    console.log(`- ${page}`);
});

console.log('\nTo apply these changes:');
console.log('1. Add the CSS styles to each file after the existing image styles');
console.log('2. Replace the question display JavaScript with the quiz-style version');
console.log('3. Test the display with sample wrong questions');

console.log('\nThe updated display will show:');
console.log('- Questions as large, clear text with images');
console.log('- Multiple choice options with visual styling');
console.log('- Student answers in red (incorrect)');
console.log('- Correct answers in green');
console.log('- Interactive image viewing');
console.log('- Status badges for each option');

module.exports = {
    wrongQuestionsPages,
    quizDisplayCSS,
    quizDisplayJS
};


























