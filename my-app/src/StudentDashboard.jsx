import React, { useState, useEffect } from 'react';
import './StudentDashboard.css';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Users, BookOpen, TrendingUp, Settings, 
    Search, Bell, LogOut, Key, Plus, Edit, Trash2, Eye, 
    Download, Shield, Building, X, Menu, User, Calendar,
    Clock, MapPin, CheckCircle, AlertCircle
} from 'lucide-react';

import { auth, db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const STORAGE_KEYS = {
    USER: 'yallaclass_user',
    COURSES: 'yallaclass_courses',
    UPCOMING: 'yallaclass_upcoming',
    ATTENDANCE: 'yallaclass_attendance',
    TREND: 'yallaclass_trend'
};

export default function StudentDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [studentData, setStudentData] = useState({
        name: "Loading...",
        id: "...",
        email: "",
        department: "",
        academicYear: "",
        overallAttendance: 92,
        enrolledCourses: 0,
        profileImage: null
    });
    
    const [courses, setCourses] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [trend, setTrend] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    
    // Modal states
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isViewCourseModalOpen, setIsViewCourseModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    
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
                            profileImage: localStorage.getItem('student_profile_image') || null
                        }));
                        
                        // Load student's courses
                        await loadStudentCourses(user.uid);
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
            // Get courses from Firestore
            const coursesRef = collection(db, "courses");
            const coursesSnap = await getDocs(coursesRef);
            const coursesList = [];
            coursesSnap.forEach((doc) => {
                coursesList.push({ id: doc.id, ...doc.data() });
            });
            
            // For demo, take first 3 courses
            const enrolledCourses = coursesList.slice(0, 3).map(c => ({
                id: c.courseId,
                name: c.courseName,
                instructor: c.instructorName,
                schedule: `${c.SelectDays || 'Mon, Wed'} ${c.Time || '10:00 AM'}`,
                days: c.SelectDays ? c.SelectDays.split(', ') : ['Mon', 'Wed'],
                time: c.Time || '10:00 AM',
                room: c.RoomNumber || '101',
                students: parseInt(c.capacity) || 30,
                attendanceRate: Math.floor(Math.random() * 20) + 80,
                checkedIn: false,
                timeRemaining: 0
            }));
            
            setCourses(enrolledCourses);
            setStudentData(prev => ({
                ...prev,
                enrolledCourses: enrolledCourses.length
            }));
            
            // Set upcoming classes
            const upcomingClasses = enrolledCourses.map((c, index) => ({
                id: index + 1,
                name: c.name,
                time: c.time,
                room: c.room,
                date: index === 0 ? "Today" : index === 1 ? "Today" : "Tomorrow",
                courseId: c.id
            }));
            setUpcoming(upcomingClasses);
            
            // Set attendance records
            const attendanceRecords = enrolledCourses.map(c => ({
                class: c.id,
                name: c.name,
                onTime: Math.floor(Math.random() * 10) + 5,
                late: Math.floor(Math.random() * 3),
                absences: Math.floor(Math.random() * 2),
                total: 18
            }));
            setAttendance(attendanceRecords);
            
            // Set trend data
            setTrend([
                { week: "Week 1", rate: 92 }, { week: "Week 2", rate: 88 }, 
                { week: "Week 3", rate: 95 }, { week: "Week 4", rate: 89 },
                { week: "Week 5", rate: 93 }, { week: "Week 6", rate: 92 }
            ]);
            
        } catch (error) {
            console.error("Error loading courses:", error);
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

    const handleCheckIn = (courseId) => {
        setCourses(prev => prev.map(c => {
            if (c.id === courseId && !c.checkedIn) {
                showNotification(`Checked in to ${c.name}`);
                return { ...c, checkedIn: true, attendanceRate: Math.min(100, c.attendanceRate + 1) };
            }
            return c;
        }));
        
        setStudentData(prev => ({
            ...prev,
            overallAttendance: Math.min(100, prev.overallAttendance + 0.5)
        }));
    };

    const toggleGPS = () => {
        showNotification(`GPS ${!studentData.gpsActive ? 'Activated' : 'Deactivated'}`);
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

    const viewAttendanceHistory = () => {
        setIsAttendanceModalOpen(true);
    };

    const filteredCourses = courses.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredUpcoming = upcoming.filter(u => 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="admin-layout student-layout">
            {toast.show && (
                <div className={`notification ${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {/* Sidebar - Admin style */}
            <aside className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                <div className="sidebar-profile-section">
                    <div className="profile-img-container" onClick={() => document.getElementById('student-profile-upload').click()}>
                        {studentData.profileImage ? (
                            <img src={studentData.profileImage} alt="Student" className="profile-img" />
                        ) : (
                            <div className="profile-placeholder">
                                {studentData.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="profile-status"></div>
                    </div>
                    <input 
                        type="file" 
                        id="student-profile-upload" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />
                    <h3 className="profile-name">{studentData.name}</h3>
                    <p className="profile-id">ID: {studentData.id}</p>
                    <p className="profile-dept">{studentData.department}</p>
                    {studentData.profileImage && (
                        <button className="remove-photo-text" onClick={removeProfileImage}>
                            Remove Photo
                        </button>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <button 
                        className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Dashboard')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'My Courses' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('My Courses')}
                    >
                        <BookOpen size={20} />
                        <span>My Courses</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'Attendance' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Attendance')}
                    >
                        <TrendingUp size={20} />
                        <span>Attendance</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'Schedule' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Schedule')}
                    >
                        <Calendar size={20} />
                        <span>Schedule</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'Profile' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Profile')}
                    >
                        <User size={20} />
                        <span>Profile</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item btn-password" onClick={() => setIsPasswordModalOpen(true)}>
                        <Key size={18} />
                        <span>Change Password</span>
                    </button>
                    <button className="nav-item btn-logout" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content - Admin style */}
            <main className="admin-main">
                <header className="main-header">
                    <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu size={24} />
                    </button>
                    <div className="header-title">
                        <div>
                            <h1>{activeTab}</h1>
                            <p>Welcome to your Student Dashboard</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <div className="search-bar">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search courses..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="bell-btn">
                            <Bell size={20} />
                            <span className="bell-badge">3</span>
                        </button>
                    </div>
                </header>

                <div className="content-scroll">
                    {/* Dashboard View */}
                    {activeTab === 'Dashboard' && (
                        <div className="dashboard-view">
                            {/* بطاقات الإحصائيات */}
                            <div className="stats-grid">
                                <div className="stat-card blue" onClick={() => showNotification(`Overall Attendance: ${studentData.overallAttendance}%`)}>
                                    <div className="stat-icon blue">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Attendance</span>
                                        <span className="stat-value">{studentData.overallAttendance}%</span>
                                    </div>
                                </div>
                                
                                <div className="stat-card green" onClick={() => setActiveTab('My Courses')}>
                                    <div className="stat-icon green">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Courses</span>
                                        <span className="stat-value">{courses.length}</span>
                                    </div>
                                </div>
                                
                                <div className="stat-card purple" onClick={viewAttendanceHistory}>
                                    <div className="stat-icon purple">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">This Week</span>
                                        <span className="stat-value">{attendance.reduce((sum, a) => sum + a.onTime, 0)}</span>
                                    </div>
                                </div>
                                
                                <div className="stat-card orange" onClick={toggleGPS}>
                                    <div className="stat-icon orange">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">GPS</span>
                                        <span className="stat-value">Active</span>
                                    </div>
                                </div>
                            </div>

                            {/* Today's Schedule */}
                            <div className="middle-row">
                                <div className="chart-card schedule-card">
                                    <div className="card-heading">
                                        <Calendar size={20} />
                                        <h3>Today's Schedule</h3>
                                    </div>
                                    <div className="schedule-list">
                                        {upcoming.filter(u => u.date === "Today").length === 0 ? (
                                            <p className="no-data">No classes today</p>
                                        ) : (
                                            upcoming.filter(u => u.date === "Today").map((cls, idx) => (
                                                <div className="schedule-item" key={idx}>
                                                    <div className="schedule-time">
                                                        <Clock size={16} />
                                                        <span>{cls.time}</span>
                                                    </div>
                                                    <div className="schedule-details">
                                                        <h4>{cls.name}</h4>
                                                        <p>Room {cls.room}</p>
                                                    </div>
                                                    <button 
                                                        className="check-in-mini"
                                                        onClick={() => {
                                                            const course = courses.find(c => c.id === cls.courseId);
                                                            if (course && !course.checkedIn) {
                                                                handleCheckIn(cls.courseId);
                                                            }
                                                        }}
                                                        disabled={courses.find(c => c.id === cls.courseId)?.checkedIn}
                                                    >
                                                        {courses.find(c => c.id === cls.courseId)?.checkedIn ? '✓' : 'Check In'}
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card activity-card">
                                    <div className="card-heading">
                                        <Bell size={20} />
                                        <h3>Recent Activity</h3>
                                    </div>
                                    <div className="activity-list">
                                        {courses.filter(c => c.checkedIn).slice(0, 3).map((course, i) => (
                                            <div className="activity-item" key={i}>
                                                <div className="activity-icon success">
                                                    <CheckCircle size={16}/>
                                                </div>
                                                <div className="activity-text">
                                                    <h4>Checked in to {course.name}</h4>
                                                    <p>Today at {course.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {courses.filter(c => !c.checkedIn).length === courses.length && (
                                            <p className="no-data">No recent activity</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* My Courses Preview */}
                            <div className="tables-row">
                                <div className="table-card">
                                    <div className="table-header">
                                        <h3>My Courses</h3>
                                        <span className="view-all" onClick={() => setActiveTab('My Courses')}>
                                            View All
                                        </span>
                                    </div>
                                    <div className="courses-grid-mini">
                                        {courses.slice(0, 3).map(course => (
                                            <div className="course-mini-card" key={course.id} onClick={() => viewCourseDetails(course)}>
                                                <div className="course-mini-header">
                                                    <span className="course-code">{course.id}</span>
                                                    <span className={`status-badge ${course.checkedIn ? 'checked' : 'pending'}`}>
                                                        {course.checkedIn ? 'Checked' : 'Pending'}
                                                    </span>
                                                </div>
                                                <h4>{course.name}</h4>
                                                <p>{course.instructor}</p>
                                                <div className="course-mini-footer">
                                                    <span>{course.schedule}</span>
                                                    <span className="attendance-small">{course.attendanceRate}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Attendance Trend Preview */}
                                <div className="table-card">
                                    <div className="table-header">
                                        <h3>Attendance Trend</h3>
                                        <span className="view-all" onClick={viewAttendanceHistory}>
                                            View Details
                                        </span>
                                    </div>
                                    <div className="trend-mini">
                                        <div className="chart-bars">
                                            {trend.slice(-4).map((week, index) => (
                                                <div key={index} className="bar-wrapper">
                                                    <div className="bar" style={{ height: `${week.rate}px` }}></div>
                                                    <span className="bar-label">{week.rate}%</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="axis-labels">
                                            {trend.slice(-4).map((week, idx) => (
                                                <span key={idx}>{week.week}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* My Courses View */}
                    {activeTab === 'My Courses' && (
                        <div className="table-card full-page">
                            <div className="table-header">
                                <div className="flex-align">
                                    <BookOpen size={24} className="text-primary mr-2" />
                                    <h3>My Courses ({filteredCourses.length})</h3>
                                </div>
                            </div>
                            <div className="courses-grid">
                                {filteredCourses.length === 0 ? (
                                    <p className="no-data">No courses found</p>
                                ) : (
                                    filteredCourses.map(course => (
                                        <div className="course-card" key={course.id}>
                                            <div className="course-card-header">
                                                <span className="course-code-large">{course.id}</span>
                                                <span className={`status-large ${course.checkedIn ? 'checked' : 'pending'}`}>
                                                    {course.checkedIn ? 'Checked In' : 'Not Checked In'}
                                                </span>
                                            </div>
                                            <h3>{course.name}</h3>
                                            <p className="instructor">{course.instructor}</p>
                                            <div className="course-details">
                                                <div className="detail-item">
                                                    <Calendar size={16} />
                                                    <span>{course.schedule}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <MapPin size={16} />
                                                    <span>Room {course.room}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <Users size={16} />
                                                    <span>{course.students} Students</span>
                                                </div>
                                            </div>
                                            <div className="course-card-footer">
                                                <div className="attendance-progress">
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{ width: `${course.attendanceRate}%` }}></div>
                                                    </div>
                                                    <span className="attendance-percent">{course.attendanceRate}%</span>
                                                </div>
                                                <button 
                                                    className="check-in-btn"
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

                    {/* Attendance View */}
                    {activeTab === 'Attendance' && (
                        <div className="table-card full-page">
                            <div className="table-header">
                                <div className="flex-align">
                                    <TrendingUp size={24} className="text-primary mr-2" />
                                    <h3>Attendance Records</h3>
                                </div>
                                <button className="primary-btn" onClick={() => showNotification('Downloading report...')}>
                                    <Download size={18} /> Export
                                </button>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="attendance-summary">
                                <div className="summary-item">
                                    <span className="summary-label">Overall Attendance</span>
                                    <span className="summary-value">{studentData.overallAttendance}%</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Total Classes</span>
                                    <span className="summary-value">{attendance.reduce((sum, a) => sum + a.total, 0)}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">On Time</span>
                                    <span className="summary-value success">{attendance.reduce((sum, a) => sum + a.onTime, 0)}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Late</span>
                                    <span className="summary-value warning">{attendance.reduce((sum, a) => sum + a.late, 0)}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Absences</span>
                                    <span className="summary-value danger">{attendance.reduce((sum, a) => sum + a.absences, 0)}</span>
                                </div>
                            </div>

                            {/* Attendance Table */}
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Course Code</th>
                                            <th>Course Name</th>
                                            <th>On Time</th>
                                            <th>Late</th>
                                            <th>Absences</th>
                                            <th>Total</th>
                                            <th>Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.length === 0 ? (
                                            <tr><td colSpan="7" className="no-data">No attendance records</td></tr>
                                        ) : (
                                            attendance.map((item, idx) => {
                                                const rate = Math.round((item.onTime / item.total) * 100);
                                                return (
                                                    <tr key={idx}>
                                                        <td className="text-muted">{item.class}</td>
                                                        <td className="fw-bold">{item.name}</td>
                                                        <td className="success-text">{item.onTime}</td>
                                                        <td className="warning-text">{item.late}</td>
                                                        <td className="danger-text">{item.absences}</td>
                                                        <td>{item.total}</td>
                                                        <td>
                                                            <span className={`rate-badge ${rate >= 90 ? 'excellent' : rate >= 75 ? 'good' : 'poor'}`}>
                                                                {rate}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Trend Chart */}
                            <div className="trend-card">
                                <h4>6-Week Attendance Trend</h4>
                                <div className="chart-container">
                                    <div className="chart-bars">
                                        {trend.map((week, index) => (
                                            <div key={index} className="bar-wrapper">
                                                <div className="bar" style={{ height: `${week.rate * 1.5}px` }}></div>
                                                <span className="bar-label">{week.rate}%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="axis-labels">
                                        {trend.map((week, idx) => (
                                            <span key={idx}>{week.week}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schedule View */}
                    {activeTab === 'Schedule' && (
                        <div className="table-card full-page">
                            <div className="table-header">
                                <div className="flex-align">
                                    <Calendar size={24} className="text-primary mr-2" />
                                    <h3>Weekly Schedule</h3>
                                </div>
                            </div>
                            
                            <div className="schedule-grid">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                    const dayClasses = upcoming.filter(u => {
                                        const course = courses.find(c => c.id === u.courseId);
                                        return course?.days.includes(day.substring(0, 3));
                                    });
                                    
                                    return (
                                        <div className="schedule-day-card" key={day}>
                                            <h4>{day}</h4>
                                            {dayClasses.length === 0 ? (
                                                <p className="no-classes">No classes</p>
                                            ) : (
                                                dayClasses.map((cls, idx) => (
                                                    <div className="day-class" key={idx}>
                                                        <span className="class-time">{cls.time}</span>
                                                        <span className="class-name">{cls.name}</span>
                                                        <span className="class-room">Room {cls.room}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Profile View */}
                    {activeTab === 'Profile' && (
                        <div className="profile-view">
                            <div className="profile-card">
                                <div className="profile-header">
                                    <div className="profile-avatar-large">
                                        {studentData.profileImage ? (
                                            <img src={studentData.profileImage} alt="Profile" />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {studentData.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="profile-title">
                                        <h2>{studentData.name}</h2>
                                        <p>{studentData.email}</p>
                                        <p className="student-id">Student ID: {studentData.id}</p>
                                    </div>
                                    <button className="edit-profile-btn" onClick={() => setIsProfileModalOpen(true)}>
                                        <Edit size={16} /> Edit Profile
                                    </button>
                                </div>
                                
                                <div className="profile-details">
                                    <div className="detail-section">
                                        <h3>Academic Information</h3>
                                        <div className="detail-grid">
                                            <div className="detail-row">
                                                <span className="detail-label">Department:</span>
                                                <span className="detail-value">{studentData.department}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Academic Year:</span>
                                                <span className="detail-value">{studentData.academicYear}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Enrolled Courses:</span>
                                                <span className="detail-value">{courses.length}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Overall Attendance:</span>
                                                <span className="detail-value">{studentData.overallAttendance}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="detail-section">
                                        <h3>Contact Information</h3>
                                        <div className="detail-grid">
                                            <div className="detail-row">
                                                <span className="detail-label">Email:</span>
                                                <span className="detail-value">{studentData.email}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Phone:</span>
                                                <span className="detail-value">{editProfileData.phoneNumber || 'Not provided'}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Address:</span>
                                                <span className="detail-value">{editProfileData.address || 'Not provided'}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Emergency Contact:</span>
                                                <span className="detail-value">{editProfileData.emergencyContact || 'Not provided'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal small-modal">
                        <div className="modal-head">
                            <div className="flex-align">
                                <h2>Change Password</h2>
                                <Key size={24} className="text-primary ml-2" />
                            </div>
                        </div>
                        <form onSubmit={handlePasswordUpdate} className="modal-form vertical-form">
                            <input 
                                type="password" 
                                name="currentPassword" 
                                required 
                                className="input-field full-width" 
                                value={passwordFields.currentPassword} 
                                onChange={handlePasswordInputChange} 
                                placeholder="Current Password" 
                            />
                            <input 
                                type="password" 
                                name="newPassword" 
                                required 
                                className="input-field full-width" 
                                value={passwordFields.newPassword} 
                                onChange={handlePasswordInputChange} 
                                placeholder="New Password" 
                            />
                            <input 
                                type="password" 
                                name="confirmPassword" 
                                required 
                                className="input-field full-width" 
                                value={passwordFields.confirmPassword} 
                                onChange={handlePasswordInputChange} 
                                placeholder="Confirm Password" 
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-submit">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Course Modal */}
            {isViewCourseModalOpen && selectedCourse && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-head">
                            <h2>Course Details</h2>
                            <button className="close-btn" onClick={() => setIsViewCourseModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="course-detail-modal">
                            <div className="detail-header">
                                <span className="course-code-big">{selectedCourse.id}</span>
                                <h3>{selectedCourse.name}</h3>
                                <p className="instructor-name">{selectedCourse.instructor}</p>
                            </div>
                            
                            <div className="detail-info-grid">
                                <div className="info-item">
                                    <Calendar size={18} />
                                    <div>
                                        <label>Schedule</label>
                                        <span>{selectedCourse.schedule}</span>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <MapPin size={18} />
                                    <div>
                                        <label>Room</label>
                                        <span>{selectedCourse.room}</span>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <Users size={18} />
                                    <div>
                                        <label>Class Size</label>
                                        <span>{selectedCourse.students} students</span>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <TrendingUp size={18} />
                                    <div>
                                        <label>Your Attendance</label>
                                        <span>{selectedCourse.attendanceRate}%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="attendance-history">
                                <h4>Recent Attendance</h4>
                                <div className="history-list">
                                    {[1, 2, 3, 4].map(i => (
                                        <div className="history-item" key={i}>
                                            <span className="history-date">Week {i}</span>
                                            <span className="history-status present">Present</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="modal-actions">
                                <button 
                                    className="btn-submit full-width"
                                    onClick={() => {
                                        handleCheckIn(selectedCourse.id);
                                        setIsViewCourseModalOpen(false);
                                    }}
                                    disabled={selectedCourse.checkedIn}
                                >
                                    {selectedCourse.checkedIn ? 'Already Checked In' : 'Check In Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {isProfileModalOpen && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-head">
                            <h2>Edit Profile</h2>
                        </div>
                        <form className="modal-form">
                            <div className="form-grid">
                                <input 
                                    type="text" 
                                    name="phoneNumber"
                                    className="input-field full-width"
                                    value={editProfileData.phoneNumber}
                                    onChange={handleEditProfileChange}
                                    placeholder="Phone Number"
                                />
                                <input 
                                    type="text" 
                                    name="address"
                                    className="input-field full-width"
                                    value={editProfileData.address}
                                    onChange={handleEditProfileChange}
                                    placeholder="Address"
                                />
                                <input 
                                    type="text" 
                                    name="emergencyContact"
                                    className="input-field full-width"
                                    value={editProfileData.emergencyContact}
                                    onChange={handleEditProfileChange}
                                    placeholder="Emergency Contact"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
                                <button 
                                    type="button" 
                                    className="btn-submit"
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