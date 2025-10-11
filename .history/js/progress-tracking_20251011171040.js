/**
 * Progress Tracking Module
 * Handles homework, quiz, and exam statistics across all courses
 */

// Load all progress tracking data for a specific course
function loadCourseProgressData(courseName) {
    loadHomeworkStats(courseName);
    loadQuizStats(courseName);
    loadExamStats(courseName);
    loadRecentGrades(courseName);
    calculateAverageGrades(courseName);
}

// Load homework statistics
function loadHomeworkStats(courseName) {
    const homeworks = JSON.parse(localStorage.getItem(`${courseName}TeacherAssignments`) || '[]');
    const total = homeworks.length;
    const done = homeworks.filter(hw => hw.submitted || hw.status === 'submitted' || hw.status === 'completed').length;
    const pending = homeworks.filter(hw => (!hw.submitted && !hw.status) || hw.status === 'pending').length;
    const late = homeworks.filter(hw => {
        if (hw.deadline && !hw.submitted) {
            return new Date(hw.deadline) < new Date();
        }
        return false;
    }).length;

    document.getElementById('homeworkScore').textContent = `${done}/${total}`;
    document.getElementById('homeworkDone').textContent = done;
    document.getElementById('homeworkPending').textContent = pending;
    document.getElementById('homeworkLate').textContent = late;
    
    const percentage = total > 0 ? (done / total) * 100 : 0;
    document.getElementById('homeworkProgress').style.width = percentage + '%';
}

// Load quiz statistics
function loadQuizStats(courseName) {
    const quizzes = JSON.parse(localStorage.getItem(`${courseName}Quizzes`) || '[]');
    const teacherQuizzes = JSON.parse(localStorage.getItem(`${courseName}TeacherQuizzes`) || '[]');
    const allQuizzes = [...quizzes, ...teacherQuizzes];
    
    const total = allQuizzes.length;
    const done = allQuizzes.filter(q => q.completed || q.status === 'completed' || q.score !== undefined).length;
    const pending = allQuizzes.filter(q => !q.completed && !q.score && q.status !== 'completed').length;
    const late = allQuizzes.filter(q => {
        if (q.deadline && !q.completed) {
            return new Date(q.deadline) < new Date();
        }
        return false;
    }).length;

    document.getElementById('quizScore').textContent = `${done}/${total}`;
    document.getElementById('quizDone').textContent = done;
    document.getElementById('quizPending').textContent = pending;
    document.getElementById('quizLate').textContent = late;
    
    const percentage = total > 0 ? (done / total) * 100 : 0;
    document.getElementById('quizProgress').style.width = percentage + '%';
}

// Load exam statistics
function loadExamStats(courseName) {
    const exams = JSON.parse(localStorage.getItem(`${courseName}Exams`) || '[]');
    const teacherExams = JSON.parse(localStorage.getItem(`${courseName}TeacherExams`) || '[]');
    const allExams = [...exams, ...teacherExams];
    
    const total = allExams.length;
    const done = allExams.filter(e => e.completed || e.status === 'completed' || e.score !== undefined).length;
    const pending = allExams.filter(e => !e.completed && !e.score && e.status !== 'completed').length;
    const late = allExams.filter(e => {
        if (e.deadline && !e.completed) {
            return new Date(e.deadline) < new Date();
        }
        return false;
    }).length;

    document.getElementById('examScore').textContent = `${done}/${total}`;
    document.getElementById('examDone').textContent = done;
    document.getElementById('examPending').textContent = pending;
    document.getElementById('examLate').textContent = late;
    
    const percentage = total > 0 ? (done / total) * 100 : 0;
    document.getElementById('examProgress').style.width = percentage + '%';
}

