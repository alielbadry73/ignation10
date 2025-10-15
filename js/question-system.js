/**
 * Advanced Question System for IG Nation
 * Handles multiple question types, answer formats, and automatic wrong question categorization
 */

class QuestionSystem {
    constructor(course) {
        this.course = course;
        this.questions = this.loadQuestions();
        this.submissions = this.loadSubmissions();
        this.wrongQuestions = this.loadWrongQuestions();
    }

    // Data Management
    loadQuestions() {
        return JSON.parse(localStorage.getItem(`${this.course}Questions`) || '[]');
    }

    loadSubmissions() {
        return JSON.parse(localStorage.getItem(`${this.course}Submissions`) || '[]');
    }

    loadWrongQuestions() {
        return JSON.parse(localStorage.getItem(`${this.course}WrongQuestions`) || '[]');
    }

    saveQuestions() {
        localStorage.setItem(`${this.course}Questions`, JSON.stringify(this.questions));
    }

    saveSubmissions() {
        localStorage.setItem(`${this.course}Submissions`, JSON.stringify(this.submissions));
    }

    saveWrongQuestions() {
        localStorage.setItem(`${this.course}WrongQuestions`, JSON.stringify(this.wrongQuestions));
    }

    // Question Creation
    createQuestion(questionData) {
        const question = {
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            course: this.course,
            ...questionData,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        this.questions.push(question);
        this.saveQuestions();
        return question;
    }

    // Question Types
    createTextQuestion(content, answerFormat, expectedAnswer, acceptedFileTypes = []) {
        return this.createQuestion({
            questionType: 'text',
            content: content,
            answerFormat: answerFormat,
            expectedAnswer: expectedAnswer,
            acceptedFileTypes: acceptedFileTypes
        });
    }

    createFileQuestion(content, files, answerFormat, expectedAnswer, acceptedFileTypes = []) {
        return this.createQuestion({
            questionType: 'file',
            content: content,
            files: files,
            answerFormat: answerFormat,
            expectedAnswer: expectedAnswer,
            acceptedFileTypes: acceptedFileTypes
        });
    }

    createMultipleChoiceQuestion(content, options, correctAnswerIndex, explanation = '') {
        return this.createQuestion({
            questionType: 'multiple-choice',
            content: content,
            options: options.map((text, index) => ({
                id: index,
                text: text,
                isCorrect: index === correctAnswerIndex
            })),
            correctAnswer: correctAnswerIndex,
            explanation: explanation
        });
    }

    // Submission Handling
    submitAnswer(questionId, studentId, studentAnswer, studentFiles = []) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) {
            throw new Error('Question not found');
        }

