import React, { useState, useEffect } from 'react';
import './ProfessorDashboard.css';
import { useNavigate } from 'react-router-dom';

import { auth, db } from './firebase'; 
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEYS = {
    PROF_IMAGE: 'yallaclass_prof_image'
};

export default function ProfessorDashboard() {
   const navigate = useNavigate();
   
   const [profileImage, setProfileImage] = useState(localStorage.getItem(STORAGE_KEYS.PROF_IMAGE) || null);
   
   const [profData, setProfData] = useState({ name: 'Loading...', code: '...' });
   const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                const token = localStorage.getItem('token');
                if(!token){navigate('/');}
                else if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfData({
                        name: data.fullName || "Dr. Anonymous",
                        code: data.code || "No Code"});
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            navigate('/');
        }
    });
    return () => unsubscribe();
}, [navigate]);
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        setTimeout(() => {
            navigate('/');
        }, 1000);
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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
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

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedCourses = [...filteredCourses].sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'students') return b.students - a.students;
        if (sortBy === 'attendance') return b.avgAttendance - a.avgAttendance;
        return 0;
    });

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

    const duplicateCourse = (course) => {
        const newId = course.id + ' Copy';
        setCourses([...courses, {
            ...course,
            id: newId,
            name: course.name + ' (Copy)'
        }]);
        showNotification(`Course duplicated as ${newId}`);
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
        <div className="app professor-app">
            <div className="notifications-container">
                {notifications.map(n => (
                    <div key={n.id} className={`notification ${n.type}`}>
                        {n.message}
                    </div>
                ))}
            </div>

            <div className="sidebar">
                <div className="sidebar-profile">
                    <div className="profile-image-wrapper">
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" className="sidebar-profile-image" />
                        ) : (
                            <div className="sidebar-profile-placeholder">
                                {profData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                        )}
                        <div 
                           className="image-upload-overlay" 
                           onClick={() => document.getElementById('prof-profile-upload').click()}
                           title="Upload new photo"
                        >
                            <span>+</span>
                        </div>
                    </div>

                    <div className="sidebar-profile-name">{profData.name}</div>
                    <div className="sidebar-profile-id">{profData.code}</div>

                    <input
                        type="file"
                        id="prof-profile-upload"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    {profileImage && (
                        <button className="remove-photo-btn" onClick={removeProfileImage}>
                            Remove Photo
                        </button>
                    )}
                </div>

                <div className="nav-item active">Dashboard</div>
                <div className="nav-item">My Courses</div>
                <div className="nav-item">Students</div>
                <div className="nav-item">Schedule</div>
                <div className="nav-item">Settings</div>
                
                <div className="nav-item" onClick={exportData} style={{ cursor: 'pointer' }}>
                    Export Data
                </div>
                
                <div className="nav-item logout" onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</div>
            </div>

            <div className="main-content">
                
                <div className="header">
                    <div>
                        <h1> Dashboard </h1>
                        <p>Welcome back, {profData.name}!</p>
                    </div>
                    
                    <div className="search-sort-container">
                        <input
                            type="text"
                            placeholder="Search courses by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="students">Sort by Students</option>
                            <option value="attendance">Sort by Attendance</option>
                        </select>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Courses</div>
                        <div className="stat-value">{courses.length}</div>
                        <small className="stat-subtext">Active courses</small>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Students</div>
                        <div className="stat-value">{totalStudents}</div>
                        <small className="stat-subtext">Enrolled students</small>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg Attendance</div>
                        <div className="stat-value">{avgAttendance}%</div>
                        <small className="stat-subtext">Overall average</small>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Today's Present</div>
                        <div className="stat-value">{totalPresent}</div>
                        <small className="stat-subtext">Checked in today</small>
                    </div>
                </div>

                <div className="quick-actions">
                    <button className="btn btn-primary" onClick={openAddModal}>
                        Add New Course
                    </button>
                    <button className="btn btn-outline" onClick={() => {
                        setSearchTerm('');
                        showNotification('Filters cleared');
                    }}>
                        Clear Search
                    </button>
                </div>

                <div>
                    <div className="section-title">
                        My Courses ({sortedCourses.length})
                        <button className="add-btn" onClick={openAddModal}>+</button>
                    </div>

                    {sortedCourses.length === 0 ? (
                        <div className="empty-state">
                            <h3>No courses found</h3>
                            <p>Try adjusting your search or add a new course</p>
                            <button className="btn btn-primary" onClick={openAddModal}>
                                Add Your First Course
                            </button>
                        </div>
                    ) : (
                        sortedCourses.map(course => (
                            <div key={course.id} className="course-card">
                                <div className="course-info">
                                    <div className="course-header">
                                        <span className="course-code">{course.id}</span>
                                        <span className="course-schedule">{course.schedule}</span>
                                    </div>
                                    <h3 className="course-name">{course.name}</h3>
                                    <p className="course-meta">
                                        {course.room} • {course.students} Students
                                    </p>
                                    
                                    <div className="attendance-badge">
                                        Avg Attendance <span>{course.avgAttendance}%</span>
                                    </div>

                                    <div className="attendance-buttons">
                                        <button className="btn btn-present" onClick={() => updateAttendance(course.id, 'present')}>
                                            +Present
                                        </button>
                                        <button className="btn btn-late" onClick={() => updateAttendance(course.id, 'late')}>
                                            +Late
                                        </button>
                                        <button className="btn btn-absent" onClick={() => updateAttendance(course.id, 'absent')}>
                                            +Absent
                                        </button>
                                    </div>

                                    <div className="today-stats">
                                        <span className="stat-present">{course.todayPresent}</span>
                                        <span className="stat-late">{course.todayLate}</span>
                                        <span className="stat-absent">{course.todayAbsent}</span>
                                    </div>
                                </div>

                                <div className="action-buttons">
                                    <button className="btn btn-primary" onClick={() => openAttendanceModal(course)}>
                                        Start
                                    </button>
                                    <button className="btn btn-outline" onClick={() => openEditModal(course)}>
                                        Edit
                                    </button>
                                    <button className="btn btn-outline" onClick={() => duplicateCourse(course)}>
                                        Copy
                                    </button>
                                    <button className="btn btn-delete" onClick={() => deleteCourse(course.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="chart-card">
                    <div className="section-title">Weekly Attendance Overview</div>
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
                    <div className="chart-footer">
                        Higher attendance on Wednesdays
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        {modalType === 'attendance' ? (
                            <>
                                <h3>Start Attendance</h3>
                                <p className="modal-subtitle">Course: {selectedCourse?.name}</p>
                                
                                <div className="attendance-code">2478</div>

                                <p className="modal-instruction">Share this code with students</p>

                                <div className="modal-buttons">
                                    <button className="modal-btn confirm" onClick={() => {
                                        showNotification('Attendance session started!');
                                        setShowModal(false);
                                    }}>
                                        Start Session
                                    </button>
                                    <button className="modal-btn cancel" onClick={() => setShowModal(false)}>
                                        Close
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3>{modalType === 'add' ? 'Add New Course' : 'Edit Course'}</h3>
                                
                                <input
                                    className="modal-input"
                                    placeholder="Course ID (e.g., CS401)"
                                    value={newCourse.id}
                                    onChange={(e) => setNewCourse({...newCourse, id: e.target.value})}
                                />
                                <input
                                    className="modal-input"
                                    placeholder="Course Name"
                                    value={newCourse.name}
                                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                                />
                                <input
                                    className="modal-input"
                                    placeholder="Schedule (e.g., Mon, Wed 10:00 AM)"
                                    value={newCourse.schedule}
                                    onChange={(e) => setNewCourse({...newCourse, schedule: e.target.value})}
                                />
                                <input
                                    className="modal-input"
                                    placeholder="Room (e.g., Room 201)"
                                    value={newCourse.room}
                                    onChange={(e) => setNewCourse({...newCourse, room: e.target.value})}
                                />
                                <input
                                    className="modal-input"
                                    type="number"
                                    placeholder="Number of Students"
                                    value={newCourse.students}
                                    onChange={(e) => setNewCourse({...newCourse, students: e.target.value})}
                                />

                                <div className="modal-buttons">
                                    <button className="modal-btn confirm" onClick={saveCourse}>
                                        {modalType === 'add' ? 'Create Course' : 'Save Changes'}
                                    </button>
                                    <button className="modal-btn cancel" onClick={() => setShowModal(false)}>
                                        Cancel
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