import React, { useState, useEffect } from 'react';
import './StudentDashboard.css';
import { useNavigate } from 'react-router-dom';

import { auth, db } from './firebase';
import { 
    doc, getDoc, collection, getDocs, query, where, 
    runTransaction, increment, serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

// Icons as SVG components
const Icons = {
  Dashboard: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>),
  BookOpen: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>),
  IdCard: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4"/><path d="M14 14h4"/></svg>),
  Calendar: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>),
  Settings: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>),
  Lock: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  LogOut: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>),
  MapPin: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>),
  Check: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  X: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>),
  Plus: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>),
  Trash2: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>),
  Clock: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Users: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  Map: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>),
  TrendingUp: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>),
  GraduationCap: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>),
  Camera: () => ( <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>),
};

const IconComponent = ({ name, className = '' }) => {
  const Icon = Icons[name];
  return Icon ? <span className={className}><Icon /></span> : null;
};

const STORAGE_KEYS = {
    USER: 'yallaclass_user',
    COURSES: 'yallaclass_courses',
    UPCOMING: 'yallaclass_upcoming',
    ATTENDANCE: 'yallaclass_attendance',
    TREND: 'yallaclass_trend'
};

const defaultData = {
    user: {
        name: "loading...",
        id: "...",
        overallAttendance: 92,
        enrolledCourses: 3,
        activeSession: 1,
        gpsActive: true,
        profileImage: null,
        department: "...", // جديد
        email: "..." // جديد
    },
    courses: [],
    upcoming: [],
    attendance: [],
    trend: []
};

const loadData = () => {
    return {
        user: JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || defaultData.user,
        courses: JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES)) || [],
        upcoming: JSON.parse(localStorage.getItem(STORAGE_KEYS.UPCOMING)) || [],
        attendance: JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || [],
        trend: JSON.parse(localStorage.getItem(STORAGE_KEYS.TREND)) || []
    };
};

