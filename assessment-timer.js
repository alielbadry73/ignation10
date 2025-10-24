/**
 * Assessment Timer System
 * Handles timed assessments with automatic submission
 */

class AssessmentTimer {
    constructor(options = {}) {
        this.timeLimit = options.timeLimit || 0; // in minutes
        this.onTimeUp = options.onTimeUp || (() => {});
        this.onWarning = options.onWarning || (() => {});
        this.onProgressSave = options.onProgressSave || (() => {});
        
        this.timeRemaining = this.timeLimit * 60; // convert to seconds
        this.startTime = null;
        this.timerInterval = null;
        this.isRunning = false;
        this.warningsShown = [false, false, false]; // 10min, 5min, 1min warnings
        
        this.createTimerDisplay();
    }
    
    createTimerDisplay() {
        // Create timer display element
        const timerHTML = `
            <div id="assessment-timer" class="assessment-timer">
                <div class="timer-header">
                    <iconify-icon icon="material-symbols:schedule"></iconify-icon>
                    <span class="timer-label">Time Remaining</span>
                </div>
                <div class="timer-display">
                    <span id="timer-time">${this.formatTime(this.timeRemaining)}</span>
                </div>
                <div class="timer-progress">
                    <div class="progress-bar">
                        <div id="timer-progress-bar" class="progress-fill"></div>
                    </div>
                </div>
                <div class="timer-actions">
                    <button id="save-progress-btn" class="btn btn-outline-primary btn-sm">
                        <iconify-icon icon="material-symbols:save"></iconify-icon>
                        Save Progress
                    </button>
                </div>
            </div>
        `;
        
        // Insert timer at the top of the page
        const timerContainer = document.createElement('div');
        timerContainer.innerHTML = timerHTML;
        document.body.insertBefore(timerContainer.firstElementChild, document.body.firstChild);
        
        // Add event listeners
        document.getElementById('save-progress-btn').addEventListener('click', () => {
            this.saveProgress();
        });
        
        // Add CSS styles
        this.addTimerStyles();
    }
    
