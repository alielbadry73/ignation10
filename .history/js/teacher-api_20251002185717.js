// Teacher API Management - Permanent Data Storage
class TeacherAPI {
    constructor() {
        this.baseURL = '/api/teacher';
        this.token = localStorage.getItem('token');
    }

    // Helper method to make API requests
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Lectures API
    async getLectures(subject = 'mathematics') {
        return await this.makeRequest(`/lectures?subject=${subject}`);
    }

    async createLecture(lectureData) {
        return await this.makeRequest('/lectures', {
            method: 'POST',
            body: JSON.stringify(lectureData)
        });
    }

    async updateLecture(id, lectureData) {
        return await this.makeRequest(`/lectures/${id}`, {
            method: 'PUT',
            body: JSON.stringify(lectureData)
        });
    }

    async deleteLecture(id) {
        return await this.makeRequest(`/lectures/${id}`, {
            method: 'DELETE'
        });
    }

    // Assignments API
    async getAssignments(subject = 'mathematics') {
        return await this.makeRequest(`/assignments?subject=${subject}`);
    }

    async createAssignment(assignmentData) {
        return await this.makeRequest('/assignments', {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });
    }

    async updateAssignment(id, assignmentData) {
        return await this.makeRequest(`/assignments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(assignmentData)
        });
    }

    async deleteAssignment(id) {
        return await this.makeRequest(`/assignments/${id}`, {
            method: 'DELETE'
        });
    }

    // Exams API
    async getExams(subject = 'mathematics') {
        return await this.makeRequest(`/exams?subject=${subject}`);
    }

    async createExam(examData) {
        return await this.makeRequest('/exams', {
            method: 'POST',
            body: JSON.stringify(examData)
        });
    }

    async updateExam(id, examData) {
        return await this.makeRequest(`/exams/${id}`, {
            method: 'PUT',
            body: JSON.stringify(examData)
        });
    }

    async deleteExam(id) {
        return await this.makeRequest(`/exams/${id}`, {
            method: 'DELETE'
        });
    }

    // Quizzes API
    async getQuizzes(subject = 'mathematics') {
        return await this.makeRequest(`/quizzes?subject=${subject}`);
    }

    async createQuiz(quizData) {
        return await this.makeRequest('/quizzes', {
            method: 'POST',
            body: JSON.stringify(quizData)
        });
    }

    async updateQuiz(id, quizData) {
        return await this.makeRequest(`/quizzes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(quizData)
        });
    }

    async deleteQuiz(id) {
        return await this.makeRequest(`/quizzes/${id}`, {
            method: 'DELETE'
        });
    }

    // Assignment Submissions API
    async getAssignmentSubmissions(assignmentId = null, status = null) {
        let endpoint = '/assignment-submissions';
        const params = new URLSearchParams();
        
        if (assignmentId) params.append('assignment_id', assignmentId);
        if (status) params.append('status', status);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await this.makeRequest(endpoint);
    }

    async gradeAssignment(submissionId, grade, feedback, status = 'graded') {
        return await this.makeRequest(`/grade-assignment/${submissionId}`, {
            method: 'PUT',
            body: JSON.stringify({ grade, feedback, status })
        });
    }
}

// Global instance
window.teacherAPI = new TeacherAPI();
