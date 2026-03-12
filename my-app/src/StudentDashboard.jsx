import React, { useState, useEffect } from 'react';
import './StudentDashboard.css';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Users, BookOpen, TrendingUp, Settings, 
    Search, Bell, LogOut, Key, Plus, Edit, Trash2, Eye, 
    Download, Shield, Building, X, Menu, User, Calendar,
    Clock, MapPin, CheckCircle, AlertCircle, AlertTriangle,
    BookPlus
} from 'lucide-react';

import { auth, db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const STORAGE_KEYS = {
    USER: 'yallaclass_user',
    COURSES: 'yallaclass_courses',
    UPCOMING: 'yallaclass_upcoming',
    ATTENDANCE: 'yallaclass_attendance',
    TREND: 'yallaclass_trend'
};

const calculateRiskScore = (attendanceRate, grades, gpa, timeliness) => {
    const attendanceWeight = 0.2;
    const gradesWeight = 0.4;
    const gpaWeight = 0.2;
    const timelinessWeight = 0.2;
    const attendanceScore = attendanceRate || 0;
    const gradesScore = grades || 0;
    const gpaScore = (parseFloat(gpa) || 0) * 25;
    const timelinessScore = timeliness || 0; 
    const riskScore = (attendanceScore * attendanceWeight) + 
                      (gradesScore * gradesWeight) + 
                      (gpaScore * gpaWeight) + 
                      (timelinessScore * timelinessWeight);
    
    return Math.round(riskScore);
};

const getRiskLevel = (score) => {
    if (score < 40) return { level: 'High Risk', color: '#ef4444', icon: '🔴' };
    if (score < 60) return { level: 'Medium Risk', color: '#f59e0b', icon: '🟡' };
    if (score < 80) return { level: 'Low Risk', color: '#10b981', icon: '🟢' };
    return { level: 'Very Low Risk', color: '#3b82f6', icon: '🔵' };
};

export default function StudentDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [studentData, setStudentData] = useState({
        name: "Loading...",
        id: "...",
        email: "",
        department: "",
        academicYear: "",
        overallAttendance: 0,
        enrolledCourses: 0,
        profileImage: null,
        gpa: 0
    });
    
    const [courses, setCourses] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [trend, setTrend] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseRiskScores, setCourseRiskScores] = useState({}); 
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isViewCourseModalOpen, setIsViewCourseModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isRiskDetailsModalOpen, setIsRiskDetailsModalOpen] = useState(false);
    const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
    const [selectedRiskCourse, setSelectedRiskCourse] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [passwordFields, setPasswordFields] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [editProfileData, setEditProfileData] = useState({
        phoneNumber: '',
        address: '',
        emergencyContact: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if(!token){
                        navigate('/');
                    } else if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        setStudentData(prev => ({
                            ...prev,
                            name: userData.fullName || "No Name",
                            id: userData.code || "No Code",
                            email: userData.email || user.email,
                            department: userData.department || "General",
                            academicYear: userData.academicYear || "Year 1",
                            profileImage: localStorage.getItem('student_profile_image') || null,
                            gpa: userData.gpa || 0
                        }));
                        
                        await loadStudentCourses(user.uid);
                        await loadAvailableCourses();

                        const currentRisk = userData.riskLevel || "Low Risk"; 
                        if (currentRisk === "High Risk" || currentRisk === "Medium Risk") {
                        console.log("Student is at risk, notifying server...");
                        updateRiskOnServer(user.uid, currentRisk);} 
                        else {
                        console.log("Student is safe, no server update needed.");
                        }
                    }
                } catch (error) {
                    console.error("Error fetching student data:", error);
                }
            } else {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const loadStudentCourses = async (userId) => {
        try {
            setLoading(true);
            const userDocRef = doc(db, "users", userId);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) return;
            
            const userData = userDocSnap.data();
            const enrolledCourseIds = userData.enrolledCourses || [];
            
            if (enrolledCourseIds.length === 0) {
                setCourses([]);
                setStudentData(prev => ({ ...prev, enrolledCourses: 0 }));
                return;
            }
            const coursesRef = collection(db, "courses");
            const enrolledCourses = [];
            
            for (const courseId of enrolledCourseIds) {
                const courseQuery = query(coursesRef, where("courseId", "==", courseId));
                const courseSnap = await getDocs(courseQuery);
                
                courseSnap.forEach((doc) => {
                    const courseData = doc.data();
                    enrolledCourses.push({
                        id: courseData.courseId,
                        name: courseData.courseName,
                        instructor: courseData.instructorName,
                        schedule: `${courseData.SelectDays || 'TBA'} ${courseData.Time || ''}`,
                        days: courseData.SelectDays ? courseData.SelectDays.split(', ') : [],
                        time: courseData.Time || 'TBA',
                        room: courseData.RoomNumber || 'TBA',
                        students: parseInt(courseData.capacity) || 0,
                        attendanceRate: 0,
                        checkedIn: false,
                        timeRemaining: 0,
                        grades: 0,
                        timeliness: 0,
                        riskScore: 0,
                        riskLevel: getRiskLevel(0)
                    });
                });
            }
            
            setCourses(enrolledCourses);
            setStudentData(prev => ({
                ...prev,
                enrolledCourses: enrolledCourses.length
            }));
            const upcomingClasses = enrolledCourses.map((c, index) => ({
                id: index + 1,
                name: c.name,
                time: c.time,
                room: c.room,
                date: index === 0 ? "Today" : index === 1 ? "Today" : "Tomorrow",
                courseId: c.id
            }));
            setUpcoming(upcomingClasses);
            
        } catch (error) {
            console.error("Error loading courses:", error);
            showNotification('Error loading courses', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableCourses = async () => {
        try {
            const coursesRef = collection(db, "courses");
            const coursesSnap = await getDocs(coursesRef);
            const coursesList = [];
            coursesSnap.forEach((doc) => {
                const courseData = doc.data();
                coursesList.push({
                    id: courseData.courseId,
                    name: courseData.courseName,
                    instructor: courseData.instructorName,
                    schedule: `${courseData.SelectDays || 'TBA'} ${courseData.Time || ''}`,
                    days: courseData.SelectDays ? courseData.SelectDays.split(', ') : [],
                    time: courseData.Time || 'TBA',
                    room: courseData.RoomNumber || 'TBA',
                    capacity: parseInt(courseData.capacity) || 0,
                    enrolled: courseData.enrolledStudents || 0
                });
            });
            setAvailableCourses(coursesList);
        } catch (error) {
            console.error("Error loading available courses:", error);
        }
    };

    const handleAddCourse = async (course) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            if (courses.length >= 5) {
                showNotification('You can only enroll in up to 5 courses', 'error');
                return;
            }
            if (courses.some(c => c.id === course.id)) {
                showNotification('You are already enrolled in this course', 'error');
                return;
            }

            setLoading(true);
            const userDocRef = doc(db, "users", user.uid);
            
            await updateDoc(userDocRef, {
                enrolledCourses: arrayUnion(course.id)
            });
            const newCourse = {
                ...course,
                students: course.capacity,
                attendanceRate: 0,
                checkedIn: false,
                timeRemaining: 0,
                grades: 0,
                timeliness: 0,
                riskScore: 0,
                riskLevel: getRiskLevel(0)
            };

            setCourses(prev => [...prev, newCourse]);
            setStudentData(prev => ({
                ...prev,
                enrolledCourses: prev.enrolledCourses + 1
            }));

            showNotification(`Successfully enrolled in ${course.name}`, 'success');
            setIsAddCourseModalOpen(false);

        } catch (error) {
            console.error("Error adding course:", error);
            showNotification('Error enrolling in course', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            if (!window.confirm('Are you sure you want to drop this course?')) {
                return;
            }

            setLoading(true);
            const userDocRef = doc(db, "users", user.uid);
        
            await updateDoc(userDocRef, {
                enrolledCourses: arrayRemove(courseId)
            });
            setCourses(prev => prev.filter(c => c.id !== courseId));
            setUpcoming(prev => prev.filter(u => u.courseId !== courseId));
            setStudentData(prev => ({
                ...prev,
                enrolledCourses: prev.enrolledCourses - 1
            }));

            showNotification('Course dropped successfully', 'success');

        } catch (error) {
            console.error("Error deleting course:", error);
            showNotification('Error dropping course', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setStudentData(prev => ({
                    ...prev,
                    profileImage: reader.result
                }));
                localStorage.setItem('student_profile_image', reader.result);
                showNotification('Profile image updated successfully!');
            };
            reader.readAsDataURL(file);
        }
    };

    const removeProfileImage = () => {
        setStudentData(prev => ({
            ...prev,
            profileImage: null
        }));
        localStorage.removeItem('student_profile_image');
        showNotification('Profile image removed');
    };

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordFields(prev => ({ ...prev, [name]: value }));
    };

    const handleEditProfileChange = (e) => {
        const { name, value } = e.target;
        setEditProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        
        if (passwordFields.newPassword !== passwordFields.confirmPassword) {
            showNotification('New passwords do not match!', 'error');
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, passwordFields.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordFields.newPassword);
            
            showNotification('Password updated successfully!');
            setIsPasswordModalOpen(false);
            setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            showNotification('Error: Current password incorrect', 'error');
        }
    };

    //abdo
    const handleCheckIn = async (courseId) => {
    setCourses(prev => {
        const updatedCourses = prev.map(c => {
            if (c.id === courseId && !c.checkedIn) {
                showNotification(`Checked in to ${c.name}`);
                return { 
                    ...c, 
                    checkedIn: true, 
                    attendanceRate: Math.min(100, c.attendanceRate + 1) 
                };
            }
            return c;
        });
        const totalScore = updatedCourses.reduce((sum, c) => sum + (c.riskScore || 0), 0);
        const averageScore = updatedCourses.length > 0 ? Math.round(totalScore / updatedCourses.length) : 0;
        const newRisk = getRiskLevel(averageScore);
        if (auth.currentUser) {
            updateRiskOnServer(auth.currentUser.uid, newRisk.level);
        }

        return updatedCourses;
    });
    setStudentData(prev => ({
        ...prev,
        overallAttendance: Math.min(100, prev.overallAttendance + 0.5)
    }));
};

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('student_profile_image');
        setTimeout(() => {
            navigate('/');
        }, 1000);
    };

    const viewCourseDetails = (course) => {
        setSelectedCourse(course);
        setIsViewCourseModalOpen(true);
    };

    const viewRiskDetails = (course) => {
        setSelectedRiskCourse(course);
        setIsRiskDetailsModalOpen(true);
    };

    const viewAttendanceHistory = () => {
        setIsAttendanceModalOpen(true);
    };

    const filteredCourses = courses.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAvailableCourses = availableCourses.filter(c => 
        !courses.some(enrolled => enrolled.id === c.id) &&
        (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         c.id?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    const overallRiskScore = courses.length > 0 
        ? Math.round(courses.reduce((sum, c) => sum + (c.riskScore || 0), 0) / courses.length)
        : 0;
    const overallRiskLevel = getRiskLevel(overallRiskScore);
    
    //abdo
    const updateRiskOnServer = async (uid, riskLevel) => {
    try {
        const token = localStorage.getItem('token'); 
        
        const response = await fetch('http://localhost:3001/api/attendance/update-risk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                uid: uid,
                riskLevel: riskLevel
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log("Server updated: ", data.message);
        } else {
            console.error("Server update failed: ", data.error);
        }
    } catch (error) {
        console.error("Error connecting to backend:", error);
    }
};
    return (
        <div className="student-dashboard-container">
            {toast.show && (
                <div className="student-notifications-container">
                    <div className={`student-notification-item ${toast.type}`}>
                        {toast.message}
                    </div>
                </div>
            )}
            <aside className={`student-sidebar-wrapper ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="student-profile-section">
                    <div className="student-profile-image-wrapper" onClick={() => document.getElementById('student-profile-upload').click()}>
                        {studentData.profileImage ? (
                            <img src={studentData.profileImage} alt="Student" className="student-profile-image" />
                        ) : (
                            <div className="student-profile-placeholder">
                                {studentData.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="student-profile-status"></div>
                    </div>
                    <input 
                        type="file" 
                        id="student-profile-upload" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />
                    <h3 className="student-profile-name">{studentData.name}</h3>
                    <p className="student-profile-id">ID: {studentData.id}</p>
                    <p className="student-profile-dept">{studentData.department}</p>
                    {studentData.profileImage && (
                        <button className="student-remove-photo-button" onClick={removeProfileImage}>
                            Remove Photo
                        </button>
                    )}
                </div>

                <nav className="student-navigation-menu">
                    <button 
                        className={`student-nav-button ${activeTab === 'Dashboard' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Dashboard')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button 
                        className={`student-nav-button ${activeTab === 'My Courses' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('My Courses')}
                    >
                        <BookOpen size={20} />
                        <span>My Courses</span>
                    </button>
                    <button 
                        className={`student-nav-button ${activeTab === 'Attendance' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Attendance')}
                    >
                        <TrendingUp size={20} />
                        <span>Attendance</span>
                    </button>
                    <button 
                        className={`student-nav-button ${activeTab === 'Schedule' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Schedule')}
                    >
                        <Calendar size={20} />
                        <span>Schedule</span>
                    </button>
                    <button 
                        className={`student-nav-button ${activeTab === 'Profile' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Profile')}
                    >
                        <User size={20} />
                        <span>Profile</span>
                    </button>
                </nav>

                <div className="student-sidebar-footer">
                    <button className="student-nav-button student-password-button" onClick={() => setIsPasswordModalOpen(true)}>
                        <Key size={18} />
                        <span>Change Password</span>
                    </button>
                    <button className="student-nav-button student-logout-button" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="student-main-content">
                <header className="student-content-header">
                    <div className="student-page-title">
                        <button className="student-mobile-menu-trigger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>{activeTab}</h1>
                            <p>Welcome to your Student Dashboard</p>
                        </div>
                    </div>
                    <div className="student-header-controls">
                        <div className="student-search-container">
                            <Search size={18} className="student-search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search courses..." 
                                className="student-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="student-notification-button">
                            <Bell size={20} />
                            <span className="student-notification-badge">0</span>
                        </button>
                    </div>
                </header>

                <div className="student-scrollable-content">
                    {activeTab === 'Dashboard' && (
                        <div className="student-dashboard-view">
                            <div className="student-stats-grid">
                                <div className="student-stat-card blue" onClick={() => showNotification(`Overall Attendance: ${studentData.overallAttendance}%`)}>
                                    <div className="student-stat-icon blue">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div className="student-stat-info">
                                        <span className="student-stat-label">Attendance</span>
                                        <span className="student-stat-value">{studentData.overallAttendance}%</span>
                                    </div>
                                </div>
                                
                                <div className="student-stat-card green" onClick={() => setActiveTab('My Courses')}>
                                    <div className="student-stat-icon green">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="student-stat-info">
                                        <span className="student-stat-label">Courses</span>
                                        <span className="student-stat-value">{courses.length}/5</span>
                                    </div>
                                </div>
                                
                                <div className="student-stat-card purple" onClick={viewAttendanceHistory}>
                                    <div className="student-stat-icon purple">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="student-stat-info">
                                        <span className="student-stat-label">This Week</span>
                                        <span className="student-stat-value">0</span>
                                    </div>
                                </div>
                                <div className="student-stat-card" style={{ borderLeft: `4px solid ${overallRiskLevel.color}` }} onClick={() => showNotification(`Overall Risk Score: ${overallRiskScore} - ${overallRiskLevel.level}`)}>
                                    <div className="student-stat-icon" style={{ background: `${overallRiskLevel.color}20`, color: overallRiskLevel.color }}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div className="student-stat-info">
                                        <span className="student-stat-label">Risk Score</span>
                                        <span className="student-stat-value" style={{ color: overallRiskLevel.color }}>{overallRiskScore}</span>
                                        <span className="student-stat-label" style={{ fontSize: '12px' }}>{overallRiskLevel.level}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="student-middle-row">
                                <div className="student-chart-card">
                                    <div className="student-card-header">
                                        <Calendar size={20} />
                                        <h3>Today's Schedule</h3>
                                    </div>
                                    <div className="student-schedule-list">
                                        {upcoming.filter(u => u.date === "Today").length === 0 ? (
                                            <p className="student-no-data">No classes today</p>
                                        ) : (
                                            upcoming.filter(u => u.date === "Today").map((cls, idx) => {
                                                const course = courses.find(c => c.id === cls.courseId);
                                                return (
                                                    <div className="student-schedule-item" key={idx}>
                                                        <div className="student-schedule-time">
                                                            <Clock size={16} />
                                                            <span>{cls.time}</span>
                                                        </div>
                                                        <div className="student-schedule-details">
                                                            <h4>{cls.name}</h4>
                                                            <p>Room {cls.room}</p>
                                                        </div>
                                                        <button 
                                                            className="student-check-in-mini"
                                                            onClick={() => {
                                                                if (course && !course.checkedIn) {
                                                                    handleCheckIn(cls.courseId);
                                                                }
                                                            }}
                                                            disabled={course?.checkedIn}
                                                        >
                                                            {course?.checkedIn ? '✓' : 'Check In'}
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="student-chart-card">
                                    <div className="student-card-header">
                                        <Bell size={20} />
                                        <h3>Recent Activity</h3>
                                    </div>
                                    <div className="student-activity-list">
                                        {courses.filter(c => c.checkedIn).slice(0, 3).map((course, i) => (
                                            <div className="student-activity-item" key={i}>
                                                <div className="student-activity-icon success">
                                                    <CheckCircle size={16}/>
                                                </div>
                                                <div className="student-activity-text">
                                                    <h4>Checked in to {course.name}</h4>
                                                    <p>Today at {course.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {courses.filter(c => !c.checkedIn).length === courses.length && (
                                            <p className="student-no-data">No recent activity</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="student-tables-row">
                                <div className="student-table-card">
                                    <div className="student-table-header">
                                        <h3>My Courses</h3>
                                        <span className="student-view-all-link" onClick={() => setActiveTab('My Courses')}>
                                            View All
                                        </span>
                                    </div>
                                    <div className="student-courses-grid-mini">
                                        {courses.slice(0, 3).map(course => (
                                            <div className="student-course-mini-card" key={course.id} onClick={() => viewCourseDetails(course)}>
                                                <div className="student-course-mini-header">
                                                    <span className="student-course-code">{course.id}</span>
                                                    <span className={`student-status-badge ${course.checkedIn ? 'checked' : 'pending'}`}>
                                                        {course.checkedIn ? 'Checked' : 'Pending'}
                                                    </span>
                                                </div>
                                                <h4>{course.name}</h4>
                                                <p>{course.instructor}</p>
                                                <div className="student-course-mini-footer">
                                                    <span>{course.schedule}</span>
                                                    <span className="student-attendance-small">{course.attendanceRate}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="student-table-card">
                                    <div className="student-table-header">
                                        <h3>Attendance Trend</h3>
                                        <span className="student-view-all-link" onClick={viewAttendanceHistory}>
                                            View Details
                                        </span>
                                    </div>
                                    <div className="student-trend-mini">
                                        <div className="student-chart-bars">
                                            {trend.slice(-4).map((week, index) => (
                                                <div key={index} className="student-bar-wrapper">
                                                    <div className="student-bar" style={{ height: `${week.rate}px` }}></div>
                                                    <span className="student-bar-label">{week.rate}%</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="student-axis-labels">
                                            {trend.slice(-4).map((week, idx) => (
                                                <span key={idx}>{week.week}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'My Courses' && (
                        <div className="student-table-card full-page">
                            <div className="student-table-header">
                                <div className="student-flex-align">
                                    <BookOpen size={24} className="student-text-primary student-margin-right-2" />
                                    <h3>My Courses ({courses.length}/5)</h3>
                                </div>
                                {courses.length < 5 && (
                                    <button 
                                        className="student-add-course-button"
                                        onClick={() => setIsAddCourseModalOpen(true)}
                                    >
                                        <BookPlus size={18} /> Add Course
                                    </button>
                                )}
                            </div>
                            <div className="student-courses-grid">
                                {courses.length === 0 ? (
                                    <div className="student-no-courses">
                                        <BookOpen size={48} className="student-no-data-icon" />
                                        <p>You haven't enrolled in any courses yet</p>
                                        {courses.length < 5 && (
                                            <button 
                                                className="student-add-course-button-large"
                                                onClick={() => setIsAddCourseModalOpen(true)}
                                            >
                                                <BookPlus size={20} /> Enroll in a Course
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredCourses.map(course => (
                                        <div className="student-course-card" key={course.id}>
                                            <div className="student-course-card-header">
                                                <span className="student-course-code-large">{course.id}</span>
                                                <div className="student-course-actions">
                                                    <button 
                                                        className="student-delete-course-button"
                                                        onClick={() => handleDeleteCourse(course.id)}
                                                        title="Drop Course"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3>{course.name}</h3>
                                            <p className="student-instructor">{course.instructor}</p>
                                            
                                            <div className="student-course-details">
                                                <div className="student-detail-item">
                                                    <Calendar size={16} />
                                                    <span>{course.schedule}</span>
                                                </div>
                                                <div className="student-detail-item">
                                                    <MapPin size={16} />
                                                    <span>Room {course.room}</span>
                                                </div>
                                            </div>
                                            <div className="student-course-card-footer">
                                                <div className="student-attendance-progress">
                                                    <div className="student-progress-bar">
                                                        <div className="student-progress-fill" style={{ width: `${course.attendanceRate}%` }}></div>
                                                    </div>
                                                    <span className="student-attendance-percent">{course.attendanceRate}%</span>
                                                </div>
                                                <button 
                                                    className="student-check-in-button"
                                                    onClick={() => handleCheckIn(course.id)}
                                                    disabled={course.checkedIn}
                                                >
                                                    {course.checkedIn ? 'Checked In' : 'Check In'}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'Attendance' && (
                        <div className="student-table-card full-page">
                            <div className="student-table-header">
                                <div className="student-flex-align">
                                    <TrendingUp size={24} className="student-text-primary student-margin-right-2" />
                                    <h3>Attendance Records</h3>
                                </div>
                                <button className="student-nav-button" onClick={() => showNotification('Downloading report...')}>
                                    <Download size={18} /> Export
                                </button>
                            </div>
                            <div className="student-attendance-summary">
                                <div className="student-summary-item">
                                    <span className="student-summary-label">Overall Attendance</span>
                                    <span className="student-summary-value">{studentData.overallAttendance}%</span>
                                </div>
                                <div className="student-summary-item">
                                    <span className="student-summary-label">Enrolled Courses</span>
                                    <span className="student-summary-value">{courses.length}</span>
                                </div>
                                <div className="student-summary-item">
                                    <span className="student-summary-label">On Time</span>
                                    <span className="student-summary-value success">0</span>
                                </div>
                                <div className="student-summary-item">
                                    <span className="student-summary-label">Late</span>
                                    <span className="student-summary-value warning">0</span>
                                </div>
                                <div className="student-summary-item">
                                    <span className="student-summary-label">Absences</span>
                                    <span className="student-summary-value danger">0</span>
                                </div>
                            </div>
                            <div className="student-table-responsive">
                                <table className="student-data-table">
                                    <thead>
                                        <tr>
                                            <th>Course Code</th>
                                            <th>Course Name</th>
                                            <th>Attendance Rate</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courses.length === 0 ? (
                                            <tr><td colSpan="4" className="student-no-data">No attendance records</td></tr>
                                        ) : (
                                            courses.map((course, idx) => (
                                                <tr key={idx}>
                                                    <td className="student-text-muted">{course.id}</td>
                                                    <td className="student-text-bold">{course.name}</td>
                                                    <td>{course.attendanceRate}%</td>
                                                    <td>
                                                        <span className={`student-status-badge ${course.checkedIn ? 'checked' : 'pending'}`}>
                                                            {course.checkedIn ? 'Present Today' : 'Not Checked In'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'Schedule' && (
                        <div className="student-table-card full-page">
                            <div className="student-table-header">
                                <div className="student-flex-align">
                                    <Calendar size={24} className="student-text-primary student-margin-right-2" />
                                    <h3>Weekly Schedule</h3>
                                </div>
                            </div>
                            
                            <div className="student-schedule-grid">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                    const dayClasses = upcoming.filter(u => {
                                        const course = courses.find(c => c.id === u.courseId);
                                        return course?.days.includes(day.substring(0, 3));
                                    });
                                    
                                    return (
                                        <div className="student-schedule-day-card" key={day}>
                                            <h4>{day}</h4>
                                            {dayClasses.length === 0 ? (
                                                <p className="student-no-classes">No classes</p>
                                            ) : (
                                                dayClasses.map((cls, idx) => {
                                                    return (
                                                        <div className="student-day-class" key={idx}>
                                                            <span className="student-class-time">{cls.time}</span>
                                                            <span className="student-class-name">{cls.name}</span>
                                                            <span className="student-class-room">Room {cls.room}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {activeTab === 'Profile' && (
                        <div className="student-profile-view">
                            <div className="student-profile-card">
                                <div className="student-profile-header">
                                    <div className="student-profile-avatar-large">
                                        {studentData.profileImage ? (
                                            <img src={studentData.profileImage} alt="Profile" />
                                        ) : (
                                            <div className="student-avatar-placeholder">
                                                {studentData.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="student-profile-title">
                                        <h2>{studentData.name}</h2>
                                        <p>{studentData.email}</p>
                                        <p className="student-student-id">Student ID: {studentData.id}</p>
                                    </div>
                                    <button className="student-edit-profile-button" onClick={() => setIsProfileModalOpen(true)}>
                                        <Edit size={16} /> Edit Profile
                                    </button>
                                </div>
                                
                                <div className="student-profile-details">
                                    <div className="student-detail-section">
                                        <h3>Academic Information</h3>
                                        <div className="student-detail-grid">
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Department:</span>
                                                <span className="student-detail-value">{studentData.department}</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Academic Year:</span>
                                                <span className="student-detail-value">{studentData.academicYear}</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Enrolled Courses:</span>
                                                <span className="student-detail-value">{courses.length}/5</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Overall Attendance:</span>
                                                <span className="student-detail-value">{studentData.overallAttendance}%</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">GPA:</span>
                                                <span className="student-detail-value" style={{ color: '#4a90e2' }}>{studentData.gpa}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="student-detail-section">
                                        <h3>Contact Information</h3>
                                        <div className="student-detail-grid">
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Email:</span>
                                                <span className="student-detail-value">{studentData.email}</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Phone:</span>
                                                <span className="student-detail-value">{editProfileData.phoneNumber || 'Not provided'}</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Address:</span>
                                                <span className="student-detail-value">{editProfileData.address || 'Not provided'}</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Emergency Contact:</span>
                                                <span className="student-detail-value">{editProfileData.emergencyContact || 'Not provided'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            {isAddCourseModalOpen && (
                <div className="student-modal-overlay" onClick={() => setIsAddCourseModalOpen(false)}>
                    <div className="student-modal-container large" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h2>Add New Course</h2>
                            <button className="student-close-modal-button" onClick={() => setIsAddCourseModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="student-course-search">
                            <Search size={18} className="student-search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search available courses..." 
                                className="student-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="student-available-courses">
                            {filteredAvailableCourses.length === 0 ? (
                                <p className="student-no-data">No available courses found</p>
                            ) : (
                                filteredAvailableCourses.map(course => (
                                    <div className="student-available-course-card" key={course.id}>
                                        <div className="student-course-code-badge">{course.id}</div>
                                        <div className="student-course-info">
                                            <h4>{course.name}</h4>
                                            <p className="student-instructor-name">{course.instructor}</p>
                                            <div className="student-course-meta">
                                                <span><Calendar size={14} /> {course.schedule}</span>
                                                <span><MapPin size={14} /> Room {course.room}</span>
                                                <span><Users size={14} /> {course.enrolled}/{course.capacity}</span>
                                            </div>
                                        </div>
                                        <button 
                                            className="student-add-course-confirm"
                                            onClick={() => handleAddCourse(course)}
                                            disabled={loading}
                                        >
                                            {loading ? 'Adding...' : 'Add Course'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isPasswordModalOpen && (
                <div className="student-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
                    <div className="student-modal-container small" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h2>Change Password</h2>
                            <button className="student-close-modal-button" onClick={() => setIsPasswordModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordUpdate} className="student-modal-form">
                            <div className="student-form-group">
                                <label className="student-form-label">Current Password</label>
                                <input 
                                    type="password" 
                                    name="currentPassword" 
                                    required 
                                    className="student-form-input" 
                                    value={passwordFields.currentPassword} 
                                    onChange={handlePasswordInputChange} 
                                    placeholder="Enter current password" 
                                />
                            </div>
                            <div className="student-form-group">
                                <label className="student-form-label">New Password</label>
                                <input 
                                    type="password" 
                                    name="newPassword" 
                                    required 
                                    className="student-form-input" 
                                    value={passwordFields.newPassword} 
                                    onChange={handlePasswordInputChange} 
                                    placeholder="Enter new password" 
                                />
                            </div>
                            <div className="student-form-group">
                                <label className="student-form-label">Confirm Password</label>
                                <input 
                                    type="password" 
                                    name="confirmPassword" 
                                    required 
                                    className="student-form-input" 
                                    value={passwordFields.confirmPassword} 
                                    onChange={handlePasswordInputChange} 
                                    placeholder="Confirm new password" 
                                />
                            </div>
                            <div className="student-password-requirements">
                                <p>Password must be at least 6 characters long</p>
                            </div>
                            <div className="student-modal-actions">
                                <button type="button" className="student-cancel-button" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                                <button type="submit" className="student-submit-button">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isProfileModalOpen && (
                <div className="student-modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
                    <div className="student-modal-container" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h2>Edit Profile</h2>
                            <button className="student-close-modal-button" onClick={() => setIsProfileModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form className="student-modal-form">
                            <div className="student-form-grid">
                                <div className="student-form-group full-width">
                                    <label className="student-form-label">Phone Number</label>
                                    <input 
                                        type="text" 
                                        name="phoneNumber"
                                        className="student-form-input"
                                        value={editProfileData.phoneNumber}
                                        onChange={handleEditProfileChange}
                                        placeholder="Enter phone number"
                                    />
                                </div>
                                <div className="student-form-group full-width">
                                    <label className="student-form-label">Address</label>
                                    <input 
                                        type="text" 
                                        name="address"
                                        className="student-form-input"
                                        value={editProfileData.address}
                                        onChange={handleEditProfileChange}
                                        placeholder="Enter address"
                                    />
                                </div>
                                <div className="student-form-group full-width">
                                    <label className="student-form-label">Emergency Contact</label>
                                    <input 
                                        type="text" 
                                        name="emergencyContact"
                                        className="student-form-input"
                                        value={editProfileData.emergencyContact}
                                        onChange={handleEditProfileChange}
                                        placeholder="Enter emergency contact"
                                    />
                                </div>
                            </div>
                            <div className="student-modal-actions">
                                <button type="button" className="student-cancel-button" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
                                <button 
                                    type="button" 
                                    className="student-submit-button"
                                    onClick={() => {
                                        showNotification('Profile updated successfully!');
                                        setIsProfileModalOpen(false);
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}