// Load recent month grades (last 30 days)
function loadRecentGrades(courseName) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Recent Quizzes
    const quizzes = JSON.parse(localStorage.getItem(`${courseName}Quizzes`) || '[]');
    const teacherQuizzes = JSON.parse(localStorage.getItem(`${courseName}TeacherQuizzes`) || '[]');
    const allQuizzes = [...quizzes, ...teacherQuizzes];
    
    const recentQuizzes = allQuizzes.filter(q => {
        if (q.completedAt || q.submittedAt) {
            const completedDate = new Date(q.completedAt || q.submittedAt);
            return completedDate >= thirtyDaysAgo && q.score !== undefined;
        }
        return false;
    }).sort((a, b) => new Date(b.completedAt || b.submittedAt) - new Date(a.completedAt || a.submittedAt)).slice(0, 5);

    const recentQuizGradesEl = document.getElementById('recentQuizGrades');
    if (recentQuizzes.length > 0) {
        recentQuizGradesEl.innerHTML = recentQuizzes.map(q => {
            const score = q.score || 0;
            const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
            return `
                <div style="padding: 0.5rem 1rem; background: ${color}; color: white; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">
                    ${score}%
                </div>
            `;
        }).join('');
    } else {
        recentQuizGradesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">No quizzes completed in the last month</span>';
    }

    // Recent Exams
    const exams = JSON.parse(localStorage.getItem(`${courseName}Exams`) || '[]');
    const teacherExams = JSON.parse(localStorage.getItem(`${courseName}TeacherExams`) || '[]');
    const allExams = [...exams, ...teacherExams];
    
    const recentExams = allExams.filter(e => {
        if (e.completedAt || e.submittedAt) {
            const completedDate = new Date(e.completedAt || e.submittedAt);
            return completedDate >= thirtyDaysAgo && e.score !== undefined;
        }
        return false;
    }).sort((a, b) => new Date(b.completedAt || b.submittedAt) - new Date(a.completedAt || a.submittedAt)).slice(0, 5);

    const recentExamGradesEl = document.getElementById('recentExamGrades');
    if (recentExams.length > 0) {
        recentExamGradesEl.innerHTML = recentExams.map(e => {
            const score = e.score || 0;
            const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
            return `
                <div style="padding: 0.5rem 1rem; background: ${color}; color: white; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">
                    ${score}%
                </div>
            `;
        }).join('');
    } else {
        recentExamGradesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">No exams completed in the last month</span>';
    }
}

// Calculate average grades
function calculateAverageGrades(courseName) {
    // Quiz Average
    const quizzes = JSON.parse(localStorage.getItem(`${courseName}Quizzes`) || '[]');
    const teacherQuizzes = JSON.parse(localStorage.getItem(`${courseName}TeacherQuizzes`) || '[]');
    const allQuizzes = [...quizzes, ...teacherQuizzes];
    const completedQuizzes = allQuizzes.filter(q => q.score !== undefined);
    
    if (completedQuizzes.length > 0) {
        const avgQuiz = Math.round(completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length);
        document.getElementById('avgQuizGrade').textContent = avgQuiz;
    } else {
        document.getElementById('avgQuizGrade').textContent = '--';
    }

    // Exam Average
    const exams = JSON.parse(localStorage.getItem(`${courseName}Exams`) || '[]');
    const teacherExams = JSON.parse(localStorage.getItem(`${courseName}TeacherExams`) || '[]');
    const allExams = [...exams, ...teacherExams];
    const completedExams = allExams.filter(e => e.score !== undefined);
    
    if (completedExams.length > 0) {
        const avgExam = Math.round(completedExams.reduce((sum, e) => sum + (e.score || 0), 0) / completedExams.length);
        document.getElementById('avgExamGrade').textContent = avgExam;
    } else {
        document.getElementById('avgExamGrade').textContent = '--';
    }
}

// Load daily practice stats
function loadDailyPracticeStats(courseName) {
    const stats = JSON.parse(localStorage.getItem(`${courseName}DailyPracticeStats`) || '{"streak": 0, "solved": 0, "correct": 0}');
    
    const streakEl = document.getElementById('dailyPracticeStreak');
    const solvedEl = document.getElementById('dailyPracticeSolved');
    const accuracyEl = document.getElementById('dailyPracticeAccuracy');
    
    if (streakEl) streakEl.textContent = stats.streak || 0;
    if (solvedEl) solvedEl.textContent = stats.solved || 0;
    
    const accuracy = stats.solved > 0 ? Math.round((stats.correct / stats.solved) * 100) : 0;
    if (accuracyEl) accuracyEl.textContent = accuracy + '%';
}

