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
    // Use student assignments (published items)
    const homeworks = JSON.parse(localStorage.getItem(`${courseName}Assignments`) || '[]');
    
    console.log(`=== PROGRESS: ${courseName} Assignments ===`);
    console.log('Student assignments (published):', homeworks);
    
    // Filter ONLY by subject - match what homework page shows
    const subjectHomeworks = homeworks.filter(hw => hw.subject === courseName.toLowerCase());
    
    console.log('Filtered assignments by subject:', subjectHomeworks);
    console.log('Assignment items detail:', subjectHomeworks.map(hw => ({id: hw.id, title: hw.title, subject: hw.subject, published: hw.published})));
    
    const total = subjectHomeworks.length;
    const done = subjectHomeworks.filter(hw => hw.submitted || hw.status === 'submitted' || hw.status === 'completed').length;
    const pending = subjectHomeworks.filter(hw => (!hw.submitted && !hw.status) || hw.status === 'pending').length;
    const late = subjectHomeworks.filter(hw => {
        if (hw.deadline && !hw.submitted) {
            return new Date(hw.deadline) < new Date();
        }
        return false;
    }).length;

    // Check if elements exist before setting textContent
    const homeworkScoreEl = document.getElementById('homeworkScore');
    const homeworkDoneEl = document.getElementById('homeworkDone');
    const homeworkPendingEl = document.getElementById('homeworkPending');
    const homeworkLateEl = document.getElementById('homeworkLate');
    
    if (homeworkScoreEl) homeworkScoreEl.textContent = `${done}/${total}`;
    if (homeworkDoneEl) homeworkDoneEl.textContent = done;
    if (homeworkPendingEl) homeworkPendingEl.textContent = pending;
    if (homeworkLateEl) homeworkLateEl.textContent = late;
    
    const percentage = total > 0 ? (done / total) * 100 : 0;
    const homeworkProgressEl = document.getElementById('homeworkProgress');
    if (homeworkProgressEl) homeworkProgressEl.style.width = percentage + '%';
}

// Load quiz statistics
function loadQuizStats(courseName) {
    // Use student quizzes (same as quiz page) - these are published items
    const quizzes = JSON.parse(localStorage.getItem(`${courseName}Quizzes`) || '[]');
    
    console.log(`=== PROGRESS: ${courseName} Quizzes ===`);
    console.log('Student quizzes (published):', quizzes);
    
    // Filter ONLY by subject - match what quiz page shows
    const subjectQuizzes = quizzes.filter(q => q.subject === courseName.toLowerCase());
    
    console.log('Filtered quizzes by subject:', subjectQuizzes);
    console.log('Quiz items detail:', subjectQuizzes.map(q => ({id: q.id, title: q.title, subject: q.subject, published: q.published})));
    
    const total = subjectQuizzes.length;
    const done = subjectQuizzes.filter(q => q.completed || q.status === 'completed' || q.score !== undefined).length;
    const pending = subjectQuizzes.filter(q => !q.completed && !q.score && q.status !== 'completed').length;
    const late = subjectQuizzes.filter(q => {
        if (q.deadline && !q.completed) {
            return new Date(q.deadline) < new Date();
        }
        return false;
    }).length;

    // Check if elements exist before setting textContent
    const quizScoreEl = document.getElementById('quizScore');
    const quizDoneEl = document.getElementById('quizDone');
    const quizPendingEl = document.getElementById('quizPending');
    const quizLateEl = document.getElementById('quizLate');
    
    if (quizScoreEl) quizScoreEl.textContent = `${done}/${total}`;
    if (quizDoneEl) quizDoneEl.textContent = done;
    if (quizPendingEl) quizPendingEl.textContent = pending;
    if (quizLateEl) quizLateEl.textContent = late;
    
    const percentage = total > 0 ? (done / total) * 100 : 0;
    const quizProgressEl = document.getElementById('quizProgress');
    if (quizProgressEl) quizProgressEl.style.width = percentage + '%';
}

