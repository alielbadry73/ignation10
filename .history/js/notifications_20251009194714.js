// Centralized Notification System for IG Nation
// This file manages notifications across all pages

// Function to count all notifications
function countAllNotifications() {
    try {
        const assignments = JSON.parse(localStorage.getItem('mathematicsAssignments') || '[]');
        const quizzes = JSON.parse(localStorage.getItem('mathematicsQuizzes') || '[]');
        const exams = JSON.parse(localStorage.getItem('mathematicsExams') || '[]');
        
        let count = 0;
        
        // Count available quizzes
        count += quizzes.filter(q => q.published && q.status === 'available').length;
        
        // Count pending assignments
        count += assignments.filter(a => a.available && !a.completed).length;
        
        // Count available exams
        count += exams.filter(e => e.published && e.status === 'available').length;
        
        // Add static notifications (live sessions + ranking updates)
        count += 2;
        
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
    const assignments = JSON.parse(localStorage.getItem('mathematicsAssignments') || '[]');
    const quizzes = JSON.parse(localStorage.getItem('mathematicsQuizzes') || '[]');
    const exams = JSON.parse(localStorage.getItem('mathematicsExams') || '[]');
    const students = JSON.parse(localStorage.getItem('mathematicsStudents') || '[]');
    
    const notifications = [];
    
    // Add quizzes
    quizzes.filter(q => q.published && q.status === 'available').forEach(quiz => {
        notifications.push({
            type: 'quiz',
            title: `New Quiz: ${quiz.title}`,
            message: `Available now`,
            icon: '📝',
            color: '#667eea',
            link: 'mathematics-quiz.html',
            time: '2 hours ago'
        });
    });
    
    // Add assignments
    assignments.filter(a => a.available && !a.completed).forEach(assignment => {
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        const daysLeft = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
        notifications.push({
            type: 'assignment',
            title: `Assignment: ${assignment.title}`,
            message: daysLeft ? `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'No due date',
            icon: '📚',
            color: '#f59e0b',
            link: 'mathematics-homework.html',
            time: '1 day ago'
        });
    });
    
    // Add exams
    exams.filter(e => e.published && e.status === 'available').forEach(exam => {
        const examDate = exam.dueDate ? new Date(exam.dueDate) : null;
        const daysLeft = examDate ? Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
        notifications.push({
            type: 'exam',
            title: `Exam: ${exam.title}`,
            message: daysLeft ? `In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Available now',
            icon: '🎓',
            color: '#ef4444',
            link: 'mathematics-exam.html',
            time: '3 days ago'
        });
    });
    
    // Add live session notification
    notifications.push({
        type: 'session',
        title: 'Upcoming Live Session',
        message: 'Advanced Calculus - Tomorrow at 4:00 PM',
        icon: '🎥',
        color: '#8b5cf6',
        link: 'live-sessions.html',
        time: '5 hours ago'
    });
    
    // Add badge notifications
    const currentStudent = students[0];
    if (currentStudent && currentStudent.badges && currentStudent.badges.length > 0) {
        notifications.push({
            type: 'badge',
            title: 'New Badge Earned!',
            message: `You earned the "${currentStudent.badges[currentStudent.badges.length - 1]}" badge`,
            icon: '🏆',
            color: '#f59e0b',
            link: 'student-dashboard.html#badges',
            time: '2 days ago'
        });
    }
    
    // Add ranking update
    notifications.push({
        type: 'rank',
        title: 'Leaderboard Update',
        message: 'You moved up to #2 in class! Keep it up!',
        icon: '📈',
        color: '#22c55e',
        link: 'student-dashboard.html#leaderboard',
        time: '1 day ago'
    });
    
    return notifications;
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
        if (e.key === 'mathematicsAssignments' || e.key === 'mathematicsQuizzes' || e.key === 'mathematicsExams') {
            updateNotificationBadge();
        }
    });
}

