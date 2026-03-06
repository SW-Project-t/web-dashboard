import React, { useState, useEffect } from 'react';
import './StudentDashboard.css';
import { useNavigate } from 'react-router-dom';

import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
        profileImage: null
    },
    courses: [
        { id: "CS401", name: "Data Structures", instructor: "Dr. Sarah Ahmed", schedule: "Mon, Wed 10:00 AM", students: 45, attendanceRate: 95, checkedIn: false, timeRemaining: 8, room: "201", days: ["Mon", "Wed"], time: "10:00 AM" },
        { id: "CS402", name: "Algorithms", instructor: "Dr. Mohammed Ali", schedule: "Tue, Thu 2:00 PM", students: 38, attendanceRate: 88, checkedIn: false, room: "102", days: ["Tue", "Thu"], time: "2:00 PM" },
        { id: "CS403", name: "Database Systems", instructor: "Dr. Fatima Khan", schedule: "Wed, Fri 11:00 AM", students: 42, attendanceRate: 92, checkedIn: false, room: "305", days: ["Wed", "Fri"], time: "11:00 AM" }
    ],
    upcoming: [
        { id: 1, name: "Data Structures", time: "10:00 AM", room: "201", date: "Today", courseId: "CS401" },
        { id: 2, name: "Database Systems", time: "11:00 AM", room: "305", date: "Today", courseId: "CS403" },
        { id: 3, name: "Algorithms", time: "2:00 PM", room: "102", date: "Tomorrow", courseId: "CS402" }
    ],
    attendance: [
        { class: "CS402", name: "Algorithms", onTime: 15, late: 2, absences: 1, total: 18 },
        { class: "CS401", name: "Data Structures", onTime: 12, late: 4, absences: 2, total: 18 }
    ],
    trend: [
        { week: "Week 1", rate: 92 }, { week: "Week 2", rate: 88 }, { week: "Week 3", rate: 95 },
        { week: "Week 4", rate: 89 }, { week: "Week 5", rate: 93 }, { week: "Week 6", rate: 92 }
    ]
};

const loadData = () => {
    return {
        user: JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || defaultData.user,
        courses: JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES)) || defaultData.courses,
        upcoming: JSON.parse(localStorage.getItem(STORAGE_KEYS.UPCOMING)) || defaultData.upcoming,
        attendance: JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || defaultData.attendance,
        trend: JSON.parse(localStorage.getItem(STORAGE_KEYS.TREND)) || defaultData.trend
    };
};