// Load exam statistics
function loadExamStats(courseName) {
    // Use student exams (same as exam page) - these are published items
    const exams = JSON.parse(localStorage.getItem(`${courseName}Exams`) || '[]');
    
    console.log(`=== PROGRESS: ${courseName} Exams ===`);
    console.log('Student exams (published):', exams);
    
    // Filter ONLY by subject - match what exam page shows
    const subjectExams = exams.filter(e => e.subject === courseName.toLowerCase());
    
    console.log('Filtered exams by subject:', subjectExams);
    console.log('Exam items detail:', subjectExams.map(e => ({id: e.id, title: e.title, subject: e.subject, published: e.published})));
    
    const total = subjectExams.length;
    const done = subjectExams.filter(e => e.completed || e.status === 'completed' || e.score !== undefined).length;
    const pending = subjectExams.filter(e => !e.completed && !e.score && e.status !== 'completed').length;
    const late = subjectExams.filter(e => {
        if (e.deadline && !e.completed) {
            return new Date(e.deadline) < new Date();
        }
        return false;
    }).length;

    // Check if elements exist before setting textContent
    const examScoreEl = document.getElementById('examScore');
    const examDoneEl = document.getElementById('examDone');
    const examPendingEl = document.getElementById('examPending');
    const examLateEl = document.getElementById('examLate');
    
    if (examScoreEl) examScoreEl.textContent = `${done}/${total}`;
    if (examDoneEl) examDoneEl.textContent = done;
    if (examPendingEl) examPendingEl.textContent = pending;
    if (examLateEl) examLateEl.textContent = late;
    
    const percentage = total > 0 ? (done / total) * 100 : 0;
    const examProgressEl = document.getElementById('examProgress');
    if (examProgressEl) examProgressEl.style.width = percentage + '%';
}

