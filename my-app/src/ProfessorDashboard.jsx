import React, { useState, useEffect } from 'react';
import './ProfessorDashboard.css';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, BookOpen, Users, Calendar, Settings, 
    LogOut, Key, Plus, Edit, Trash2, Bell, Download,
    TrendingUp, Clock, CheckCircle, XCircle, AlertCircle,
    Menu, Search, ChevronRight, BarChart3, UserPlus,
    X
} from 'lucide-react';

import { auth, db } from './firebase'; 
import { doc, getDoc, updateDoc,getDocs,collection,setDoc,addDoc,where,query,deleteDoc} from 'firebase/firestore';
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

    // abdo
    const [adminCourses, setAdminCourses] = useState([]);
    useEffect(() => {
        const fetchAdminCourses = async () => {
            const querySnapshot = await getDocs(collection(db, "courses"));
            const coursesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAdminCourses(coursesList);
        };
        fetchAdminCourses();
    }, []);


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

    // Password functions
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
   
    const [courses, setCourses] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [newCourse, setNewCourse] = useState({
        id: '', name: '', schedule: '', room: '', students: '',capacity:''
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
        course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.id?.toLowerCase().includes(searchQuery.toLowerCase())
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
//abdo
    const deleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
        const user = auth.currentUser;
        if (!user) return;
        setCourses(courses.filter(c => c.id !== id));
        try {
            const q = query(
                collection(db, "professorCourses"), 
                where("professorId", "==", user.uid),
                where("courseId", "==", id)
            );
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach(async (document) => {
                await deleteDoc(doc(db, "professorCourses", document.id));
            });
            
            showNotification(`Course ${id} deleted successfully`);
        } catch (firestoreError) {
            console.error("Firestore delete error:", firestoreError);
            showNotification('Course deleted locally but failed to delete from database', 'warning');
        }
    } catch (error) {
        console.error("Error deleting course:", error);
        showNotification('Error deleting course', 'error');
    }
};
 
