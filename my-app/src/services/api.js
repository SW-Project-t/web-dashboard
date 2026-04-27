/**
 * Centralized API service for all backend communication
 * Handles authentication, error handling, and request/response formatting
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://backend-2-qju2.onrender.com';

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
    return localStorage.getItem('token');
};

/**
 * Create headers with authentication token
 */
const getHeaders = (isFormData = false) => {
    const token = getAuthToken();
    const headers = {};
    
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

/**
 * Handle API response and errors
 */
const handleResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    
    // Check if response is JSON
    if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'An error occurred');
        }
        
        return data;
    }
    
    // If not JSON, check for other responses
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'An error occurred');
    }
    
    return { success: true };
};

/**
 * Generic fetch wrapper
 */
const fetchAPI = async (url, options = {}) => {
    const { method = 'GET', body = null, isFormData = false, ...restOptions } = options;
    
    const fetchOptions = {
        method,
        headers: getHeaders(isFormData),
        ...restOptions
    };
    
    if (body && method !== 'GET') {
        fetchOptions.body = isFormData ? body : JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);
        return await handleResponse(response);
    } catch (error) {
        console.error(`API Error (${method} ${url}):`, error.message);
        throw error;
    }
};

// ==================== ATTENDANCE API ====================

export const attendanceAPI = {
    /**
     * Get attendance records for a student
     * @param {string} studentId - Student UID
     * @returns {Promise} Attendance data with summary
     */
    getStudentAttendance: async (studentId) => {
        if (!studentId) {
            throw new Error('Student ID is required');
        }
        return fetchAPI(`/api/attendance/student/${studentId}`);
    },

    /**
     * Get attendance records for a professor's courses
     * @param {string} profId - Professor UID
     * @param {string} [courseId] - Optional specific course ID
     * @returns {Promise} Courses with attendance statistics
     */
    getProfessorCourseAttendance: async (profId, courseId = null) => {
        if (!profId) {
            throw new Error('Professor ID is required');
        }
        
        let url = `/api/attendance/professor/${profId}`;
        if (courseId) {
            url += `/course/${courseId}`;
        }
        
        return fetchAPI(url);
    },

    /**
     * Get attendance data for all courses (Admin only)
     * @returns {Promise} All courses with attendance statistics
     */
    getAllCoursesAttendance: async () => {
        return fetchAPI('/api/attendance/admin/courses');
    },

    /**
     * Record new attendance for a student
     * @param {Object} attendanceData - Attendance data to record
     * @returns {Promise} Success status and record ID
     */
    recordAttendance: async (attendanceData) => {
        return fetchAPI('/api/attendance/record', {
            method: 'POST',
            body: attendanceData
        });
    },

    /**
     * Update an attendance record
     * @param {string} recordId - Attendance record ID
     * @param {Object} updates - Fields to update
     * @returns {Promise} Success status
     */
    updateAttendanceRecord: async (recordId, updates) => {
        return fetchAPI(`/api/attendance/${recordId}`, {
            method: 'PUT',
            body: updates
        });
    },

    /**
     * Delete an attendance record
     * @param {string} recordId - Attendance record ID
     * @returns {Promise} Success status
     */
    deleteAttendanceRecord: async (recordId) => {
        return fetchAPI(`/api/attendance/${recordId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Get attendance summary for a course
     * @param {string} courseId - Course ID
     * @returns {Promise} Course attendance summary
     */
    getCourseAttendanceSummary: async (courseId) => {
        return fetchAPI(`/api/attendance/course/${courseId}/summary`);
    }
};

// ==================== USER API ====================

export const userAPI = {
    /**
     * Get user profile
     * @returns {Promise} User profile data
     */
    getProfile: async () => {
        return fetchAPI('/api/profile');
    },

    /**
     * Update user profile
     * @param {Object} updates - Profile fields to update
     * @returns {Promise} Success status
     */
    updateProfile: async (updates) => {
        return fetchAPI('/api/profile/update', {
            method: 'PUT',
            body: updates
        });
    },

    /**
     * Update user password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise} Success status
     */
    updatePassword: async (currentPassword, newPassword) => {
        return fetchAPI('/api/profile/update-password', {
            method: 'PUT',
            body: { currentPassword, newPassword }
        });
    },

    /**
     * Upload profile image
     * @param {File} imageFile - Image file to upload
     * @returns {Promise} Success status and image URL
     */
    uploadProfileImage: async (imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/profile/upload-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        return handleResponse(response);
    }
};

// ==================== COURSE API ====================

export const courseAPI = {
    /**
     * Get all available courses
     * @returns {Promise} List of courses
     */
    getAllCourses: async () => {
        return fetchAPI('/api/all-courses');
    },

    /**
     * Enroll in a course
     * @param {string} studentUid - Student UID
     * @param {string} courseId - Course ID
     * @returns {Promise} Success status
     */
    enrollCourse: async (studentUid, courseId) => {
        return fetchAPI('/api/enroll-course', {
            method: 'POST',
            body: { studentUid, courseId }
        });
    },

    /**
     * Get students enrolled in a course
     * @param {string} courseId - Course ID
     * @returns {Promise} List of enrolled students
     */
    getCourseStudents: async (courseId) => {
        const response = await fetch(`${API_BASE_URL}/api/course-students/${courseId}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return handleResponse(response);
    },

    /**
     * Enroll a student in a course (Professor/Admin)
     * @param {Object} studentData - Student enrollment data
     * @returns {Promise} Success status and enrollment ID
     */
    enrollStudent: async (studentData) => {
        return fetchAPI('/api/enroll-student', {
            method: 'POST',
            body: studentData
        });
    },

    /**
     * Unenroll a student from a course
     * @param {string} enrollmentId - Enrollment ID
     * @returns {Promise} Success status
     */
    unenrollStudent: async (enrollmentId) => {
        return fetchAPI('/api/unenroll-student', {
            method: 'DELETE',
            body: { enrollmentId }
        });
    }
};

// ==================== ADMIN API ====================

export const adminAPI = {
    /**
     * Get all users
     * @returns {Promise} List of users
     */
    getAllUsers: async () => {
        return fetchAPI('/admin/users');
    },

    /**
     * Add a new user
     * @param {Object} userData - User data
     * @returns {Promise} Success status
     */
    addUser: async (userData) => {
        return fetchAPI('/admin/add-user', {
            method: 'POST',
            body: userData
        });
    },

    /**
     * Add multiple users in bulk
     * @param {Array} users - Array of user data
     * @returns {Promise} Results for each user
     */
    addUsersBulk: async (users) => {
        return fetchAPI('/admin/add-users-bulk', {
            method: 'POST',
            body: { users }
        });
    },

    /**
     * Delete a user
     * @param {string} uid - User UID
     * @returns {Promise} Success status
     */
    deleteUser: async (uid) => {
        return fetchAPI(`/admin/delete-user/${uid}`, {
            method: 'DELETE'
        });
    },

    /**
     * Update a user
     * @param {string} uid - User UID
     * @param {Object} updates - Fields to update
     * @returns {Promise} Success status
     */
    updateUser: async (uid, updates) => {
        return fetchAPI(`/admin/update-user/${uid}`, {
            method: 'PUT',
            body: updates
        });
    },

    /**
     * Add a new course
     * @param {Object} courseData - Course data
     * @returns {Promise} Success status and course ID
     */
    addCourse: async (courseData) => {
        return fetchAPI('/admin/add-course', {
            method: 'POST',
            body: courseData
        });
    },

    /**
     * Add multiple courses in bulk
     * @param {Array} courses - Array of course data
     * @returns {Promise} Results for each course
     */
    addCoursesBulk: async (courses) => {
        return fetchAPI('/admin/add-courses-bulk', {
            method: 'POST',
            body: { courses }
        });
    }
};

// ==================== RISK ANALYSIS API ====================

export const riskAPI = {
    /**
     * Analyze student risk level
     * @param {string} uid - Student UID
     * @returns {Promise} Risk analysis results
     */
    analyzeRisk: async (uid) => {
        return fetchAPI(`/api/analyze-risk/${uid}`, {
            method: 'POST'
        });
    },

    /**
     * Update student risk level
     * @param {string} uid - Student UID
     * @param {string} riskLevel - New risk level
     * @returns {Promise} Success status
     */
    updateRisk: async (uid, riskLevel) => {
        return fetchAPI('/api/attendance/update-risk', {
            method: 'POST',
            body: { uid, riskLevel }
        });
    }
};

// ==================== AUTH API ====================

export const authAPI = {
    /**
     * Verify login token
     * @param {string} idToken - Firebase ID token
     * @returns {Promise} User data and profile
     */
    verifyLogin: async (idToken) => {
        return fetchAPI('/verify-login', {
            method: 'POST',
            body: { idToken }
        });
    },

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise} Success status and reset link
     */
    resetPassword: async (email) => {
        return fetchAPI('/reset-password', {
            method: 'POST',
            body: { email }
        });
    }
};

export default {
    attendance: attendanceAPI,
    user: userAPI,
    course: courseAPI,
    admin: adminAPI,
    risk: riskAPI,
    auth: authAPI
};