// Load recent month grades (last 30 days)
function loadRecentGrades(courseName) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Recent Quizzes
    const quizzes = JSON.parse(localStorage.getItem(`${courseName}Quizzes`) || '[]');
    const teacherQuizzes = JSON.parse(localStorage.getItem(`${courseName}TeacherQuizzes`) || '[]');
    
    // Combine student and teacher quizzes, removing duplicates by ID
    const allQuizzes = [...quizzes];
    teacherQuizzes.forEach(tq => {
        if (!allQuizzes.find(q => q.id === tq.id)) {
            allQuizzes.push(tq);
        }
    });
    
    const recentQuizzes = allQuizzes.filter(q => {
        // Include if completed with a score
        if (q.completed && q.score !== undefined) {
            // If there's a completion date, check if it's within 30 days
        if (q.completedAt || q.submittedAt) {
            const completedDate = new Date(q.completedAt || q.submittedAt);
                return completedDate >= thirtyDaysAgo;
            }
            // If no date but has score, include it as a recent completion
            return true;
        }
        return false;
    }).sort((a, b) => {
        // Sort by completion date if available, otherwise keep order
        const dateA = a.completedAt || a.submittedAt || 0;
        const dateB = b.completedAt || b.submittedAt || 0;
        return new Date(dateB) - new Date(dateA);
    }).slice(0, 1);

    const recentQuizGradesEl = document.getElementById('recentQuizGrades');
    if (recentQuizGradesEl) {
        if (recentQuizzes.length > 0) {
            recentQuizGradesEl.innerHTML = recentQuizzes.map(q => {
            const score = q.score || 0;
            const maxScore = q.maxScore || 100;
            const gradient = score >= 80 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : score >= 60 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            const icon = score >= 80 ? 'material-symbols:check-circle' : score >= 60 ? 'material-symbols:trending-up' : 'material-symbols:trending-down';
            const iconColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
            const date = q.completedAt || q.submittedAt || q.createdAt || '';
            const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            
            return `
                <div class="recent-quiz-card" style="
                    background: linear-gradient(to bottom, white 0%, #fafbfc 100%);
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    border: 1px solid #e5e7eb;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    min-width: 220px;
                    flex: 1;
                    max-width: 280px;
                    position: relative;
                    overflow: hidden;
                " onmouseover="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 12px 28px rgba(0,0,0,0.15)'; this.style.borderColor='${iconColor}'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; this.style.borderColor='#e5e7eb'" onclick="window.location.href='physics-quiz.html'">
                    <!-- Decorative background element -->
                    <div style="
                        position: absolute;
                        top: 0;
                        right: 0;
                        width: 80px;
                        height: 80px;
                        background: ${gradient};
                        opacity: 0.1;
                        border-radius: 0 0 0 50px;
                        pointer-events: none;
                    "></div>
                    
                    <!-- Score Badge -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; position: relative; z-index: 1;">
                        <div style="
                            background: ${gradient};
                            color: white;
                            padding: 0.5rem 1rem;
                            border-radius: 25px;
                            font-weight: 700;
                            font-size: 1rem;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                            box-shadow: 0 4px 12px ${iconColor}40;
                        ">
                            <iconify-icon icon="${icon}" style="font-size: 1.2rem;"></iconify-icon>
                    ${score}%
                        </div>
                        ${formattedDate ? `<span style="color: #94a3b8; font-size: 0.8rem; font-weight: 500;">${formattedDate}</span>` : ''}
                    </div>
                    
                    <!-- Quiz Title -->
                    <div style="
                        font-weight: 700;
                        color: #1e293b;
                        font-size: 1rem;
                        margin-bottom: 0.75rem;
                        line-height: 1.4;
                        min-height: 2.8rem;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        position: relative;
                        z-index: 1;
                    " title="${q.title || 'Quiz'}">${q.title || 'Untitled Quiz'}</div>
                    
                    <!-- Quiz Details -->
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: #64748b;
                        font-size: 0.85rem;
                        margin-bottom: 1rem;
                        position: relative;
                        z-index: 1;
                    ">
                        <iconify-icon icon="material-symbols:quiz" style="font-size: 1rem; color: ${iconColor};"></iconify-icon>
                        <span>${q.questions ? q.questions.length + ' questions' : 'Multiple choice'}</span>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div style="
                        margin-top: 1rem;
                        height: 6px;
                        background: #e5e7eb;
                        border-radius: 3px;
                        overflow: hidden;
                        position: relative;
                        z-index: 1;
                    ">
                        <div style="
                            height: 100%;
                            background: ${gradient};
                            width: ${score}%;
                            transition: width 0.6s ease;
                            box-shadow: 0 0 8px ${iconColor}50;
                        "></div>
                    </div>
                    
                    <!-- View Details Link -->
                    <div style="
                        margin-top: 0.75rem;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                        color: ${iconColor};
                        font-size: 0.85rem;
                        font-weight: 600;
                        position: relative;
                        z-index: 1;
                    ">
                        <span>View Details</span>
                        <iconify-icon icon="material-symbols:arrow-forward" style="font-size: 1rem;"></iconify-icon>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            recentQuizGradesEl.innerHTML = '<div style="text-align: center; padding: 3rem; color: #94a3b8; font-style: italic; background: white; border-radius: 12px; border: 2px dashed #e5e7eb;"><iconify-icon icon="material-symbols:quiz" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></iconify-icon><p>No quizzes completed in the last month</p></div>';
        }
    }

    // Recent Exams
    const exams = JSON.parse(localStorage.getItem(`${courseName}Exams`) || '[]');
    const teacherExams = JSON.parse(localStorage.getItem(`${courseName}TeacherExams`) || '[]');
    
    // Combine student and teacher exams, removing duplicates by ID
    const allExams = [...exams];
    teacherExams.forEach(te => {
        if (!allExams.find(e => e.id === te.id)) {
            allExams.push(te);
        }
    });
    
    const recentExams = allExams.filter(e => {
        // Include if completed with a score
        if (e.completed && e.score !== undefined) {
            // If there's a completion date, check if it's within 30 days
            if (e.completedAt || e.submittedAt) {
                const completedDate = new Date(e.completedAt || e.submittedAt);
                return completedDate >= thirtyDaysAgo;
            }
            // If no date but has score, include it as a recent completion
            return true;
        }
        return false;
    }).sort((a, b) => {
        // Sort by completion date if available, otherwise keep order
        const dateA = a.completedAt || a.submittedAt || 0;
        const dateB = b.completedAt || b.submittedAt || 0;
        return new Date(dateB) - new Date(dateA);
    }).slice(0, 1);

    const recentExamGradesEl = document.getElementById('recentExamGrades');
    if (recentExamGradesEl) {
        if (recentExams.length > 0) {
            recentExamGradesEl.innerHTML = recentExams.map(e => {
            const score = e.score || 0;
            const maxScore = e.maxScore || 100;
            const gradient = score >= 80 ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : score >= 60 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            const icon = score >= 80 ? 'material-symbols:star' : score >= 60 ? 'material-symbols:trending-up' : 'material-symbols:trending-down';
            const date = e.completedAt || e.submittedAt || e.createdAt || '';
            const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            
            return `
                <div class="recent-exam-card" style="
                    background: white;
                    border-radius: 12px;
                    padding: 1rem;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    border: 1px solid #e5e7eb;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    min-width: 180px;
                    flex: 1;
                    max-width: 220px;
                " onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                        <div style="
                            background: ${gradient};
                            color: white;
                            padding: 0.35rem 0.7rem;
                            border-radius: 20px;
                            font-weight: 700;
                            font-size: 0.85rem;
                            display: flex;
                            align-items: center;
                            gap: 0.25rem;
                        ">
                            <iconify-icon icon="${icon}" style="font-size: 1rem;"></iconify-icon>
                    ${score}%
                        </div>
                        ${formattedDate ? `<span style="color: #94a3b8; font-size: 0.75rem; font-weight: 500;">${formattedDate}</span>` : ''}
                    </div>
                    <div style="
                        font-weight: 600;
                        color: #1e293b;
                        font-size: 0.9rem;
                        margin-bottom: 0.5rem;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    " title="${e.title || 'Exam'}">${e.title || 'Untitled Exam'}</div>
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                        color: #64748b;
                        font-size: 0.8rem;
                    ">
                        <iconify-icon icon="material-symbols:assignment" style="font-size: 0.9rem;"></iconify-icon>
                        ${e.questions ? e.questions.length + ' questions' : 'Comprehensive'}
                    </div>
                    <div style="
                        margin-top: 0.75rem;
                        height: 4px;
                        background: #e5e7eb;
                        border-radius: 2px;
                        overflow: hidden;
                    ">
                        <div style="
                            height: 100%;
                            background: ${gradient};
                            width: ${score}%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            recentExamGradesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">No exams completed in the last month</span>';
        }
    }
}

// Calculate average grades
function calculateAverageGrades(courseName) {
    // Quiz Average
    const quizzes = JSON.parse(localStorage.getItem(`${courseName}Quizzes`) || '[]');
    const allQuizzes = quizzes.filter(q => q.subject === courseName.toLowerCase());
    const completedQuizzes = allQuizzes.filter(q => q.score !== undefined);
    
    const avgQuizGradeEl = document.getElementById('avgQuizGrade');
    if (avgQuizGradeEl) {
        if (completedQuizzes.length > 0) {
            const avgQuiz = Math.round(completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length);
            avgQuizGradeEl.textContent = avgQuiz;
        } else {
            avgQuizGradeEl.textContent = '--';
        }
    }

    // Exam Average
    const exams = JSON.parse(localStorage.getItem(`${courseName}Exams`) || '[]');
    const allExams = exams.filter(e => e.subject === courseName.toLowerCase());
    const completedExams = allExams.filter(e => e.score !== undefined);
    
    const avgExamGradeEl = document.getElementById('avgExamGrade');
    if (avgExamGradeEl) {
        if (completedExams.length > 0) {
            const avgExam = Math.round(completedExams.reduce((sum, e) => sum + (e.score || 0), 0) / completedExams.length);
            avgExamGradeEl.textContent = avgExam;
        } else {
            avgExamGradeEl.textContent = '--';
        }
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
    const allQuizzes = quizzes.filter(q => q.subject === courseName.toLowerCase());
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
    const allExams = exams.filter(e => e.subject === courseName.toLowerCase());
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