    addTimerStyles() {
        const styles = `
            <style>
                .assessment-timer {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin: 10px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                
                .timer-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                }
                
                .timer-display {
                    font-size: 1.5rem;
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                    background: rgba(255,255,255,0.2);
                    padding: 8px 15px;
                    border-radius: 8px;
                    min-width: 120px;
                    text-align: center;
                }
                
                .timer-progress {
                    flex: 1;
                    max-width: 200px;
                }
                
                .progress-bar {
                    background: rgba(255,255,255,0.3);
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    background: linear-gradient(90deg, #4CAF50, #FFC107, #FF5722);
                    height: 100%;
                    transition: width 0.3s ease;
                    width: 100%;
                }
                
                .timer-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .timer-warning {
                    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                    animation: pulse 1s infinite;
                }
                
                .timer-critical {
                    background: linear-gradient(135deg, #ff4757, #c44569);
                    animation: pulse 0.5s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                
                @media (max-width: 768px) {
                    .assessment-timer {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .timer-progress {
                        max-width: 100%;
                        width: 100%;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    start() {
        if (this.timeLimit <= 0) {
            this.hideTimer();
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
        
        // Save progress every 30 seconds
        this.progressInterval = setInterval(() => {
            this.saveProgress(true); // silent save
        }, 30000);
    }
    
    updateTimer() {
        if (!this.isRunning) return;
        
        this.timeRemaining--;
        
        // Update display
        const timeElement = document.getElementById('timer-time');
        const progressBar = document.getElementById('timer-progress-bar');
        
        if (timeElement) {
            timeElement.textContent = this.formatTime(this.timeRemaining);
        }
        
        if (progressBar) {
            const percentage = (this.timeRemaining / (this.timeLimit * 60)) * 100;
            progressBar.style.width = `${percentage}%`;
        }
        
        // Check for warnings
        this.checkWarnings();
        
        // Check if time is up
        if (this.timeRemaining <= 0) {
            this.timeUp();
        }
    }
    
    checkWarnings() {
        const minutes = Math.floor(this.timeRemaining / 60);
        
        if (minutes <= 10 && minutes > 5 && !this.warningsShown[0]) {
            this.warningsShown[0] = true;
            this.showWarning('10 minutes remaining!');
            this.addWarningClass();
        } else if (minutes <= 5 && minutes > 1 && !this.warningsShown[1]) {
            this.warningsShown[1] = true;
            this.showWarning('5 minutes remaining!');
            this.addWarningClass();
        } else if (minutes <= 1 && minutes >= 0 && !this.warningsShown[2]) {
            this.warningsShown[2] = true;
            this.showWarning('1 minute remaining!');
            this.addCriticalClass();
        }
    }
    
    addWarningClass() {
        const timer = document.getElementById('assessment-timer');
        if (timer) {
            timer.classList.add('timer-warning');
        }
    }
    
    addCriticalClass() {
        const timer = document.getElementById('assessment-timer');
        if (timer) {
            timer.classList.remove('timer-warning');
            timer.classList.add('timer-critical');
        }
    }
    
    showWarning(message) {
        // Show toast notification
        if (typeof showToast === 'function') {
            showToast(message, 'warning');
        } else {
            alert(message);
        }
        
        // Call custom warning callback
        this.onWarning(message);
    }
    
    timeUp() {
        this.stop();
        this.showWarning('Time is up! Assessment will be submitted automatically.');
        
        // Call custom time up callback
        this.onTimeUp();
        
        // Auto-submit after 2 seconds
        setTimeout(() => {
            this.autoSubmit();
        }, 2000);
    }
    
    autoSubmit() {
        // Find and submit the assessment form
        const submitButton = document.querySelector('button[type="submit"], .btn-submit, #submit-assessment');
        if (submitButton) {
            submitButton.click();
        } else {
            // Try to find any form and submit it
            const forms = document.querySelectorAll('form');
            if (forms.length > 0) {
                forms[0].submit();
            }
        }
    }
    
    saveProgress(silent = false) {
        if (!silent) {
            if (typeof showToast === 'function') {
                showToast('Progress saved!', 'success');
            }
        }
        
        // Collect all form data
        const formData = this.collectFormData();
        
        // Save to localStorage
        const assessmentId = this.getAssessmentId();
        if (assessmentId) {
            localStorage.setItem(`assessment_progress_${assessmentId}`, JSON.stringify({
                data: formData,
                timeRemaining: this.timeRemaining,
                timestamp: Date.now()
            }));
        }
        
        // Call custom progress save callback
        this.onProgressSave(formData);
    }
    
    collectFormData() {
        const formData = {};
        
        // Collect all input elements
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type === 'radio' || input.type === 'checkbox') {
                if (input.checked) {
                    formData[input.name] = input.value;
                }
            } else if (input.type !== 'submit' && input.type !== 'button') {
                formData[input.name] = input.value;
            }
        });
        
        return formData;
    }
    
    getAssessmentId() {
        // Try to get assessment ID from various sources
        return document.querySelector('[data-assessment-id]')?.dataset.assessmentId ||
               document.querySelector('#assessment-id')?.value ||
               window.location.pathname.split('/').pop();
    }
    
    loadProgress() {
        const assessmentId = this.getAssessmentId();
        if (assessmentId) {
            const saved = localStorage.getItem(`assessment_progress_${assessmentId}`);
            if (saved) {
                const progress = JSON.parse(saved);
                
                // Restore form data
                Object.keys(progress.data).forEach(name => {
                    const element = document.querySelector(`[name="${name}"]`);
                    if (element) {
                        if (element.type === 'radio' || element.type === 'checkbox') {
                            element.checked = element.value === progress.data[name];
                        } else {
                            element.value = progress.data[name];
                        }
                    }
                });
                
                // Restore time if it's reasonable
                if (progress.timeRemaining > 0 && progress.timeRemaining < this.timeLimit * 60) {
                    this.timeRemaining = progress.timeRemaining;
                }
                
                return true;
            }
        }
        return false;
    }
    
    stop() {
        this.isRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    hideTimer() {
        const timer = document.getElementById('assessment-timer');
        if (timer) {
            timer.style.display = 'none';
        }
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    destroy() {
        this.stop();
        const timer = document.getElementById('assessment-timer');
        if (timer) {
            timer.remove();
        }
    }
}

// Global function to start assessment timer
function startAssessmentTimer(timeLimitMinutes, options = {}) {
    return new AssessmentTimer({
        timeLimit: timeLimitMinutes,
        ...options
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AssessmentTimer, startAssessmentTimer };
}