export default function StudentDashboard() {
    const [appState, setAppState] = useState(loadData());
    const [selectedCourse, setSelectedCourse] = useState(appState.courses[0]?.id || null);
    const [modal, setModal] = useState({ show: false, type: null });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [availableCourses, setAvailableCourses] = useState([]);
    const [isEnrolling, setIsEnrolling] = useState(false);

    const navigate = useNavigate();
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                  
                    if(!token){navigate('/');}
                    else if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        setAppState(prev => ({
                            ...prev,
                            user: {
                                ...prev.user,
                                name: userData.fullName || "No Name",
                                id: userData.code || "No Code",
                                department: userData.department || "N/A", // جلب القسم
                                email: user.email || "No Email" // جلب الإيميل
                            }
                        }));
                    }
                } catch (error) {
                    console.error("Error fetching student data:", error);
                }
            } else {navigate('/');}
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'courses'));
                const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailableCourses(coursesData);
            } catch (error) {
                console.error("Error fetching available courses:", error);
            }
        };
        fetchCourses();
    }, []);
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        setTimeout(() => {
            navigate('/');
        }, 1000);
    };

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(appState.user));
        localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(appState.courses));
        localStorage.setItem(STORAGE_KEYS.UPCOMING, JSON.stringify(appState.upcoming));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(appState.attendance));
        localStorage.setItem(STORAGE_KEYS.TREND, JSON.stringify(appState.trend));
    }, [appState]);

    const showNotification = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const oldPass = formData.get('oldPassword');
        const newPass = formData.get('newPassword');
        const confirmPass = formData.get('confirmPassword');

        if (newPass !== confirmPass) {
            showNotification('New passwords do not match!', 'error');
            return;
        }

        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, oldPass);
            
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPass);
            
            showNotification('Password updated successfully!');
            setModal({ show: false, type: null });
        } catch (error) {
            console.error(error);
            showNotification('Error: Current password incorrect or session expired', 'error');
        }
    };

    const handleCheckIn = (courseId) => {
        setAppState(prev => {
            const newCourses = prev.courses.map(c => {
                if (c.id === courseId && !c.checkedIn) {
                    return { ...c, checkedIn: true, attendanceRate: Math.min(100, c.attendanceRate + 1) };
                }
                return c;
            });
            
            const newUser = { ...prev.user, overallAttendance: Math.min(100, prev.user.overallAttendance + 0.5) };
            
            const newAttendance = prev.attendance.map(a => {
                if (a.class === courseId) {
                    return { ...a, onTime: a.onTime + 1, total: a.total + 1 };
                }
                return a;
            });

            return { ...prev, courses: newCourses, user: newUser, attendance: newAttendance };
        });
        showNotification(`Checked in to ${appState.courses.find(c => c.id === courseId)?.name}`);
    };

    const toggleGPS = () => {
        setAppState(prev => ({
            ...prev,
            user: { ...prev.user, gpsActive: !prev.user.gpsActive }
        }));
        showNotification(`GPS ${!appState.user.gpsActive ? 'Activated' : 'Deactivated'}`);
    };

    const deleteCourse = (courseId) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            setAppState(prev => {
                const newCourses = prev.courses.filter(c => c.id !== courseId);
                return {
                    ...prev,
                    courses: newCourses,
                    upcoming: prev.upcoming.filter(u => u.courseId !== courseId),
                    attendance: prev.attendance.filter(a => a.class !== courseId),
                    user: { ...prev.user, enrolledCourses: newCourses.length }
                };
            });
            if (selectedCourse === courseId) {
                setSelectedCourse(appState.courses.find(c => c.id !== courseId)?.id || null);
            }
            showNotification(`Course ${courseId} deleted`);
        }
    };

    const handleEnrollCourse = async (e) => {
        e.preventDefault();
        setIsEnrolling(true);
        
        const formData = new FormData(e.target);
        const courseId = formData.get('courseId');
        const studentUid = auth.currentUser?.uid;

        if (!studentUid) {
            showNotification('You must be logged in', 'error');
            setIsEnrolling(false);
            return;
        }

        try {
            const q = query(collection(db, 'courses'), where('courseId', '==', courseId));
            const courseQuerySnapshot = await getDocs(q);

            if (courseQuerySnapshot.empty) {
                showNotification('Course not found', 'error');
                setIsEnrolling(false);
                return;
            }

            const courseDoc = courseQuerySnapshot.docs[0];
            const courseRef = courseDoc.ref;
            const courseData = courseDoc.data();

            if (appState.courses.some(c => c.id === courseId)) {
                showNotification('Already enrolled in this course', 'error');
                setIsEnrolling(false);
                return;
            }

            const enrollmentRef = doc(collection(db, 'enrollments'));

            await runTransaction(db, async (transaction) => {
                transaction.set(enrollmentRef, {
                    studentUid: studentUid,
                    courseId: courseId,
                    enrolledAt: serverTimestamp()
                });

                transaction.update(courseRef, {
                    studentsCount: increment(1)
                });
            });

            const newCourse = {
                id: courseId,
                name: courseData.name,
                instructor: courseData.instructor,
                schedule: `${courseData.days || ''} ${courseData.time || ''}`,
                days: courseData.days ? courseData.days.split(', ') : [],
                time: courseData.time,
                room: courseData.room,
                students: courseData.studentsCount || 0,
                attendanceRate: 0,
                checkedIn: false,
                timeRemaining: 0
            };

            setAppState(prev => ({
                ...prev,
                courses: [...prev.courses, newCourse],
                user: { ...prev.user, enrolledCourses: prev.courses.length + 1 }
            }));

            showNotification(`Enrolled in ${courseData.name} successfully!`);
            setModal({ show: false, type: null });

        } catch (error) {
            console.error("Enrollment error:", error);
            showNotification(error.message || 'Failed to enroll', 'error');
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleAddUpcoming = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('className');

        const newClass = {
            id: Date.now(),
            name: name,
            time: formData.get('classTime'),
            room: formData.get('classRoom'),
            date: formData.get('classDate')
        };

        setAppState(prev => ({ ...prev, upcoming: [...prev.upcoming, newClass] }));
        setModal({ show: false, type: null });
        showNotification(`Added upcoming class: ${name}`);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAppState(prev => ({
                    ...prev,
                    user: {
                        ...prev.user,
                        profileImage: reader.result
                    }
                }));
                showNotification('Profile image updated successfully!');
            };
            reader.readAsDataURL(file);
        }
    };

    const removeProfileImage = () => {
        setAppState(prev => ({
            ...prev,
            user: {
                ...prev.user,
                profileImage: null
            }
        }));
        showNotification('Profile image removed');
    };

    // دالة مساعدة لإنشاء بيانات الـ QR Code
    const generateQRData = () => {
        const data = {
            name: appState.user.name,
            code: appState.user.id,
            department: appState.user.department,
            email: appState.user.email
        };
        // تحويل البيانات لـ JSON ثم تشفيرها لـ URL
        return encodeURIComponent(JSON.stringify(data));
    };

    return (
        <div className="yc-dashboard">
            {toast.show && (
                <div className={`yc-toast ${toast.type}`}>
                    <span className="yc-toast-icon">
                        {toast.type === 'success' ? <IconComponent name="Check" /> : <IconComponent name="X" />}
                    </span>
                    {toast.message}
                </div>
            )}

            <aside className="yc-sidebar">
                <div className="yc-sidebar-logo">
                    <div className="yc-logo-icon-wrapper">
                        <IconComponent name="GraduationCap" />
                    </div>
                    <span className="yc-logo-text">
                        Yalla<span className="yc-logo-highlight">Class</span>
                    </span>
                </div>

                <div className="yc-sidebar-profile">
                    <div className="yc-profile-image-wrapper">
                        {appState.user.profileImage ? (
                            <img src={appState.user.profileImage} alt="Profile" className="yc-profile-image" />
                        ) : (
                            <div className="yc-profile-placeholder">
                                {appState.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                        )}
                        <div 
                            className="yc-image-upload-overlay" 
                            onClick={() => document.getElementById('profile-upload').click()}
                            title="Upload new photo"
                        >
                            <IconComponent name="Camera" />
                        </div>
                    </div>

                    <input
                        type="file"
                        id="profile-upload"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    <div className="yc-profile-name">{appState.user.name}</div>
                    <div className="yc-profile-id">{appState.user.id}</div>

                    {appState.user.profileImage && (
                        <button className="yc-remove-photo-btn" onClick={removeProfileImage}>
                            Remove Photo
                        </button>
                    )}
                </div>

                <nav className="yc-sidebar-nav">
                    <div className="yc-nav-item yc-active">
                        <IconComponent name="Dashboard" />
                        <span>Dashboard</span>
                    </div>
                    <div className="yc-nav-item">
                        <IconComponent name="BookOpen" />
                        <span>My Courses</span>
                    </div>
                    {/* --- تعديل: إضافة onClick لفتح المودال --- */}
                    <div className="yc-nav-item" onClick={() => setModal({ show: true, type: 'id' })}>
                        <IconComponent name="IdCard" />
                        <span>Student ID</span>
                    </div>
                    <div className="yc-nav-item">
                        <IconComponent name="Calendar" />
                        <span>Attendance</span>
                    </div>
                    <div className="yc-nav-item">
                        <IconComponent name="Settings" />
                        <span>Settings</span>
                    </div>
                </nav>

                <div className="yc-sidebar-actions">
                    <div className="yc-nav-item yc-change-password" onClick={() => setModal({ show: true, type: 'password' })}>
                        <IconComponent name="Lock" />
                        <span>Change Password</span>
                    </div>
                    <div className="yc-nav-item yc-logout" onClick={handleLogout}>
                        <IconComponent name="LogOut" />
                        <span>Logout</span>
                    </div>
                </div>
            </aside>

            <main className="yc-main-content">
                <header className="yc-header">
                    <div>
                        <h1 className="yc-page-title">Student Dashboard</h1>
                        <p className="yc-page-subtitle">Welcome back, {appState.user.name}!</p>
                    </div>
                </header>

                <div className="yc-stats-grid">
                    <div className="yc-stat-card yc-primary">
                        <div className="yc-stat-icon">
                            <IconComponent name="TrendingUp" />
                        </div>
                        <div className="yc-stat-content">
                            <span className="yc-stat-label">Overall Attendance</span>
                            <span className="yc-stat-value">{appState.user.overallAttendance}%</span>
                        </div>
                    </div>
                    <div className="yc-stat-card">
                        <div className="yc-stat-icon yc-blue">
                            <IconComponent name="BookOpen" />
                        </div>
                        <div className="yc-stat-content">
                            <span className="yc-stat-label">Enrolled Courses</span>
                            <span className="yc-stat-value">{appState.courses.length}</span>
                        </div>
                    </div>
                    <div className="yc-stat-card">
                        <div className="yc-stat-icon yc-purple">
                            <IconComponent name="Calendar" />
                        </div>
                        <div className="yc-stat-content">
                            <span className="yc-stat-label">Active Session</span>
                            <span className="yc-stat-value">{appState.user.activeSession}</span>
                        </div>
                    </div>
                    <div className="yc-stat-card yc-clickable" onClick={toggleGPS}>
                        <div className={`yc-gps-status ${appState.user.gpsActive ? 'yc-active' : 'yc-inactive'}`}>
                            <IconComponent name="MapPin" />
                            <span>GPS {appState.user.gpsActive ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                </div>

                {appState.courses.some(c => c.timeRemaining > 0) && (
                    <div className="yc-active-banner">
                        <div className="yc-banner-info">
                            <div className="yc-banner-pulse"></div>
                            <span>Attendance Active for <strong>{appState.courses.find(c => c.timeRemaining > 0)?.id}</strong> - {appState.courses.find(c => c.timeRemaining > 0)?.name}</span>
                        </div>
                        <div className="yc-banner-timer">
                            <IconComponent name="Clock" />
                            <span>{appState.courses.find(c => c.timeRemaining > 0)?.timeRemaining} min remaining</span>
                        </div>
                    </div>
                )}

                <div className="yc-courses-row">
                    <div className="yc-section-card">
                        <div className="yc-section-header">
                            <h2 className="yc-section-title">My Courses ({appState.courses.length})</h2>
                            <button className="yc-add-btn" onClick={() => setModal({ show: true, type: 'course' })}>
                                <IconComponent name="Plus" />
                            </button>
                        </div>
                        <div className="yc-courses-list">
                            {appState.courses.length > 0 ? appState.courses.map(course => (
                                <div 
                                    key={course.id} 
                                    className={`yc-course-item ${selectedCourse === course.id ? 'yc-selected' : ''}`}
                                    onClick={() => setSelectedCourse(course.id)}
                                >
                                    <div className="yc-course-header">
                                        <span className="yc-course-code">{course.id}</span>
                                        <span className={`yc-check-status ${course.checkedIn ? 'yc-checked' : ''}`}>
                                            {course.checkedIn ? (
                                                <>
                                                    <IconComponent name="Check" />
                                                    Checked In
                                                </>
                                            ) : 'Not checked in'}
                                        </span>
                                    </div>
                                    <div className="yc-course-name">{course.name}</div>
                                    <div className="yc-course-instructor">{course.instructor}</div>
                                    <div className="yc-course-footer">
                                        <span className="yc-course-rate">{course.attendanceRate}%</span>
                                        <button 
                                            className="yc-delete-btn"
                                            onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }}
                                        >
                                            <IconComponent name="Trash2" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="yc-empty-state">
                                    <IconComponent name="BookOpen" />
                                    <p>No courses yet</p>
                                    <span>Click the + button to enroll</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="yc-section-card">
                        <div className="yc-section-header">
                            <h2 className="yc-section-title">Upcoming Classes ({appState.upcoming.length})</h2>
                            <button className="yc-add-btn" onClick={() => setModal({ show: true, type: 'upcoming' })}>
                                <IconComponent name="Plus" />
                            </button>
                        </div>
                        <div className="yc-upcoming-list">
                            {appState.upcoming.length > 0 ? appState.upcoming.map(cls => (
                                <div key={cls.id} className="yc-upcoming-item">
                                    <div className="yc-upcoming-info">
                                        <span className="yc-upcoming-name">{cls.name}</span>
                                        <span className="yc-upcoming-room">
                                            <IconComponent name="Map" />
                                            Room {cls.room}
                                        </span>
                                    </div>
                                    <div className="yc-upcoming-time">
                                        <span className="yc-time-badge">{cls.date}</span>
                                        <span className="yc-time-value">{cls.time}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="yc-empty-state">
                                    <IconComponent name="Calendar" />
                                    <p>No upcoming classes</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {selectedCourse && appState.courses.find(c => c.id === selectedCourse) && (() => {
                    const course = appState.courses.find(c => c.id === selectedCourse);
                    return (
                        <div className="yc-course-detail">
                            <div className="yc-course-detail-info">
                                <h2>{course.id} - {course.name}</h2>
                                <p>Instructor: {course.instructor}</p>
                                <div className="yc-course-meta">
                                    <span><IconComponent name="Clock" /> {course.schedule}</span>
                                    <span><IconComponent name="Users" /> {course.students} Students</span>
                                    <span><IconComponent name="Map" /> Room {course.room}</span>
                                </div>
                            </div>
                            <div className="yc-course-detail-actions">
                                <div className="yc-rate-badge">{course.attendanceRate}%</div>
                                <button 
                                    className={`yc-check-in-btn ${course.checkedIn ? 'yc-checked' : ''}`}
                                    onClick={() => handleCheckIn(course.id)}
                                    disabled={course.checkedIn}
                                >
                                    {course.checkedIn ? (
                                        <>
                                            <IconComponent name="Check" />
                                            Checked In
                                        </>
                                    ) : 'Check In Now'}
                                </button>
                            </div>
                        </div>
                    );
                })()}

                <div className="yc-table-card">
                    <h2 className="yc-section-title">This Week Attendance</h2>
                    <div className="yc-table-wrapper">
                        <table className="yc-attendance-table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Class</th>
                                    <th>On-Time</th>
                                    <th>Late</th>
                                    <th>Absences</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appState.attendance.length > 0 ? appState.attendance.map((item, idx) => (
                                    <tr key={idx}>
                                        <td><strong>{item.class}</strong></td>
                                        <td>{item.name}</td>
                                        <td className="yc-success">{item.onTime}</td>
                                        <td className="yc-warning">{item.late}</td>
                                        <td className="yc-danger">{item.absences}</td>
                                        <td>{item.total}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="yc-empty-table">
                                            No attendance records yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="yc-trend-card">
                    <h2 className="yc-section-title">Attendance Trend</h2>
                    <div className="yc-chart-container">
                        <div className="yc-chart-bars">
                            {appState.trend.map((week, index) => (
                                <div key={index} className="yc-bar-wrapper">
                                    <div 
                                        className="yc-bar" 
                                        style={{ height: `${week.rate * 1.5}px` }}
                                        title={`${week.week}: ${week.rate}%`}
                                    ></div>
                                    <span className="yc-bar-value">{week.rate}%</span>
                                    <span className="yc-bar-label">{week.week}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {modal.show && (
                <div className="yc-modal-overlay" onClick={() => setModal({ show: false, type: null })}>
                    <div className="yc-modal" onClick={e => e.stopPropagation()}>
                        <div className="yc-modal-header">
                            <h3>
                                {modal.type === 'course' ? 'Enroll in Course' : 
                                 modal.type === 'upcoming' ? 'Add Upcoming Class' : 
                                 modal.type === 'id' ? 'Student ID Card' :
                                 'Change Password'}
                            </h3>
                            <button className="yc-modal-close" onClick={() => setModal({ show: false, type: null })}>
                                <IconComponent name="X" />
                            </button>
                        </div>
                        
                        {modal.type === 'course' ? (
                            <form onSubmit={handleEnrollCourse} className="yc-form">
                                <div className="yc-form-group">
                                    <label>Select Course to Enroll</label>
                                    <select name="courseId" className="form-control" required>
                                        <option value="" disabled selected>Choose a course...</option>
                                        {availableCourses.map(course => (
                                            <option key={course.id} value={course.courseId}>
                                                {course.name} ({course.courseId})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="yc-form-actions">
                                    <button type="button" className="yc-btn-secondary" onClick={() => setModal({ show: false, type: null })}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="yc-btn-primary" disabled={isEnrolling}>
                                        {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
                                    </button>
                                </div>
                            </form>
                        ) : modal.type === 'upcoming' ? (
                            <form onSubmit={handleAddUpcoming} className="yc-form">
                                <div className="yc-form-group">
                                    <label>Class Name</label>
                                    <input type="text" name="className" placeholder="e.g., Data Structures" required />
                                </div>
                                <div className="yc-form-row">
                                    <div className="yc-form-group">
                                        <label>Time</label>
                                        <input type="text" name="classTime" placeholder="e.g., 2:00 PM" required />
                                    </div>
                                    <div className="yc-form-group">
                                        <label>Room</label>
                                        <input type="text" name="classRoom" placeholder="e.g., 201" required />
                                    </div>
                                </div>
                                <div className="yc-form-group">
                                    <label>Date</label>
                                    <select name="classDate" required>
                                        <option value="Today">Today</option>
                                        <option value="Tomorrow">Tomorrow</option>
                                    </select>
                                </div>
                                <div className="yc-form-actions">
                                    <button type="button" className="yc-btn-secondary" onClick={() => setModal({ show: false, type: null })}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="yc-btn-primary">
                                        Add Class
                                    </button>
                                </div>
                            </form>
                        ) : modal.type === 'id' ? (
                            // --- واجهة بطاقة الطالب و الـ QR Code ---
                            <div className="yc-form" style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                    
                                    <div className="yc-profile-placeholder" style={{ width: '80px', height: '80px', fontSize: '24px' }}>
                                        {appState.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>

                                    <div>
                                        <h2 style={{ margin: 0 }}>{appState.user.name}</h2>
                                        <p style={{ margin: '5px 0 0', color: '#666' }}>{appState.user.id}</p>
                                    </div>

                                    <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '10px', width: '100%', textAlign: 'left' }}>
                                        <p style={{ margin: '5px 0' }}><strong>Department:</strong> {appState.user.department}</p>
                                        <p style={{ margin: '5px 0' }}><strong>Email:</strong> {appState.user.email}</p>
                                    </div>

                                    <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #eee' }}>
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${generateQRData()}`} 
                                            alt="Student QR Code" 
                                            style={{ width: '150px', height: '150px' }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>Scan to verify identity</p>
                                    </div>
                                </div>

                                <div className="yc-form-actions" style={{ marginTop: '20px' }}>
                                    <button type="button" className="yc-btn-primary" onClick={() => setModal({ show: false, type: null })}>
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleChangePassword} className="yc-form">
                                <div className="yc-form-group">
                                    <label>Current Password</label>
                                    <input type="password" name="oldPassword" placeholder="••••••••" required />
                                </div>
                                <div className="yc-form-group">
                                    <label>New Password</label>
                                    <input type="password" name="newPassword" placeholder="••••••••" required />
                                </div>
                                <div className="yc-form-group">
                                    <label>Confirm New Password</label>
                                    <input type="password" name="confirmPassword" placeholder="••••••••" required />
                                </div>
                                <div className="yc-form-actions">
                                    <button type="button" className="yc-btn-secondary" onClick={() => setModal({ show: false, type: null })}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="yc-btn-primary">
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}