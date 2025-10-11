// Centralized Notification System for IG Nation
// This file manages notifications across all pages

// Function to detect current course from URL
function detectCourse() {
    const url = window.location.href.toLowerCase();
    if (url.includes('physics')) return 'physics';
    if (url.includes('english')) return 'english';
    return 'mathematics'; // default
}

// Function to get course-specific keys
function getCourseKeys(course) {
    if (course === 'physics') {
        return {
            assignments: 'physicsAssignments',
            teacherAssignments: 'physicsTeacherAssignments',
            quizzes: 'physicsQuizzes',
            teacherQuizzes: 'physicsTeacherQuizzes',
            exams: 'physicsExams',
            teacherExams: 'physicsTeacherExams',
            homeworkLink: 'physics-homework.html',
            quizLink: 'physics-quiz.html',
            examLink: 'physics-exam.html'
        };
    } else if (course === 'english') {
        return {
            assignments: 'englishAssignments',
            teacherAssignments: 'englishTeacherAssignments',
            quizzes: 'englishQuizzes',
            teacherQuizzes: 'englishTeacherQuizzes',
            exams: 'englishExams',
            teacherExams: 'englishTeacherExams',
            homeworkLink: 'english-homework.html',
            quizLink: 'english-quiz.html',
            examLink: 'english-exam.html'
        };
    } else {
        return {
            assignments: 'studentAssignments',
            teacherAssignments: 'teacherAssignments',
            quizzes: 'studentQuizzes',
            teacherQuizzes: 'teacherQuizzes',
            exams: 'studentExams',
            teacherExams: 'teacherExams',
            homeworkLink: 'mathematics-homework.html',
            quizLink: 'mathematics-quiz.html',
            examLink: 'mathematics-exam.html'
        };
    }
}

// Function to count all notifications
function countAllNotifications() {
    try {
        const course = detectCourse();
        const keys = getCourseKeys(course);
        
        const assignments = JSON.parse(localStorage.getItem(keys.assignments) || '[]');
        const teacherAssignments = JSON.parse(localStorage.getItem(keys.teacherAssignments) || '[]');
        const quizzes = JSON.parse(localStorage.getItem(keys.quizzes) || '[]');
        const teacherQuizzes = JSON.parse(localStorage.getItem(keys.teacherQuizzes) || '[]');
        const exams = JSON.parse(localStorage.getItem(keys.exams) || '[]');
        const teacherExams = JSON.parse(localStorage.getItem(keys.teacherExams) || '[]');
        
        let count = 0;
        
        // Combine data sources and remove duplicates by ID
        const allAssignments = [...assignments];
        teacherAssignments.forEach(ta => {
            if (!allAssignments.find(a => a.id === ta.id)) {
                allAssignments.push(ta);
            }
        });
        
        const allQuizzes = [...quizzes];
        teacherQuizzes.forEach(tq => {
            if (!allQuizzes.find(q => q.id === tq.id)) {
                allQuizzes.push(tq);
            }
        });
        
        const allExams = [...exams];
        teacherExams.forEach(te => {
            if (!allExams.find(e => e.id === te.id)) {
                allExams.push(te);
            }
        });
        
        // Count unpublished or incomplete assignments
        count += allAssignments.filter(a => !a.completed && a.published !== false).length;
        
        // Count available quizzes
        count += allQuizzes.filter(q => q.published !== false && !q.completed).length;
        
        // Count available exams
        count += allExams.filter(e => e.published !== false && !e.completed).length;
        
        return count;
    } catch (error) {
        console.error('Error counting notifications:', error);
        return 0;
    }
}

// Function to update notification badge on current page
function updateNotificationBadge() {
    const count = countAllNotifications();
    const badges = document.querySelectorAll('#notificationBadge, .notification-badge');
    
    badges.forEach(badge => {
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    });
    
    // Store count for cross-page access
    localStorage.setItem('notificationCount', count);
    
    return count;
}

