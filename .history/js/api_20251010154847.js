// API Integration for IG Way Frontend
class IGWayAPI {
    constructor() {
        // Use full API URL to ensure correct port
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
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

    // Authentication
    async register(userData) {
        const data = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (data.token) {
            this.token = data.token;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userName', `${data.user.first_name} ${data.user.last_name}`);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userId', data.user.id);
        }
        
        return data;
    }

    async login(credentials) {
        const data = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (data.token) {
            this.token = data.token;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userName', `${data.user.first_name} ${data.user.last_name}`);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userId', data.user.id);
            
            // Reset todo lists after successful login
            this.resetTodoLists();
        }
        
        return data;
    }

    // Function to reset todo lists after login
    resetTodoLists() {
        // Clear all existing todo lists from localStorage
        localStorage.removeItem('todoLists');
        console.log('Todo lists reset after login');
    }

    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('enrolledCourses');
    }

    // Courses
    async getCourses() {
        return await this.request('/courses');
    }

    async getCourse(id) {
        return await this.request(`/courses/${id}`);
    }

    // User enrollments
    async getUserEnrollments() {
        return await this.request('/my-enrollments');
    }

    // Favorites
    async getFavorites() {
        return await this.request('/user/favorites');
    }

    async addToFavorites(courseId) {
        return await this.request('/user/favorites', {
            method: 'POST',
            body: JSON.stringify({ courseId })
        });
    }

    async removeFromFavorites(courseId) {
        return await this.request(`/user/favorites/${courseId}`, {
            method: 'DELETE'
        });
    }

    // Orders
    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    // Get user's approved orders to determine course access
    async getUserOrders() {
        try {
            const response = await fetch(`${this.baseURL}/api/orders/status/${localStorage.getItem('userId')}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch user orders');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching user orders:', error);
            return { hasAccess: false, approvedOrders: 0 };
        }
    }

    // Get detailed orders for course-specific redirection
    async getUserOrderDetails() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/orders`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch order details');
            }
            
            const data = await response.json();
            const userId = parseInt(localStorage.getItem('userId'));
            
            // Filter orders for current user and approved status
            const userOrders = data.orders.filter(order => 
                order.user_id === userId && order.status === 'approved'
            );
            
            return userOrders;
        } catch (error) {
            console.error('Error fetching order details:', error);
            return [];
        }
    }

    // Get orders by email (for registration redirection)
    async getOrdersByEmail(email) {
        try {
            const response = await fetch(`${this.baseURL}/api/orders/by-email/${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch orders by email');
            }
            
            const data = await response.json();
            return data.orders || [];
        } catch (error) {
            console.error('Error fetching orders by email:', error);
            return [];
        }
    }
}

// Global API instance
window.api = new IGWayAPI();

// Function to determine dashboard based on purchased courses
async function getDashboardForUser() {
    try {
        console.log('🔍 Checking user orders for dashboard redirection...');
        const orderDetails = await api.getUserOrderDetails();
        console.log('📋 Found orders:', orderDetails);
        
        if (orderDetails.length === 0) {
            console.log('📝 No approved orders found, redirecting to default dashboard');
            return 'dashboard.html'; // Default dashboard if no approved orders
        }
        
        // Check courses in each order
        for (const order of orderDetails) {
            const courses = typeof order.courses === 'string' ? JSON.parse(order.courses) : order.courses;
            console.log('📚 Checking courses in order:', courses);
            
            // Check for specific course purchases
            if (courses.includes('IGCSE English Language') || 
                courses.includes('English') || 
                courses.some(course => course.toLowerCase().includes('english'))) {
                console.log('✅ English course found, redirecting to English dashboard');
                return 'english-dashboard.html';
            }
            
            if (courses.includes('IGCSE Mathematics') || 
                courses.includes('Mathematics') || 
                courses.some(course => course.toLowerCase().includes('mathematics'))) {
                console.log('✅ Mathematics course found, redirecting to Mathematics dashboard');
                return 'mathematics-dashboard.html';
            }
            
            if (courses.includes('IGCSE Physics') || 
                courses.includes('Physics') || 
                courses.some(course => course.toLowerCase().includes('physics'))) {
                console.log('✅ Physics course found, redirecting to Physics dashboard');
                return 'physics-dashboard.html';
            }
        }
        
        // If no specific course found, return default dashboard
        console.log('📝 No specific course found, redirecting to default dashboard');
        return 'dashboard.html';
    } catch (error) {
        console.error('❌ Error determining dashboard:', error);
        return 'dashboard.html';
    }
}

// Enhanced login function with course-based redirection
async function handleLoginClick() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    try {
        const data = await api.login({ email, password });
        showToast('Login successful!', 'success');
        
        // Reset todo lists after successful login
        resetTodoLists();
        
        // Close modal
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();
        
        // Update UI
        checkLoginState();
        
        // Determine appropriate dashboard based on purchased courses
        const dashboardUrl = await getDashboardForUser();
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            window.location.href = dashboardUrl;
        }, 1000);
        
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
    }
}

// Function to reset todo lists after login
function resetTodoLists() {
    // Clear all existing todo lists from localStorage
    localStorage.removeItem('todoLists');
    console.log('Todo lists reset after login');
}

async function handleRegisterClick() {
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const phone = document.getElementById('registerPhone').value;

    if (!firstName || !lastName || !email || !password) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    try {
        const data = await api.register({ 
            first_name: firstName, 
            last_name: lastName, 
            email, 
            password, 
            phone 
        });
        showToast('Registration successful!', 'success');
        
        // Close modal
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        registerModal.hide();
        
        // Update UI
        checkLoginState();
        
        // Check if user has existing approved orders by email and redirect accordingly
        const existingOrders = await api.getOrdersByEmail(email);
        let dashboardUrl = 'dashboard.html'; // Default dashboard
        
        if (existingOrders.length > 0) {
            // Check courses in existing orders
            for (const order of existingOrders) {
                const courses = typeof order.courses === 'string' ? JSON.parse(order.courses) : order.courses;
                
                // Check for specific course purchases
                if (courses.includes('IGCSE English Language') || 
                    courses.includes('English') || 
                    courses.some(course => course.toLowerCase().includes('english'))) {
                    dashboardUrl = 'english-dashboard.html';
                    break;
                }
                
                if (courses.includes('IGCSE Mathematics') || 
                    courses.includes('Mathematics') || 
                    courses.some(course => course.toLowerCase().includes('mathematics'))) {
                    dashboardUrl = 'mathematics-dashboard.html';
                    break;
                }
                
                if (courses.includes('IGCSE Physics') || 
                    courses.includes('Physics') || 
                    courses.some(course => course.toLowerCase().includes('physics'))) {
                    dashboardUrl = 'physics-dashboard.html';
                    break;
                }
            }
        }
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            window.location.href = dashboardUrl;
        }, 1500);
        
    } catch (error) {
        showToast('Registration failed: ' + error.message, 'error');
    }
}

// Enhanced dashboard loading
async function loadDashboardData() {
    if (!api.token) {
        showToast('Please log in to access your dashboard', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    try {
        const enrollments = await api.getUserEnrollments();
        updateDashboardWithEnrollments(enrollments);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function updateDashboardWithEnrollments(enrollments) {
    const enrolledCoursesContainer = document.getElementById('enrolledCourses');
    
    if (!enrolledCoursesContainer) return;

    if (enrollments.length === 0) {
        enrolledCoursesContainer.innerHTML = `
            <div class="no-courses-state text-center py-5">
                <div class="mb-4">
                    <iconify-icon icon="material-symbols:school" style="font-size: 4rem; color: #6c757d;"></iconify-icon>
                </div>
                <h4 class="text-muted mb-3">No Courses Enrolled</h4>
                <p class="text-muted mb-4">You haven't enrolled in any courses yet. Start your learning journey today!</p>
                <div class="d-flex gap-3 justify-content-center">
                    <a href="courses.html" class="btn btn-primary">
                        <iconify-icon icon="material-symbols:add" class="me-2"></iconify-icon>
                        Browse Courses
                    </a>
                    <a href="community.html" class="btn btn-outline-primary">
                        <iconify-icon icon="material-symbols:group" class="me-2"></iconify-icon>
                        Join Community
                    </a>
                </div>
            </div>
        `;
    } else {
        const coursesHtml = enrollments.map(course => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 course-card">
                    <img src="${course.image_url || 'images/item1.jpg'}" class="card-img-top" alt="${course.title}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${course.title}</h5>
                        <p class="card-text text-muted">${course.instructor}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-primary">${course.board}</span>
                                <span class="text-success fw-bold">£${course.price}</span>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary btn-sm flex-fill" onclick="startCourse('${course.id}')">
                                    <iconify-icon icon="material-symbols:play-arrow" class="me-1"></iconify-icon>
                                    Start Course
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="viewCourseDetails('${course.id}')">
                                    <iconify-icon icon="material-symbols:info" class="me-1"></iconify-icon>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        enrolledCoursesContainer.innerHTML = `
            <div class="row">
                ${coursesHtml}
            </div>
        `;
    }
}

// Enhanced course enrollment
// Enrollment function removed - use the one in courses.html instead
// This was causing conflicts and redirecting to wrong page

// Enhanced favorites management
async function toggleFavorite(courseId) {
    if (!api.token) {
        showToast('Please log in to manage favorites', 'warning');
        return;
    }

    try {
        const favorites = await api.getFavorites();
        const isFavorited = favorites.some(fav => fav.id === courseId);
        
        if (isFavorited) {
            await api.removeFromFavorites(courseId);
            showToast('Removed from favorites', 'info');
        } else {
            await api.addToFavorites(courseId);
            showToast('Added to favorites', 'success');
        }
        
        // Update UI
        updateFavoriteButtons();
    } catch (error) {
        showToast('Error managing favorites: ' + error.message, 'error');
    }
}

// Initialize API integration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in via API
    if (api.token) {
        // Verify token is still valid
        api.getUserEnrollments().catch(() => {
            // Token is invalid, logout
            api.logout();
            checkLoginState();
        });
    }
    
    // Load dashboard data if on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        loadDashboardData();
    }
});