        const submission = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            questionId: questionId,
            studentId: studentId,
            studentAnswer: studentAnswer,
            studentFiles: studentFiles,
            submittedAt: new Date().toISOString(),
            status: 'pending',
            grade: null,
            maxGrade: this.getQuestionMaxGrade(question)
        };

        this.submissions.push(submission);
        this.saveSubmissions();
        return submission;
    }

    // Grading System
    gradeSubmission(submissionId, grade, feedback = '', isCorrect = null) {
        const submission = this.submissions.find(s => s.id === submissionId);
        if (!submission) {
            throw new Error('Submission not found');
        }

        submission.grade = grade;
        submission.feedback = feedback;
        submission.gradedAt = new Date().toISOString();
        submission.status = 'graded';

        // Auto-determine correctness if not provided
        if (isCorrect === null) {
            const question = this.questions.find(q => q.id === submission.questionId);
            isCorrect = this.isAnswerCorrect(question, submission.studentAnswer);
        }

        if (!isCorrect) {
            submission.status = 'incorrect';
            // Automatically add to wrong questions if it's a multiple choice question
            const question = this.questions.find(q => q.id === submission.questionId);
            if (question && question.questionType === 'multiple-choice') {
                this.addToWrongQuestions(submission, question);
            }
        }

        this.saveSubmissions();
        return submission;
    }

    // Wrong Questions Management
    addToWrongQuestions(submission, question, notes = '', difficulty = 'medium') {
        // Check if already exists to avoid duplicates
        const existingWrong = this.wrongQuestions.find(wq => 
            wq.questionId === submission.questionId && 
            wq.studentId === submission.studentId
        );

        if (existingWrong) {
            existingWrong.attempts += 1;
            existingWrong.lastAttemptAt = new Date().toISOString();
            existingWrong.lastAnswer = submission.studentAnswer;
            existingWrong.notes = notes;
        } else {
            const wrongQuestion = {
                id: `wrong_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                questionId: submission.questionId,
                questionText: question.content,
                studentAnswer: submission.studentAnswer,
                correctAnswer: this.getCorrectAnswer(question),
                course: this.course,
                activityType: this.getActivityTypeFromQuestion(question),
                activityTitle: this.getActivityTitleFromQuestion(question),
                questionType: question.questionType,
                studentId: submission.studentId,
                studentName: this.getStudentName(submission.studentId),
                difficulty: difficulty,
                notes: notes,
                attempts: 1,
                createdAt: new Date().toISOString(),
                source: this.getActivityTypeFromQuestion(question),
                folderId: null,
                subfolderId: null
            };

            this.wrongQuestions.push(wrongQuestion);
        }

        this.saveWrongQuestions();
    }

    // Helper Methods
    getQuestionMaxGrade(question) {
        // Default grading scale
        switch (question.questionType) {
            case 'multiple-choice': return 5;
            case 'text': return 10;
            case 'file': return 15;
            default: return 10;
        }
    }

    isAnswerCorrect(question, studentAnswer) {
        switch (question.questionType) {
            case 'multiple-choice':
                return studentAnswer === question.correctAnswer;
            case 'text':
                // For text questions, this would typically require manual grading
                // or advanced text comparison algorithms
                return false; // Default to requiring manual grading
            case 'file':
                // File submissions always require manual grading
                return false;
            default:
                return false;
        }
    }

    getCorrectAnswer(question) {
        switch (question.questionType) {
            case 'multiple-choice':
                return question.options[question.correctAnswer].text;
            case 'text':
            case 'file':
                return question.expectedAnswer;
            default:
                return '';
        }
    }

    getActivityTypeFromQuestion(question) {
        // This would be determined by where the question was created
        // For now, we'll use a simple mapping or default
        return question.activityType || 'assignment';
    }

    getActivityTitleFromQuestion(question) {
        return question.activityTitle || `${this.course} Activity`;
    }

    getStudentName(studentId) {
        // This would typically come from a user management system
        const students = {
            'ST001': 'Ahmed Mohamed',
            'ST002': 'Fatima Ali',
            'ST003': 'Mohamed Hassan',
            'ST004': 'Nour Ahmed',
            'ST005': 'Omar Ibrahim'
        };
        return students[studentId] || `Student ${studentId}`;
    }

    // Question Retrieval
    getQuestionsByActivity(activityType) {
        return this.questions.filter(q => 
            q.activityType === activityType && q.status === 'active'
        );
    }

    getQuestionsByType(questionType) {
        return this.questions.filter(q => 
            q.questionType === questionType && q.status === 'active'
        );
    }

    getQuestionById(questionId) {
        return this.questions.find(q => q.id === questionId);
    }

    // Submission Retrieval
    getSubmissionsByStudent(studentId) {
        return this.submissions.filter(s => s.studentId === studentId);
    }

    getSubmissionsByQuestion(questionId) {
        return this.submissions.filter(s => s.questionId === questionId);
    }

    getPendingSubmissions() {
        return this.submissions.filter(s => s.status === 'pending');
    }

    // Wrong Questions Retrieval
    getWrongQuestionsByActivity(activityType) {
        return this.wrongQuestions.filter(wq => wq.activityType === activityType);
    }

    getWrongQuestionsByStudent(studentId) {
        return this.wrongQuestions.filter(wq => wq.studentId === studentId);
    }

    // Statistics
    getStatistics() {
        return {
            totalQuestions: this.questions.length,
            totalSubmissions: this.submissions.length,
            pendingSubmissions: this.submissions.filter(s => s.status === 'pending').length,
            gradedSubmissions: this.submissions.filter(s => s.status === 'graded').length,
            incorrectSubmissions: this.submissions.filter(s => s.status === 'incorrect').length,
            totalWrongQuestions: this.wrongQuestions.length,
            wrongQuestionsByActivity: {
                assignment: this.getWrongQuestionsByActivity('assignment').length,
                quiz: this.getWrongQuestionsByActivity('quiz').length,
                exam: this.getWrongQuestionsByActivity('exam').length
            }
        };
    }

    // File Handling
    handleFileUpload(files, acceptedTypes = []) {
        const processedFiles = [];
        
        Array.from(files).forEach(file => {
            if (this.isValidFileType(file, acceptedTypes)) {
                processedFiles.push({
                    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    data: this.fileToBase64(file) // In a real system, this would be uploaded to a server
                });
            }
        });

        return processedFiles;
    }

    isValidFileType(file, acceptedTypes) {
        if (acceptedTypes.length === 0) return true;

        const fileExtension = file.name.split('.').pop().toLowerCase();
        const mimeTypes = {
            'pdf': ['application/pdf'],
            'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            'document': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        };

        return acceptedTypes.some(type => {
            if (mimeTypes[type]) {
                return mimeTypes[type].includes(file.type);
            }
            return fileExtension === type;
        });
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Auto-categorization for wrong questions
    autoCategorizeWrongQuestions() {
        this.wrongQuestions.forEach(wrongQuestion => {
            if (!wrongQuestion.activityType) {
                // Try to determine activity type from question content or context
                const activityType = this.determineActivityType(wrongQuestion);
                wrongQuestion.activityType = activityType;
                wrongQuestion.source = activityType;
            }
        });
        this.saveWrongQuestions();
    }

    determineActivityType(wrongQuestion) {
        // Enhanced keyword-based categorization
        const assignmentTitle = (wrongQuestion.assignmentTitle || '').toLowerCase();
        const questionType = (wrongQuestion.questionType || '').toLowerCase();
        const activityTitle = (wrongQuestion.activityTitle || '').toLowerCase();
        const content = (wrongQuestion.questionText + ' ' + wrongQuestion.activityTitle).toLowerCase();
        
        // Check for exam keywords
        if (assignmentTitle.includes('exam') || assignmentTitle.includes('final') || assignmentTitle.includes('midterm') || 
            questionType.includes('exam') || activityTitle.includes('exam') || content.includes('exam')) {
            return 'exams';
        } 
        // Check for quiz keywords
        else if (assignmentTitle.includes('quiz') || assignmentTitle.includes('test') || 
                 questionType.includes('quiz') || activityTitle.includes('quiz') || content.includes('quiz')) {
            return 'quizzes';
        } 
        // Check for assignment keywords
        else if (assignmentTitle.includes('assignment') || assignmentTitle.includes('homework') || 
                 assignmentTitle.includes('practice') || questionType.includes('assignment') || 
                 questionType.includes('homework') || activityTitle.includes('assignment') || 
                 content.includes('assignment') || content.includes('homework')) {
            return 'assignments';
        }
        
        return 'assignments'; // Default fallback
    }

    // Export/Import functionality
    exportQuestions(format = 'json') {
        const data = {
            course: this.course,
            questions: this.questions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
        
        // Could add CSV, XML, or other formats here
        return data;
    }

    importQuestions(data) {
        try {
            const imported = typeof data === 'string' ? JSON.parse(data) : data;
            
            if (imported.course !== this.course) {
                throw new Error('Course mismatch');
            }

            // Merge questions, avoiding duplicates
            imported.questions.forEach(importedQuestion => {
                const exists = this.questions.find(q => q.id === importedQuestion.id);
                if (!exists) {
                    this.questions.push(importedQuestion);
                }
            });

            this.saveQuestions();
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }
}

// Global instance management
const questionSystems = {};

function getQuestionSystem(course) {
    if (!questionSystems[course]) {
        questionSystems[course] = new QuestionSystem(course);
    }
    return questionSystems[course];
}

// Utility functions for easy integration
function createQuestion(course, questionData) {
    const system = getQuestionSystem(course);
    return system.createQuestion(questionData);
}

function submitAnswer(course, questionId, studentId, answer, files = []) {
    const system = getQuestionSystem(course);
    return system.submitAnswer(questionId, studentId, answer, files);
}

function gradeSubmission(course, submissionId, grade, feedback, isCorrect) {
    const system = getQuestionSystem(course);
    return system.gradeSubmission(submissionId, grade, feedback, isCorrect);
}

function addToWrongQuestions(course, submission, question, notes, difficulty) {
    const system = getQuestionSystem(course);
    return system.addToWrongQuestions(submission, question, notes, difficulty);
}

function getWrongQuestions(course, activityType = null) {
    const system = getQuestionSystem(course);
    if (activityType) {
        return system.getWrongQuestionsByActivity(activityType);
    }
    return system.wrongQuestions;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestionSystem, getQuestionSystem, createQuestion, submitAnswer, gradeSubmission, addToWrongQuestions, getWrongQuestions };
}