const handleSelectCourseFromAdmin = (courseId) => {
        const selected = adminCourses.find(c => c.courseId === courseId);
        if (selected) {
            setNewCourse({
                id: selected.courseId,
                name: selected.courseName,
                schedule: `${selected.SelectDays} | ${selected.Time}`,
                room: selected.RoomNumber,
                //
                students: selected.totalStudents,
                instructor: selected.instructorName,
                capacity: selected.capacity
            });
            showNotification(`Course ${selected.courseName} selected`, 'success');
        }
    };

    // abdo
   const saveCourse = async () => {
    if (!newCourse.id || !newCourse.name) {
        showNotification('Please select a valid course', 'error');
        return;
    }
    const courseExists = courses.some(c => c.id === newCourse.id);
    if (courseExists) {
        showNotification('This course is already in your list', 'error');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            showNotification('You must be logged in', 'error');
            return;
        }
        const courseToAdd = {
            courseId: newCourse.id,
            courseName: newCourse.name,
            schedule: newCourse.schedule,
            room: newCourse.room,
            capacity:parseInt(newCourse.capacity)||0,
            students: parseInt(newCourse.students) || 0,
            avgAttendance: 0,
            todayPresent: 0,
            todayLate: 0,
            todayAbsent: 0,
            professorId: user.uid,
            professorName: profData.name,
            professorCode: profData.code,
            assignedAt: new Date().toISOString()
        };

        setCourses(prev => [...prev, courseToAdd]);
        try {
            await addDoc(collection(db, "professorCourses"), {
                ...courseToAdd,
                userId: user.uid
            });    
            showNotification(`Course ${newCourse.id} added successfully`);
        } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            showNotification('Course added locally but failed to save to database', 'warning');
        }

        setShowModal(false);
        setNewCourse({ id: '', name: '', schedule: '', room: '', students: '' });

    } catch (error) {
        console.error("Error saving course:", error);
        showNotification('Error saving course. Please try again.', 'error');
    }
};
//abdo
// Fetch professor's assigned courses
useEffect(() => {
    const fetchProfessorCourses = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const q = query(collection(db, "professorCourses"), where("professorId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const professorCoursesList = querySnapshot.docs.map(doc => ({
                    id: doc.data().courseId,
                    name: doc.data().courseName,
                    schedule: doc.data().schedule,
                    room: doc.data().room,
                    capacity:doc.data.capacity,
                    students: doc.data().students || 0,
                    avgAttendance: doc.data().avgAttendance || 0,
                    todayPresent: doc.data().todayPresent || 0,
                    todayLate: doc.data().todayLate || 0,
                    todayAbsent: doc.data().todayAbsent || 0
                }));
                
                setCourses(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newCourses = professorCoursesList.filter(c => !existingIds.has(c.id));
                    return [...prev, ...newCourses];
                });
            }
        } catch (error) {
            console.error("Error fetching professor courses:", error);
        }
    };

    fetchProfessorCourses();
}, [auth.currentUser]);


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
        <div className="professor-dashboard-container">
            {/* Notifications System */}
            <div className="professor-notifications-container">
                {notifications.map(n => (
                    <div key={n.id} className={`professor-notification-item ${n.type}`}>
                        {n.message}
                    </div>
                ))}
            </div>

            {/* Sidebar */}
            <aside className={`professor-sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
                <div className="professor-profile-section">
                    <div className="professor-profile-image-wrapper" onClick={() => document.getElementById('prof-profile-upload').click()}>
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" className="professor-profile-image" />
                        ) : (
                            <div className="professor-profile-placeholder">
                                {profData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                        )}
                        <div className="professor-profile-status"></div>
                    </div>
                    <input 
                        type="file" 
                        id="prof-profile-upload" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />
                    <h3 className="professor-profile-name">{profData.name}</h3>
                    <p className="professor-profile-id">ID: {profData.code}</p>
                    {profileImage && (
                        <button className="professor-remove-photo-button" onClick={removeProfileImage}>
                            Remove Photo
                        </button>
                    )}
                </div>

                <nav className="professor-navigation-menu">
                    <button 
                        className={`professor-nav-button ${activeTab === 'Dashboard' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Dashboard')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button 
                        className={`professor-nav-button ${activeTab === 'My Courses' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('My Courses')}
                    >
                        <BookOpen size={20} />
                        <span>My Courses</span>
                    </button>
                    <button 
                        className={`professor-nav-button ${activeTab === 'Students' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Students')}
                    >
                        <Users size={20} />
                        <span>Students</span>
                    </button>
                    <button 
                        className={`professor-nav-button ${activeTab === 'Schedule' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Schedule')}
                    >
                        <Calendar size={20} />
                        <span>Schedule</span>
                    </button>
                    <button 
                        className={`professor-nav-button ${activeTab === 'Analytics' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Analytics')}
                    >
                        <BarChart3 size={20} />
                        <span>Analytics</span>
                    </button>
                    <button 
                        className={`professor-nav-button ${activeTab === 'Settings' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Settings')}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className="professor-sidebar-footer">
                    <button className="professor-nav-button professor-password-button" onClick={() => setIsPasswordModalOpen(true)}>
                        <Key size={18} />
                        <span>Change Password</span>
                    </button>
                    <button className="professor-nav-button professor-logout-button" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="professor-main-content">
                <header className="professor-content-header">
                    <div className="professor-page-title">
                        <button className="professor-mobile-menu-trigger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>{activeTab}</h1>
                            <p>Welcome to your teaching dashboard</p>
                        </div>
                    </div>
                    <div className="professor-header-controls">
                        <div className="professor-search-container">
                            <Search size={18} className="professor-search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search courses..." 
                                className="professor-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="professor-notification-button" onClick={() => showNotification('No new notifications', 'info')}>
                            <Bell size={20} />
                            <span className="professor-notification-badge"></span>
                        </button>
                        <button className="professor-export-button" onClick={exportData} title="Export Data">
                            <Download size={20} />
                        </button>
                    </div>
                </header>

                <div className="professor-scrollable-content">
                    {activeTab === 'Dashboard' && (
                        <div className="professor-dashboard-view">
                            {/* Quick Actions */}
                            <div className="professor-quick-actions-grid">
                                <div className="professor-action-card-item professor-card-blue" onClick={openAddModal}>
                                    <BookOpen size={28} />
                                    <span>New Course</span>
                                </div>
                                <div className="professor-action-card-item professor-card-green" onClick={() => {
                                    setActiveTab('Students');
                                    showNotification('Navigating to Students page', 'info');
                                }}>
                                    <UserPlus size={28} />
                                    <span>Add Students</span>
                                </div>
                                <div className="professor-action-card-item professor-card-yellow" onClick={exportData}>
                                    <Download size={28} />
                                    <span>Export Data</span>
                                </div>
                                <div className="professor-action-card-item professor-card-red" onClick={resetAllAttendance}>
                                    <Clock size={28} />
                                    <span>Reset Today</span>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="professor-stats-grid">
                                <div className="professor-stat-card">
                                    <BookOpen className="professor-stat-icon blue" />
                                    <div className="professor-stat-info">
                                        <span className="professor-stat-label">Total Courses</span>
                                        <span className="professor-stat-value">{courses.length}</span>
                                    </div>
                                </div>
                                <div className="professor-stat-card">
                                    <Users className="professor-stat-icon green" />
                                    <div className="professor-stat-info">
                                        <span className="professor-stat-label">Total Students</span>
                                        <span className="professor-stat-value">{totalStudents}</span>
                                    </div>
                                </div>
                                <div className="professor-stat-card">
                                    <TrendingUp className="professor-stat-icon purple" />
                                    <div className="professor-stat-info">
                                        <span className="professor-stat-label">Avg Attendance</span>
                                        <span className="professor-stat-value">{avgAttendance}%</span>
                                    </div>
                                </div>
                                <div className="professor-stat-card">
                                    <CheckCircle className="professor-stat-icon orange" />
                                    <div className="professor-stat-info">
                                        <span className="professor-stat-label">Today's Present</span>
                                        <span className="professor-stat-value">{totalPresent}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Courses Section */}
                            <div className="professor-courses-section">
                                <div className="professor-section-header">
                                    <h2>My Courses</h2>
                                    <button className="professor-view-all-button" onClick={() => setActiveTab('My Courses')}>
                                        View All <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="professor-courses-grid">
                                    {filteredCourses.slice(0, 3).map(course => (
                                        <div key={course.id} className="professor-course-card">
                                            <div className="professor-course-header">
                                                <span className="professor-course-code">{course.id}</span>
                                                <div className="professor-course-actions">
                                                    <button className="professor-icon-button" onClick={() => openEditModal(course)} title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="professor-icon-button delete" onClick={() => deleteCourse(course.id)} title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="professor-course-name">{course.name}</h3>
                                            <div className="professor-course-details">
                                                <p><Clock size={14} /> {course.schedule}</p>
                                                <p><Calendar size={14} /> {course.room}</p>
                                            </div>
                                            <div className="professor-attendance-summary">
                                                <div className="professor-attendance-item present">
                                                    <CheckCircle size={14} />
                                                    <span>{course.todayPresent} Present</span>
                                                </div>
                                                <div className="professor-attendance-item late">
                                                    <AlertCircle size={14} />
                                                    <span>{course.todayLate} Late</span>
                                                </div>
                                                <div className="professor-attendance-item absent">
                                                    <XCircle size={14} />
                                                    <span>{course.todayAbsent} Absent</span>
                                                </div>
                                            </div>
                                            <button className="professor-start-attendance-button" onClick={() => openAttendanceModal(course)}>
                                                Start Attendance
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chart Card */}
                            <div className="professor-chart-card">
                                <div className="professor-chart-header">
                                    <h3>Weekly Attendance Overview</h3>
                                    <span className="professor-chart-badge">Last 5 days</span>
                                </div>
                                <div className="professor-chart-bars">
                                    {weeklyData.map((item, i) => (
                                        <div key={i} className="professor-bar-item">
                                            <div 
                                                className="professor-bar" 
                                                style={{ height: `${item.value * 2}px` }}
                                            ></div>
                                            <span className="professor-bar-day">{item.day}</span>
                                            <span className="professor-bar-value">{item.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* My Courses Page */}
                    {activeTab === 'My Courses' && (
                        <div className="professor-courses-full-view">
                            <div className="professor-page-header">
                                <h2>All Courses ({filteredCourses.length})</h2>
                                <button className="professor-primary-button" onClick={openAddModal}>
                                    <Plus size={18} /> Add Course
                                </button>
                            </div>
                            <div className="professor-table-responsive">
                                <table className="professor-modern-table">
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
                                                <td colSpan="7" className="professor-no-data">No courses found</td>
                                            </tr>
                                        ) : (
                                            filteredCourses.map(course => (
                                                <tr key={course.id}>
                                                    <td className="professor-code-cell">{course.id}</td>
                                                    <td className="professor-name-cell">{course.name}</td>
                                                    <td>{course.schedule}</td>
                                                    <td>{course.room}</td>
                                                    <td>{course.students}</td>
                                                    <td>
                                                        <span className="professor-attendance-badge">
                                                            {course.avgAttendance}%
                                                        </span>
                                                    </td>
                                                    <td className="professor-actions-cell">
                                                        <button className="professor-icon-button" onClick={() => openAttendanceModal(course)} title="Start Attendance">
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button className="professor-icon-button" onClick={() => openEditModal(course)} title="Edit">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button className="professor-icon-button" onClick={() => resetDailyAttendance(course.id)} title="Reset Today">
                                                            <Clock size={18} />
                                                        </button>
                                                        <button className="professor-icon-button delete" onClick={() => deleteCourse(course.id)} title="Delete">
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

                    {/* Under Development Pages */}
                    {(activeTab === 'Students' || activeTab === 'Schedule' || activeTab === 'Analytics' || activeTab === 'Settings') && (
                        <div className="professor-under-development">
                            <Settings size={60} />
                            <h2>This page is currently under development</h2>
                            <p>Check back soon for updates!</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="professor-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
                    <div className="professor-modal-container small" onClick={e => e.stopPropagation()}>
                        <div className="professor-modal-header">
                            <h2>Change Password</h2>
                            <button className="professor-close-modal-button" onClick={() => setIsPasswordModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handlePasswordUpdate} className="professor-modal-form">
                            <div className="professor-form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwordFields.currentPassword}
                                    onChange={handlePasswordInputChange}
                                    placeholder="Enter current password"
                                    required
                                    className="professor-form-input"
                                />
                            </div>

                            <div className="professor-form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordFields.newPassword}
                                    onChange={handlePasswordInputChange}
                                    placeholder="Enter new password"
                                    required
                                    minLength="6"
                                    className="professor-form-input"
                                />
                            </div>

                            <div className="professor-form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordFields.confirmPassword}
                                    onChange={handlePasswordInputChange}
                                    placeholder="Confirm new password"
                                    required
                                    className="professor-form-input"
                                />
                            </div>

                            <div className="professor-password-requirements">
                                <p>Password must be at least 6 characters long</p>
                            </div>

                            <div className="professor-modal-actions">
                                <button type="button" className="professor-cancel-button" onClick={() => setIsPasswordModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="professor-update-button">
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Course Modal */}
            {showModal && (
                <div className="professor-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="professor-modal-container" onClick={e => e.stopPropagation()}>
                        {modalType === 'attendance' ? (
                            <>
                                <div className="professor-modal-header">
                                    <h3>Start Attendance Session</h3>
                                    <button className="professor-close-modal-button" onClick={() => setShowModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="professor-modal-subtitle">Course: {selectedCourse?.name}</p>
                                
                                <div className="professor-attendance-code">2478</div>
                                <p className="professor-modal-instruction">Share this 4-digit code with your students</p>

                                <div className="professor-modal-actions centered">
                                    <button className="professor-primary-button large" onClick={() => {
                                        showNotification('Attendance session started successfully!');
                                        setShowModal(false);
                                    }}>
                                        Start Session
                                    </button>
                                    <button className="professor-secondary-button" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="professor-modal-header">
                                    <h3>{modalType === 'add' ? 'Add New Course' : 'Edit Course'}</h3>
                                    <button className="professor-close-modal-button" onClick={() => setShowModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
    
                                <div className="professor-modal-form professor-form-grid">
                                    {modalType === 'add' && (
                                        <div className="professor-form-group full-width">
                                            <label style={{ color: '#4a90e2', fontWeight: 'bold' }}>Select Course You Want To Teach</label>
                                            <select 
                                                className="professor-form-input"
                                                value={newCourse.id}
                                                onChange={(e) => handleSelectCourseFromAdmin(e.target.value)} 
                                                style={{ border: '2px solid #4a90e2', cursor: 'pointer' }}
                                            >
                                                <option value="">-- Choose a Course --</option>
                                                {adminCourses.map(course => (
                                                    <option key={course.id} value={course.courseId}>
                                                        {course.courseId} - {course.courseName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="professor-form-group">
                                        <label>Course ID</label>
                                        <input
                                            className="professor-form-input"
                                            value={newCourse.id}
                                            readOnly={modalType === 'add'} 
                                            placeholder="Select from list..."
                                        />
                                    </div>

                                    <div className="professor-form-group">
                                        <label>Course Name</label>
                                        <input
                                            className="professor-form-input"
                                            value={newCourse.name}
                                            readOnly={modalType === 'add'}
                                            placeholder="Course name"
                                        />
                                    </div>

                                    <div className="professor-form-group">
                                        <label>Schedule</label>
                                        <input
                                            className="professor-form-input"
                                            value={newCourse.schedule}
                                            readOnly={modalType === 'add'}
                                            placeholder="Days | Time"
                                        />
                                    </div>

                                    <div className="professor-form-group">
                                        <label>Room</label>
                                        <input
                                            className="professor-form-input"
                                            value={newCourse.room}
                                            readOnly={modalType === 'add'}
                                            placeholder="Room number"
                                        />
                                    </div>

                                    <div className="professor-form-group full-width">
                                        <label>Capacity</label>
                                        <input
                                            className="professor-form-input"
                                            type="number"
                                            value={newCourse.capacity}
                                            readOnly={modalType === 'add'}
                                            onChange={(e) => setNewCourse({...newCourse, capacity: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="professor-modal-actions centered">
                                    <button className="professor-cancel-button" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button 
                                        className="professor-update-button" 
                                        onClick={saveCourse}
                                        disabled={modalType === 'add' && !newCourse.id}
                                    >
                                        {modalType === 'add' ? 'Confirm Addition' : 'Save Changes'}
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