export default function StudentDashboard() {
    const [appState, setAppState] = useState(loadData());
    const [selectedCourse, setSelectedCourse] = useState(appState.courses[0]?.id || null);
    const [modal, setModal] = useState({ show: false, type: null });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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

    useEffect(() => {
        const timer = setInterval(() => {
            setAppState(prev => {
                const newCourses = prev.courses.map(c => {
                    if (c.id === "CS401" && c.timeRemaining > 0) {
                        return { ...c, timeRemaining: c.timeRemaining - 1 };
                    }
                    return c;
                });
                return { ...prev, courses: newCourses };
            });
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    const showNotification = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
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

    const resetAllData = () => {
        if (window.confirm('Reset all data to default?')) {
            setAppState(defaultData);
            setSelectedCourse(defaultData.courses[0]?.id || null);
            showNotification('Data reset to default');
        }
    };

    const handleAddCourse = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const courseId = formData.get('courseId').toUpperCase();
        const time = formData.get('time');
        const days = formData.get('days');
        const courseName = formData.get('courseName');

        if (appState.courses.some(c => c.id === courseId)) {
            showNotification('Course ID already exists', 'error');
            return;
        }

        const newCourse = {
            id: courseId,
            name: courseName,
            instructor: formData.get('instructor'),
            schedule: `${days} ${time}`,
            days: days.split(', '),
            time: time,
            room: formData.get('room'),
            students: parseInt(formData.get('students')) || 0,
            attendanceRate: 0,
            checkedIn: false,
            timeRemaining: 0
        };

        const currentHour = new Date().getHours();
        const classHour = parseInt(time.split(':')[0]);
        const dateStr = classHour > currentHour ? "Today" : "Tomorrow";

        setAppState(prev => ({
            ...prev,
            courses: [...prev.courses, newCourse],
            user: { ...prev.user, enrolledCourses: prev.courses.length + 1 },
            upcoming: [...prev.upcoming, { id: Date.now(), name: courseName, time, room: newCourse.room, date: dateStr, courseId }],
            attendance: [...prev.attendance, { class: courseId, name: courseName, onTime: 0, late: 0, absences: 0, total: newCourse.students }],
            trend: [...prev.trend, { week: `Week ${prev.trend.length + 1}`, rate: prev.trend[prev.trend.length - 1]?.rate || 0 }]
        }));

        setModal({ show: false, type: null });
        showNotification(`Course ${courseId} added successfully!`);
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

    return (
        <div className="app">
            {toast.show && (
                <div className={`notification ${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <div className="sidebar">
                <div className="sidebar-profile">
                    <div className="profile-image-wrapper">
                        {appState.user.profileImage ? (
                            <img src={appState.user.profileImage} alt="Profile" className="sidebar-profile-image" />
                        ) : (
                            <div className="sidebar-profile-placeholder">
                                {appState.user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                        )}
                        <div 
                           className="image-upload-overlay" 
                           onClick={() => document.getElementById('profile-upload').click()}
                           title="Upload new photo"
                        >
                            <span>+</span>
                        </div>
                    </div>

                    <div className="sidebar-profile-name">{appState.user.name}</div>
                    <div className="sidebar-profile-id">{appState.user.id}</div>

                    <input
                        type="file"
                        id="profile-upload"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    {appState.user.profileImage && (
                        <button className="remove-photo-btn" onClick={removeProfileImage}>
                            Remove Photo
                        </button>
                    )}
                </div>

                <div className="nav-item active" onClick={() => showNotification('Dashboard')}>Dashboard</div>
                <div className="nav-item" onClick={() => showNotification(`My Courses: ${appState.courses.length} courses`)}>My Courses</div>
                <div className="nav-item" onClick={() => showNotification(`Student ID: ${appState.user.id}`)}>Student ID: {appState.user.id}</div>
                <div className="nav-item" onClick={() => showNotification('Attendance Records')}>Attendance</div>
                <div className="nav-item" onClick={() => showNotification('Settings')}>Settings</div>
                <div className="nav-item logout" onClick={resetAllData}>Reset Data</div>
                
                <div className="nav-item logout" onClick={handleLogout}>Logout</div>
            </div>

            <div className="main-content">
                <div className="header">
                    <div>
                        <h1>Student Dashboard</h1>
                        <p>Welcome back, {appState.user.name}!</p>
                    </div>
                </div>

                <div className="dashboard-grid">
                    <div className="card" onClick={() => showNotification(`Overall Attendance: ${appState.user.overallAttendance}%`)}>
                        <div className="card-label">Overall Attendance</div>
                        <div className="card-value">{appState.user.overallAttendance}%</div>
                    </div>
                    <div className="card" onClick={() => showNotification(`Enrolled Courses: ${appState.courses.length}`)}>
                        <div className="card-label">Enrolled Courses</div>
                        <div className="card-value">{appState.courses.length}</div>
                    </div>
                    <div className="card" onClick={() => showNotification(`Active Sessions: ${appState.user.activeSession}`)}>
                        <div className="card-label">Active Session</div>
                        <div className="card-value">{appState.user.activeSession}</div>
                    </div>
                    <div className="card" onClick={toggleGPS}>
                        <div className="location-badge">
                            GPS {appState.user.gpsActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                </div>

                {appState.courses.some(c => c.timeRemaining > 0) && (
                    <div className="active-session">
                        <p>Attendance Active for {appState.courses.find(c => c.timeRemaining > 0)?.id} - {appState.courses.find(c => c.timeRemaining > 0)?.name}</p>
                        <div className="timer">{appState.courses.find(c => c.timeRemaining > 0)?.timeRemaining} minutes remaining</div>
                    </div>
                )}

                <div className="courses-row">
                    <div className="section-card">
                        <div className="section-title">
                            My Courses ({appState.courses.length})
                            <button className="add-btn" onClick={() => setModal({ show: true, type: 'course' })}>+</button>
                        </div>
                        {appState.courses.length > 0 ? appState.courses.map(course => (
                            <div key={course.id} className={`course-item ${selectedCourse === course.id ? 'selected' : ''}`} onClick={() => setSelectedCourse(course.id)}>
                                <span className="course-code">{course.id}</span>
                                <div className="course-name">{course.name}</div>
                                <div className="course-instructor">{course.instructor}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                    <span style={{ color: course.checkedIn ? '#22c55e' : '#64748b', fontSize: '0.9rem' }}>
                                        {course.checkedIn ? 'Checked In' : 'Not checked in'}
                                    </span>
                                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }}>Delete</button>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                <p>No courses yet</p>
                                <p>Click the + button to add your first course</p>
                            </div>
                        )}
                    </div>

                    <div className="section-card">
                        <div className="section-title">
                            Upcoming Classes ({appState.upcoming.length})
                            <button className="add-btn" onClick={() => setModal({ show: true, type: 'upcoming' })}>+</button>
                        </div>
                        {appState.upcoming.length > 0 ? appState.upcoming.map(cls => (
                            <div key={cls.id} className="upcoming-item" onClick={() => showNotification(`${cls.name} at ${cls.time} in Room ${cls.room}`)}>
                                <div>
                                    <div className="class-title">{cls.name}</div>
                                    <div className="class-room">Room {cls.room}</div>
                                </div>
                                <div className="class-time">{cls.date}, {cls.time}</div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                <p>No upcoming classes</p>
                            </div>
                        )}
                    </div>
                </div>

                {selectedCourse && appState.courses.find(c => c.id === selectedCourse) && (() => {
                    const course = appState.courses.find(c => c.id === selectedCourse);
                    return (
                        <div className="course-detail-card">
                            <div className="course-info">
                                <h2>{course.id} - {course.name}</h2>
                                <p>Instructor: {course.instructor}</p>
                                <div className="course-meta">
                                    <span>{course.schedule}</span>
                                    <span>{course.students} Students</span>
                                    <span>Room {course.room}</span>
                                </div>
                            </div>
                            <div className="attendance-rate">
                                <div className="rate-badge">{course.attendanceRate}%</div>
                                <button className="check-in-btn" onClick={() => handleCheckIn(course.id)} disabled={course.checkedIn}>
                                    {course.checkedIn ? 'Checked In' : 'Check In Now'}
                                </button>
                            </div>
                        </div>
                    );
                })()}

                <div className="table-wrapper">
                    <div className="section-title">This Week Attendance</div>
                    <table className="week-table">
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
                                <tr key={idx} onClick={() => showNotification(`${item.name} - On Time: ${item.onTime}, Late: ${item.late}`)}>
                                    <td><strong>{item.class}</strong></td>
                                    <td>{item.name}</td>
                                    <td>{item.onTime}</td>
                                    <td>{item.late}</td>
                                    <td>{item.absences}</td>
                                    <td>{item.total}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        No attendance records yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="trend-card">
                    <div className="section-title">Attendance Trend</div>
                    <div className="chart-container">
                        <div className="chart-bars">
                            {appState.trend.map((week, index) => (
                                <div key={index} className="bar-wrapper" onClick={() => showNotification(`${week.week}: ${week.rate}%`)}>
                                    <div className="bar" style={{ height: `${week.rate * 1.5}px` }}></div>
                                    <span className="bar-label">{week.rate}%</span>
                                </div>
                            ))}
                        </div>
                        <div className="axis-labels">
                            {appState.trend.map((week, idx) => (
                                <span key={idx}>{week.week}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {modal.show && (
                <div className="modal" onClick={() => setModal({ show: false, type: null })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{modal.type === 'course' ? 'Add New Course' : 'Add Upcoming Class'}</h3>
                        
                        {modal.type === 'course' ? (
                            <form onSubmit={handleAddCourse}>
                                <input type="text" name="courseId" placeholder="Course ID (e.g., CS404)" required />
                                <input type="text" name="courseName" placeholder="Course Name (e.g., Web Development)" required />
                                <input type="text" name="instructor" placeholder="Instructor Name" required />
                                <select name="days" required>
                                    <option value="">Select Days</option>
                                    <option value="Sun, Tue">Sunday, Tuesday</option>
                                    <option value="Mon, Wed">Monday, Wednesday</option>
                                    <option value="Tue, Thu">Tuesday, Thursday</option>
                                    <option value="Wed, Fri">Wednesday, Friday</option>
                                    <option value="Sat, Mon">Saturday, Monday</option>
                                </select>
                                <input type="text" name="time" placeholder="Time (e.g., 1:00 PM)" required />
                                <input type="text" name="room" placeholder="Room Number (e.g., 201)" required />
                                <input type="number" name="students" placeholder="Number of Students" defaultValue="0" />
                                <small style={{ color: '#64748b', display: 'block', marginBottom: '10px' }}>* All fields are required</small>
                                <div className="modal-buttons">
                                    <button type="submit">Add</button>
                                    <button type="button" onClick={() => setModal({ show: false, type: null })}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleAddUpcoming}>
                                <input type="text" name="className" placeholder="Class Name" required />
                                <input type="text" name="classTime" placeholder="Time (e.g., 2:00 PM)" required />
                                <input type="text" name="classRoom" placeholder="Room Number" required />
                                <select name="classDate" required>
                                    <option value="Today">Today</option>
                                    <option value="Tomorrow">Tomorrow</option>
                                </select>
                                <div className="modal-buttons">
                                    <button type="submit">Add</button>
                                    <button type="button" onClick={() => setModal({ show: false, type: null })}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}