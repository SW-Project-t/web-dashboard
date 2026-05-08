




const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://backend-2-qju2.onrender.com';




const getAuthToken = () => {
    return localStorage.getItem('token');
};




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




const handleResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    
    
    if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'An error occurred');
        }
        
        return data;
    }
    
    
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'An error occurred');
    }
    
    return { success: true };
};




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



export const attendanceAPI = {
    




    getStudentAttendance: async (studentId) => {
        if (!studentId) {
            throw new Error('Student ID is required');
        }
        return fetchAPI(`/api/attendance/student/${studentId}`);
    },

    





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

    



    getAllCoursesAttendance: async () => {
        return fetchAPI('/api/attendance/admin/courses');
    },

    




    recordAttendance: async (attendanceData) => {
        return fetchAPI('/api/attendance/record', {
            method: 'POST',
            body: attendanceData
        });
    },

    





    updateAttendanceRecord: async (recordId, updates) => {
        return fetchAPI(`/api/attendance/${recordId}`, {
            method: 'PUT',
            body: updates
        });
    },

    




    deleteAttendanceRecord: async (recordId) => {
        return fetchAPI(`/api/attendance/${recordId}`, {
            method: 'DELETE'
        });
    },

    




    getCourseAttendanceSummary: async (courseId) => {
        return fetchAPI(`/api/attendance/course/${courseId}/summary`);
    }
};



export const userAPI = {
    



    getProfile: async () => {
        return fetchAPI('/api/profile');
    },

    




    updateProfile: async (updates) => {
        return fetchAPI('/api/profile/update', {
            method: 'PUT',
            body: updates
        });
    },

    





    updatePassword: async (currentPassword, newPassword) => {
        return fetchAPI('/api/profile/update-password', {
            method: 'PUT',
            body: { currentPassword, newPassword }
        });
    },

    




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



export const aiAPI = {
    




    sendChat: async (message, conversation = []) => {
        return fetchAPI('/api/ai/chat', {
            method: 'POST',
            body: { message, conversation }
        });
    }
};



export const courseAPI = {
    



    getAllCourses: async () => {
        return fetchAPI('/api/all-courses');
    },

    





    enrollCourse: async (studentUid, courseId) => {
        return fetchAPI('/api/enroll-course', {
            method: 'POST',
            body: { studentUid, courseId }
        });
    },

    




    getCourseStudents: async (courseId) => {
        const response = await fetch(`${API_BASE_URL}/api/course-students/${courseId}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return handleResponse(response);
    },

    




    enrollStudent: async (studentData) => {
        return fetchAPI('/api/enroll-student', {
            method: 'POST',
            body: studentData
        });
    },

    




    unenrollStudent: async (enrollmentId) => {
        return fetchAPI('/api/unenroll-student', {
            method: 'DELETE',
            body: { enrollmentId }
        });
    }
};



export const messageAPI = {
    




    sendMessage: async (payload) => {
        return fetchAPI('/api/messages/send', {
            method: 'POST',
            body: payload
        });
    }
};



export const adminAPI = {
    



    getAllUsers: async () => {
        return fetchAPI('/admin/users');
    },

    




    addUser: async (userData) => {
        return fetchAPI('/admin/add-user', {
            method: 'POST',
            body: userData
        });
    },

    




    addUsersBulk: async (users) => {
        return fetchAPI('/admin/add-users-bulk', {
            method: 'POST',
            body: { users }
        });
    },

    




    deleteUser: async (uid) => {
        return fetchAPI(`/admin/delete-user/${uid}`, {
            method: 'DELETE'
        });
    },

    





    updateUser: async (uid, updates) => {
        return fetchAPI(`/admin/update-user/${uid}`, {
            method: 'PUT',
            body: updates
        });
    },

    




    addCourse: async (courseData) => {
        return fetchAPI('/admin/add-course', {
            method: 'POST',
            body: courseData
        });
    },

    




    addCoursesBulk: async (courses) => {
        return fetchAPI('/admin/add-courses-bulk', {
            method: 'POST',
            body: { courses }
        });
    }
};



export const riskAPI = {
    




    analyzeRisk: async (uid) => {
        return fetchAPI(`/api/analyze-risk/${uid}`, {
            method: 'POST'
        });
    },

    





    updateRisk: async (uid, riskLevel) => {
        return fetchAPI('/api/attendance/update-risk', {
            method: 'POST',
            body: { uid, riskLevel }
        });
    }
};



export const aiChatAPI = {
    





    sendMessage: async (message, conversation = []) => {
        return fetchAPI('/api/ai/chat', {
            method: 'POST',
            body: { message, conversation }
        });
    }
};



export const authAPI = {
    




    verifyLogin: async (idToken) => {
        return fetchAPI('/verify-login', {
            method: 'POST',
            body: { idToken }
        });
    },

    




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
    aiChat: aiChatAPI,
    risk: riskAPI,
    auth: authAPI
};