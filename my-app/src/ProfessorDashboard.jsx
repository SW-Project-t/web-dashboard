import React, { useState, useEffect } from 'react';
import './ProfessorDashboard.css';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, BookOpen, Users, Calendar, Settings, 
    LogOut, Key, Plus, Edit, Trash2, Bell, Download,
    TrendingUp, Clock, CheckCircle, XCircle, AlertCircle,
    Menu, Search, ChevronRight, BarChart3, UserPlus,
    X  // تم إضافة X هنا
} from 'lucide-react';

import { auth, db } from './firebase'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const STORAGE_KEYS = {
    PROF_IMAGE: 'yallaclass_prof_image'
};

export default function ProfessorDashboard() {
    const navigate = useNavigate();
    
    const [profileImage, setProfileImage] = useState(localStorage.getItem(STORAGE_KEYS.PROF_IMAGE) || null);
    const [profData, setProfData] = useState({ name: 'Loading...', code: '...' });
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [searchQuery, setSearchQuery] = useState('');

    // حالات النوافذ المنبثقة
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordFields, setPasswordFields] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fetchUserData = async (user) => {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            const token = localStorage.getItem('token');
            
            if(!token) {
                navigate('/');
                return;
            }

            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfData({
                    name: data.fullName || "Dr. Anonymous",
                    code: data.code || "No Code"
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            showNotification('Error fetching profile data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchUserData(user);
            } else {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        showNotification('Logging out...', 'success');
        setTimeout(() => {
            navigate('/');
        }, 1000);
    };

    // دوال تغيير كلمة المرور
    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordFields(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        
        if (passwordFields.newPassword !== passwordFields.confirmPassword) {
            showNotification("New passwords do not match!", 'error');
            return;
        }

        if (passwordFields.newPassword.length < 6) {
            showNotification("Password must be at least 6 characters!", 'error');
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, passwordFields.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordFields.newPassword);
            
            showNotification("Password updated successfully!", 'success');
            setIsPasswordModalOpen(false);
            setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                showNotification("Current password is incorrect!", 'error');
            } else {
                showNotification("Error updating password. Please try again.", 'error');
            }
        }
    };
   
    const [courses, setCourses] = useState([
        {
            id: 'CS401',
            name: 'Data Structures',
            schedule: 'Mon, Wed 10:00 AM',
            room: 'Room 201',
            students: 45,
            avgAttendance: 95,
            todayPresent: 40,
            todayLate: 3,
            todayAbsent: 2
        },
        {
            id: 'CS301',
            name: 'Operating Systems',
            schedule: 'Tue, Thu 2:00 PM',
            room: 'Room 305',
            students: 38,
            avgAttendance: 88,
            todayPresent: 32,
            todayLate: 4,
            todayAbsent: 2
        },
        {
            id: 'CS501',
            name: 'Machine Learning',
            schedule: 'Wed, Fri 11:00 AM',
            room: 'Room 102',
            students: 32,
            avgAttendance: 92,
            todayPresent: 28,
            todayLate: 2,
            todayAbsent: 2
        }
    ]);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [newCourse, setNewCourse] = useState({
        id: '', name: '', schedule: '', room: '', students: ''
    });

    const showNotification = (message, type = 'success') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
                localStorage.setItem(STORAGE_KEYS.PROF_IMAGE, reader.result);
                showNotification('Profile image updated successfully!');
            };
            reader.readAsDataURL(file);
        }
    };

    const removeProfileImage = () => {
        setProfileImage(null);
        localStorage.removeItem(STORAGE_KEYS.PROF_IMAGE);
        showNotification('Profile image removed');
    };

    const resetDailyAttendance = (courseId) => {
        setCourses(courses.map(c => 
            c.id === courseId ? { ...c, todayPresent: 0, todayLate: 0, todayAbsent: 0 } : c
        ));
        showNotification(`Attendance reset for ${courseId}`);
    };

    const resetAllAttendance = () => {
        if(window.confirm('Reset today\'s attendance for ALL courses?')) {
            setCourses(courses.map(c => ({ ...c, todayPresent: 0, todayLate: 0, todayAbsent: 0 })));
            showNotification('All courses reset for the day');
        }
    };

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openAddModal = () => {
        setModalType('add');
        setNewCourse({ id: '', name: '', schedule: '', room: '', students: '' });
        setShowModal(true);
    };

    const openEditModal = (course) => {
        setModalType('edit');
        setSelectedCourse(course);
        setNewCourse(course);
        setShowModal(true);
    };

    const openAttendanceModal = (course) => {
        setModalType('attendance');
        setSelectedCourse(course);
        setShowModal(true);
    };

    const deleteCourse = (id) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            setCourses(courses.filter(c => c.id !== id));
            showNotification(`Course ${id} deleted successfully`);
        }
    };

    const saveCourse = () => {
        if (!newCourse.id || !newCourse.name) {
            showNotification('Please fill all required fields', 'error');
            return;
        }

        if (modalType === 'add') {
            setCourses([...courses, {
                ...newCourse,
                students: Number(newCourse.students) || 0,
                avgAttendance: 0,
                todayPresent: 0,
                todayLate: 0,
                todayAbsent: 0
            }]);
            showNotification(`Course ${newCourse.id} added successfully`);
        } else {
            setCourses(courses.map(c => 
                c.id === selectedCourse.id ? { ...c, ...newCourse } : c
            ));
            showNotification(`Course ${newCourse.id} updated successfully`);
        }

        setShowModal(false);
    };

    const updateAttendance = (courseId, type) => {
        setCourses(courses.map(c => {
            if (c.id === courseId) {
                if (type === 'present') return { ...c, todayPresent: c.todayPresent + 1 };
                if (type === 'late') return { ...c, todayLate: c.todayLate + 1 };
                if (type === 'absent') return { ...c, todayAbsent: c.todayAbsent + 1 };
            }
            return c;
        }));
        showNotification(`Attendance updated for ${courseId}`);
    };

    const exportData = () => {
        const dataStr = JSON.stringify(courses, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `courses_${new Date().toISOString().slice(0,10)}.json`);
        link.click();
        showNotification('Data exported successfully');
    };

    const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
    const avgAttendance = Math.round(courses.reduce((sum, c) => sum + c.avgAttendance, 0) / (courses.length || 1));
    const totalPresent = courses.reduce((sum, c) => sum + c.todayPresent, 0);

    const weeklyData = [
        { day: 'Mon', value: 92 },
        { day: 'Tue', value: 88 },
        { day: 'Wed', value: 95 },
        { day: 'Thu', value: 89 },
        { day: 'Fri', value: 93 }
    ];

    return (
        <div className="professor-layout">
            {/* نظام الإشعارات العلوي - من Admin */}
            <div className="notifications-container">
                {notifications.map(n => (
                    <div key={n.id} className={`notification ${n.type}`}>
                        {n.message}
                    </div>
                ))}
            </div>

            {/* الشريط الجانبي - مأخوذ من Admin مع تعديل */}
            <aside className={`professor-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-profile-section">
                    <div className="profile-img-container" onClick={() => document.getElementById('prof-profile-upload').click()}>
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" className="profile-img" />
                        ) : (
                            <div className="profile-placeholder">
                                {profData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                        )}
                        <div className="profile-status"></div>
                    </div>
                    <input 
                        type="file" 
                        id="prof-profile-upload" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />
                    <h3 className="profile-name">{profData.name}</h3>
                    <p className="profile-id">ID: {profData.code}</p>
                    {profileImage && (
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
                        className={`nav-item ${activeTab === 'Students' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Students')}
                    >
                        <Users size={20} />
                        <span>Students</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'Schedule' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Schedule')}
                    >
                        <Calendar size={20} />
                        <span>Schedule</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'Analytics' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Analytics')}
                    >
                        <BarChart3 size={20} />
                        <span>Analytics</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Settings')}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
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

            {/* المحتوى الرئيسي - مأخوذ من Admin مع تعديل */}
            <main className="professor-main">
                <header className="main-header">
                    <div className="header-title">
                        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>{activeTab}</h1>
                            <p>Welcome to your teaching dashboard</p>
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
                        <button className="bell-btn" onClick={() => showNotification('No new notifications', 'info')}>
                            <Bell size={20} />
                            <span className="bell-badge"></span>
                        </button>
                        <button className="export-btn" onClick={exportData} title="Export Data">
                            <Download size={20} />
                        </button>
                    </div>
                </header>

                <div className="content-scroll">
                    {activeTab === 'Dashboard' && (
                        <div className="dashboard-view">
                            {/* بطاقات الإجراءات السريعة - من Admin */}
                            <div className="quick-actions-row">
                                <div className="action-card blue" onClick={openAddModal}>
                                    <BookOpen size={28} />
                                    <span>New Course</span>
                                </div>
                                <div className="action-card green" onClick={() => {
                                    setActiveTab('Students');
                                    showNotification('Navigating to Students page', 'info');
                                }}>
                                    <UserPlus size={28} />
                                    <span>Add Students</span>
                                </div>
                                <div className="action-card yellow" onClick={exportData}>
                                    <Download size={28} />
                                    <span>Export Data</span>
                                </div>
                                <div className="action-card red" onClick={resetAllAttendance}>
                                    <Clock size={28} />
                                    <span>Reset Today</span>
                                </div>
                            </div>

                            {/* بطاقات الإحصائيات - محسنة */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <BookOpen className="stat-icon blue" />
                                    <div className="stat-info">
                                        <span className="stat-label">Total Courses</span>
                                        <span className="stat-value">{courses.length}</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <Users className="stat-icon green" />
                                    <div className="stat-info">
                                        <span className="stat-label">Total Students</span>
                                        <span className="stat-value">{totalStudents}</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <TrendingUp className="stat-icon purple" />
                                    <div className="stat-info">
                                        <span className="stat-label">Avg Attendance</span>
                                        <span className="stat-value">{avgAttendance}%</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <CheckCircle className="stat-icon orange" />
                                    <div className="stat-info">
                                        <span className="stat-label">Today's Present</span>
                                        <span className="stat-value">{totalPresent}</span>
                                    </div>
                                </div>
                            </div>

                            {/* قسم الكورسات - محسن */}
                            <div className="courses-section">
                                <div className="section-header">
                                    <h2>My Courses</h2>
                                    <button className="view-all-btn" onClick={() => setActiveTab('My Courses')}>
                                        View All <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="courses-grid">
                                    {filteredCourses.slice(0, 3).map(course => (
                                        <div key={course.id} className="course-card-modern">
                                            <div className="course-header">
                                                <span className="course-code">{course.id}</span>
                                                <div className="course-actions">
                                                    <button className="icon-btn" onClick={() => openEditModal(course)} title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => deleteCourse(course.id)} title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="course-name">{course.name}</h3>
                                            <div className="course-details">
                                                <p><Clock size={14} /> {course.schedule}</p>
                                                <p><Calendar size={14} /> {course.room}</p>
                                            </div>
                                            <div className="attendance-summary">
                                                <div className="attendance-item present">
                                                    <CheckCircle size={14} />
                                                    <span>{course.todayPresent} Present</span>
                                                </div>
                                                <div className="attendance-item late">
                                                    <AlertCircle size={14} />
                                                    <span>{course.todayLate} Late</span>
                                                </div>
                                                <div className="attendance-item absent">
                                                    <XCircle size={14} />
                                                    <span>{course.todayAbsent} Absent</span>
                                                </div>
                                            </div>
                                            <button className="start-attendance-btn" onClick={() => openAttendanceModal(course)}>
                                                Start Attendance
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* بطاقة الرسم البياني للأسبوع */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Weekly Attendance Overview</h3>
                                    <span className="chart-badge">Last 5 days</span>
                                </div>
                                <div className="chart-bars">
                                    {weeklyData.map((item, i) => (
                                        <div key={i} className="bar-item">
                                            <div 
                                                className="bar" 
                                                style={{ height: `${item.value * 2}px` }}
                                            ></div>
                                            <span className="bar-day">{item.day}</span>
                                            <span className="bar-value">{item.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* صفحة My Courses - محسنة */}
                    {activeTab === 'My Courses' && (
                        <div className="courses-full-view">
                            <div className="page-header">
                                <h2>All Courses ({filteredCourses.length})</h2>
                                <button className="primary-btn" onClick={openAddModal}>
                                    <Plus size={18} /> Add Course
                                </button>
                            </div>
                            <div className="courses-table-container">
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Course Name</th>
                                            <th>Schedule</th>
                                            <th>Room</th>
                                            <th>Students</th>
                                            <th>Attendance</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCourses.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No courses found</td>
                                            </tr>
                                        ) : (
                                            filteredCourses.map(course => (
                                                <tr key={course.id}>
                                                    <td className="code-cell">{course.id}</td>
                                                    <td className="name-cell">{course.name}</td>
                                                    <td>{course.schedule}</td>
                                                    <td>{course.room}</td>
                                                    <td>{course.students}</td>
                                                    <td>
                                                        <span className="attendance-badge">
                                                            {course.avgAttendance}%
                                                        </span>
                                                    </td>
                                                    <td className="actions-cell">
                                                        <button className="icon-btn primary" onClick={() => openAttendanceModal(course)} title="Start Attendance">
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button className="icon-btn" onClick={() => openEditModal(course)} title="Edit">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button className="icon-btn" onClick={() => resetDailyAttendance(course.id)} title="Reset Today">
                                                            <Clock size={18} />
                                                        </button>
                                                        <button className="icon-btn delete" onClick={() => deleteCourse(course.id)} title="Delete">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* صفحات أخرى تحت التطوير */}
                    {(activeTab === 'Students' || activeTab === 'Schedule' || activeTab === 'Analytics' || activeTab === 'Settings') && (
                        <div className="under-development">
                            <Settings size={60} className="spin-icon" />
                            <h2>This page is currently under development</h2>
                            <p>Check back soon for updates!</p>
                        </div>
                    )}
                </div>
            </main>

            {/* مودال تغيير كلمة المرور - محسن */}
            {isPasswordModalOpen && (
                <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
                    <div className="modern-modal small" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Change Password</h2>
                            <button className="close-btn" onClick={() => setIsPasswordModalOpen(false)}>
                                <X size={20} />  {/* الآن X معرف بشكل صحيح */}
                            </button>
                        </div>
                        
                        <form onSubmit={handlePasswordUpdate} className="modal-form vertical">
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwordFields.currentPassword}
                                    onChange={handlePasswordInputChange}
                                    placeholder="Enter current password"
                                    required
                                    className="modern-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordFields.newPassword}
                                    onChange={handlePasswordInputChange}
                                    placeholder="Enter new password"
                                    required
                                    minLength="6"
                                    className="modern-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordFields.confirmPassword}
                                    onChange={handlePasswordInputChange}
                                    placeholder="Confirm new password"
                                    required
                                    className="modern-input"
                                />
                            </div>

                            <div className="password-requirements">
                                <p>Password must be at least 6 characters long</p>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsPasswordModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="update-btn">
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* مودال إضافة/تعديل الكورس - محسن */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modern-modal" onClick={e => e.stopPropagation()}>
                        {modalType === 'attendance' ? (
                            <>
                                <div className="modal-header">
                                    <h3>Start Attendance Session</h3>
                                    <button className="close-btn" onClick={() => setShowModal(false)}>
                                        <X size={20} />  {/* الآن X معرف بشكل صحيح */}
                                    </button>
                                </div>
                                <p className="modal-subtitle">Course: {selectedCourse?.name}</p>
                                
                                <div className="attendance-code-display">2478</div>
                                <p className="modal-instruction">Share this 4-digit code with your students</p>

                                <div className="modal-actions centered">
                                    <button className="primary-btn large" onClick={() => {
                                        showNotification('Attendance session started successfully!');
                                        setShowModal(false);
                                    }}>
                                        Start Session
                                    </button>
                                    <button className="secondary-btn" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="modal-header">
                                    <h3>{modalType === 'add' ? 'Add New Course' : 'Edit Course'}</h3>
                                    <button className="close-btn" onClick={() => setShowModal(false)}>
                                        <X size={20} />  {/* الآن X معرف بشكل صحيح */}
                                    </button>
                                </div>
                                
                                <div className="modal-form grid">
                                    <div className="form-group full-width">
                                        <label>Course ID</label>
                                        <input
                                            className="modern-input"
                                            placeholder="e.g., CS401"
                                            value={newCourse.id}
                                            onChange={(e) => setNewCourse({...newCourse, id: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className="form-group full-width">
                                        <label>Course Name</label>
                                        <input
                                            className="modern-input"
                                            placeholder="e.g., Data Structures"
                                            value={newCourse.name}
                                            onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Schedule</label>
                                        <input
                                            className="modern-input"
                                            placeholder="Mon, Wed 10:00 AM"
                                            value={newCourse.schedule}
                                            onChange={(e) => setNewCourse({...newCourse, schedule: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Room</label>
                                        <input
                                            className="modern-input"
                                            placeholder="Room 201"
                                            value={newCourse.room}
                                            onChange={(e) => setNewCourse({...newCourse, room: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className="form-group full-width">
                                        <label>Number of Students</label>
                                        <input
                                            className="modern-input"
                                            type="number"
                                            placeholder="45"
                                            value={newCourse.students}
                                            onChange={(e) => setNewCourse({...newCourse, students: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button className="secondary-btn" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button className="primary-btn" onClick={saveCourse}>
                                        {modalType === 'add' ? 'Create Course' : 'Save Changes'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}