// Show all quiz grades with bar chart
function showAllQuizGrades(courseName) {
    const quizzes = JSON.parse(localStorage.getItem(`${courseName}Quizzes`) || '[]');
    const teacherQuizzes = JSON.parse(localStorage.getItem(`${courseName}TeacherQuizzes`) || '[]');
    const allQuizzes = [...quizzes, ...teacherQuizzes];
    const completedQuizzes = allQuizzes.filter(q => q.score !== undefined);

    if (completedQuizzes.length === 0) {
        alert('No quiz grades available yet. Complete some quizzes first!');
        return;
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('quizGradesModal'));
    modal.show();

    // Create chart
    const ctx = document.getElementById('quizGradesChart').getContext('2d');
    
    // Destroy existing chart if any
    if (window.quizChart) {
        window.quizChart.destroy();
    }

    const labels = completedQuizzes.map((q, i) => q.title || `Quiz ${i + 1}`);
    const scores = completedQuizzes.map(q => q.score || 0);

    window.quizChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quiz Scores (%)',
                data: scores,
                backgroundColor: scores.map(s => {
                    if (s >= 80) return 'rgba(16, 185, 129, 0.7)';
                    if (s >= 60) return 'rgba(245, 158, 11, 0.7)';
                    return 'rgba(239, 68, 68, 0.7)';
                }),
                borderColor: scores.map(s => {
                    if (s >= 80) return 'rgb(16, 185, 129)';
                    if (s >= 60) return 'rgb(245, 158, 11)';
                    return 'rgb(239, 68, 68)';
                }),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Score: ' + context.parsed.y + '%';
                        }
                    }
                }
            }
        }
    });

    // Show details
    const detailsEl = document.getElementById('quizGradesDetails');
    detailsEl.innerHTML = `
        <h6 class="mb-3" style="font-weight: 700;">Quiz Details</h6>
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Quiz</th>
                        <th>Score</th>
                        <th>Grade</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${completedQuizzes.map(q => {
                        const score = q.score || 0;
                        const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
                        const gradeColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
                        return `
                            <tr>
                                <td>${q.title || 'Quiz'}</td>
                                <td><span class="badge" style="background: ${gradeColor};">${score}%</span></td>
                                <td><span style="color: ${gradeColor}; font-weight: 700;">${grade}</span></td>
                                <td style="font-size: 0.85rem; color: #64748b;">${q.completedAt ? new Date(q.completedAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Show all exam grades with bar chart
function showAllExamGrades(courseName) {
    const exams = JSON.parse(localStorage.getItem(`${courseName}Exams`) || '[]');
    const teacherExams = JSON.parse(localStorage.getItem(`${courseName}TeacherExams`) || '[]');
    const allExams = [...exams, ...teacherExams];
    const completedExams = allExams.filter(e => e.score !== undefined);

    if (completedExams.length === 0) {
        alert('No exam grades available yet. Complete some exams first!');
        return;
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('examGradesModal'));
    modal.show();

    // Create chart
    const ctx = document.getElementById('examGradesChart').getContext('2d');
    
    // Destroy existing chart if any
    if (window.examChart) {
        window.examChart.destroy();
    }

    const labels = completedExams.map((e, i) => e.title || `Exam ${i + 1}`);
    const scores = completedExams.map(e => e.score || 0);

    window.examChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Exam Scores (%)',
                data: scores,
                backgroundColor: scores.map(s => {
                    if (s >= 80) return 'rgba(139, 92, 246, 0.7)';
                    if (s >= 60) return 'rgba(245, 158, 11, 0.7)';
                    return 'rgba(239, 68, 68, 0.7)';
                }),
                borderColor: scores.map(s => {
                    if (s >= 80) return 'rgb(139, 92, 246)';
                    if (s >= 60) return 'rgb(245, 158, 11)';
                    return 'rgb(239, 68, 68)';
                }),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Score: ' + context.parsed.y + '%';
                        }
                    }
                }
            }
        }
    });

    // Show details
    const detailsEl = document.getElementById('examGradesDetails');
    detailsEl.innerHTML = `
        <h6 class="mb-3" style="font-weight: 700;">Exam Details</h6>
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Exam</th>
                        <th>Score</th>
                        <th>Grade</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${completedExams.map(e => {
                        const score = e.score || 0;
                        const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
                        const gradeColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
                        return `
                            <tr>
                                <td>${e.title || 'Exam'}</td>
                                <td><span class="badge" style="background: ${gradeColor};">${score}%</span></td>
                                <td><span style="color: ${gradeColor}; font-weight: 700;">${grade}</span></td>
                                <td style="font-size: 0.85rem; color: #64748b;">${e.completedAt ? new Date(e.completedAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