// Function to get all notifications with details
function getAllNotifications() {
    const course = detectCourse();
    const keys = getCourseKeys(course);
    
    const assignments = JSON.parse(localStorage.getItem(keys.assignments) || '[]');
    const teacherAssignments = JSON.parse(localStorage.getItem(keys.teacherAssignments) || '[]');
    const quizzes = JSON.parse(localStorage.getItem(keys.quizzes) || '[]');
    const teacherQuizzes = JSON.parse(localStorage.getItem(keys.teacherQuizzes) || '[]');
    const exams = JSON.parse(localStorage.getItem(keys.exams) || '[]');
    const teacherExams = JSON.parse(localStorage.getItem(keys.teacherExams) || '[]');
    
    const notifications = [];
    const now = new Date();
    
    // Combine data sources and remove duplicates by ID
    const allAssignments = [...assignments];
    teacherAssignments.forEach(ta => {
        if (!allAssignments.find(a => a.id === ta.id)) {
            allAssignments.push(ta);
        }
    });
    
    const allQuizzes = [...quizzes];
    teacherQuizzes.forEach(tq => {
        if (!allQuizzes.find(q => q.id === tq.id)) {
            allQuizzes.push(tq);
        }
    });
    
    const allExams = [...exams];
    teacherExams.forEach(te => {
        if (!allExams.find(e => e.id === te.id)) {
            allExams.push(te);
        }
    });
    
    // Add quizzes
    allQuizzes.filter(q => q.published !== false && !q.completed).forEach(quiz => {
        const timeAgo = quiz.publishedDate ? getTimeAgo(new Date(quiz.publishedDate)) : 'Just now';
        notifications.push({
            type: 'quiz',
            title: `New Quiz: ${quiz.title}`,
            message: `Click to start`,
            icon: '📝',
            color: '#667eea',
            link: keys.quizLink,
            time: timeAgo
        });
    });
    
    // Add assignments
    allAssignments.filter(a => !a.completed && a.published !== false).forEach(assignment => {
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        const daysLeft = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;
        const timeAgo = assignment.publishedDate ? getTimeAgo(new Date(assignment.publishedDate)) : 'Just now';
        notifications.push({
            type: 'assignment',
            title: `Assignment: ${assignment.title}`,
            message: daysLeft ? `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'No due date',
            icon: '📚',
            color: '#f59e0b',
            link: keys.homeworkLink,
            time: timeAgo
        });
    });
    
    // Add exams
    allExams.filter(e => e.published !== false && !e.completed).forEach(exam => {
        const examDate = exam.dueDate ? new Date(exam.dueDate) : null;
        const daysLeft = examDate ? Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)) : null;
        const timeAgo = exam.publishedDate ? getTimeAgo(new Date(exam.publishedDate)) : 'Just now';
        notifications.push({
            type: 'exam',
            title: `Exam: ${exam.title}`,
            message: daysLeft ? `In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Available now',
            icon: '🎓',
            color: '#ef4444',
            link: keys.examLink,
            time: timeAgo
        });
    });
    
    return notifications;
}

// Helper function to calculate time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

// Function to show notifications modal (can be called from any page)
function showNotificationsModal() {
    const notifications = getAllNotifications();
    
    const notificationsHtml = `
        <div id="notificationsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease;" onclick="if(event.target.id==='notificationsModal') document.getElementById('notificationsModal').remove()">
            <div style="background: white; border-radius: 16px; max-width: 700px; width: 90%; max-height: 85vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">
                <div style="padding: 1.5rem; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div>
                        <h3 style="margin: 0; font-size: 1.5rem; color: white;">🔔 Notifications</h3>
                        <p style="margin: 0; font-size: 0.85rem; color: rgba(255,255,255,0.9);">${notifications.length} new update${notifications.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onclick="document.getElementById('notificationsModal').remove()" style="background: rgba(255,255,255,0.2); border: none; width: 30px; height: 30px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                <div style="padding: 1rem; max-height: 60vh; overflow-y: auto;">
                    ${notifications.length > 0 ? notifications.map(notif => `
                        <div onclick="window.location.href='${notif.link}'" style="padding: 1rem; border-radius: 12px; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; border: 1px solid #e9ecef; background: white;" onmouseover="this.style.background='#f9fafb'; this.style.transform='translateX(4px)'; this.style.borderColor='${notif.color}'" onmouseout="this.style.background='white'; this.style.transform='translateX(0)'; this.style.borderColor='#e9ecef'">
                            <div style="display: flex; align-items: start; gap: 0.75rem;">
                                <div style="font-size: 1.8rem; width: 40px; text-align: center;">${notif.icon}</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: ${notif.color}; margin-bottom: 0.25rem;">${notif.title}</div>
                                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">${notif.message}</div>
                                    <div style="font-size: 0.75rem; color: #999;">${notif.time}</div>
                                </div>
                                <iconify-icon icon="material-symbols:chevron-right" style="font-size: 1.2rem; color: #ccc;"></iconify-icon>
                            </div>
                        </div>
                    `).join('') : '<div style="text-align: center; padding: 3rem; color: #666;">No new notifications</div>'}
                </div>
                <div style="padding: 1rem; border-top: 1px solid #e9ecef; text-align: center;">
                    <button onclick="document.getElementById('notificationsModal').remove()" style="background: transparent; border: none; color: #667eea; font-weight: 600; cursor: pointer;">Mark all as read</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', notificationsHtml);
}

// Update badge on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        updateNotificationBadge();
        
        // Update every 30 seconds
        setInterval(updateNotificationBadge, 30000);
    });
    
    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', function(e) {
        const watchKeys = [
            'mathematicsAssignments', 'mathematicsQuizzes', 'mathematicsExams',
            'studentAssignments', 'studentQuizzes', 'studentExams',
            'teacherAssignments', 'teacherQuizzes', 'teacherExams',
            'physicsAssignments', 'physicsQuizzes', 'physicsExams',
            'physicsTeacherAssignments', 'physicsTeacherQuizzes', 'physicsTeacherExams',
            'englishAssignments', 'englishQuizzes', 'englishExams',
            'englishTeacherAssignments', 'englishTeacherQuizzes', 'englishTeacherExams'
        ];
        
        if (watchKeys.includes(e.key)) {
            updateNotificationBadge();
        }
    });
}

