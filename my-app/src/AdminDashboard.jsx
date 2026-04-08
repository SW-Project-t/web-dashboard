import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Users, BookOpen, TrendingUp, Settings, 
    Search, Bell, LogOut, Key, Plus, Edit, Trash2, Eye, 
    Download, Shield, Building, X, Menu, Mail, Phone, Calendar,
    BookMarked, Clock, Hash, DoorOpen, UserCheck, GraduationCap,
    Star, CheckCircle, Send, MessageSquare, Inbox
} from 'lucide-react';
import axios from 'axios';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, getDoc, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from './firebase'; 
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [adminData, setAdminData] = useState({ name: 'System Admin', code: 'ADM-001' });
    const [adminProfileImage, setAdminProfileImage] = useState(localStorage.getItem('admin_profile_image') || null);

    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
    const [isDigitalIdModalOpen, setIsDigitalIdModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [messageSubject, setMessageSubject] = useState('');

    const [newUserData, setNewUserData] = useState({
        fullName: '', email: '', password: '', role: '',
        academicYear: '', code: '', department: '', phoneNumber: '',
        gpa: ''
    });

    const [newCourseData, setNewCourseData] = useState({
        courseId: '', courseName: '', instructorName: '',
        SelectDays: '', Time: '', RoomNumber: '', capacity: '' ,totalStudents :0
    });

    const [passwordFields, setPasswordFields] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    });

    // Load users
    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersArray = [];
            querySnapshot.forEach((doc) => {
                usersArray.push({ id: doc.id, ...doc.data() });
            });
            setUsers(usersArray);
            
            const deptMap = {};
            usersArray.forEach(u => {
                const d = u.department || 'General';
                deptMap[d] = (deptMap[d] || 0) + 1;
            });
            const deptList = Object.keys(deptMap).map(k => ({ name: k, count: deptMap[k] }));
            setDepartments(deptList);
        });
        return () => unsubscribe();
    }, []);

    // Load courses
    useEffect(() => {
        const q = query(collection(db, "courses"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const coursesArray = [];
            querySnapshot.forEach((doc) => {
                coursesArray.push({ id: doc.id, ...doc.data() });
            });
            setCourses(coursesArray);
        });
        return () => unsubscribe();
    }, []);

    // Load messages for admin
    useEffect(() => {
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesArray = [];
            let unread = 0;
            querySnapshot.forEach((doc) => {
                const messageData = { id: doc.id, ...doc.data() };
                messagesArray.push(messageData);
                // Count unread messages for admin (where admin hasn't read or is new)
                if (messageData.to === 'admin' && !messageData.adminRead) {
                    unread++;
                }
            });
            setMessages(messagesArray);
            setUnreadCount(unread);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    const token = localStorage.getItem('token');
                    if (!token) {
                        navigate('/');
                    } else if (docSnap.exists()) {
                        const data = docSnap.data();
                        setAdminData({
                            name: data.fullName || "System Admin",
                            code: data.code || "ADM-001"
                        });
                    }
                } catch (error) {
                    console.error("Error fetching admin data:", error);
                }
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const totalStudents = departments.length > 0 
        ? departments.reduce((sum, dept) => sum + dept.count, 0) 
        : 1;

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.code?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const filteredCourses = useMemo(() => {
        return courses.filter(c => 
            c.courseName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.courseId?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [courses, searchQuery]);

    const studentUsers = users.filter(u => u.role === 'student');

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAdminProfileImage(reader.result);
                localStorage.setItem('admin_profile_image', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeProfileImage = () => {
        setAdminProfileImage(null);
        localStorage.removeItem('admin_profile_image');
    };

    const handleUserInputChange = (e) => {
        const { name, value } = e.target;
        setNewUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleCourseInputChange = (e) => {
        const { name, value } = e.target;
        setNewCourseData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordFields(prev => ({ ...prev, [name]: value }));
    };

    const handleAddUserSubmit = async (e) => {
        e.preventDefault();
        
        const requiredFields = ['fullName', 'email', 'password', 'role', 'phoneNumber'];
        const hasEmptyRequired = requiredFields.some(field => !newUserData[field]?.trim());
        
        if (hasEmptyRequired) {
            alert("Please fill in all required fields.");
            return;
        }

        if (newUserData.role === 'student') {
            if (!newUserData.gpa) {
                alert("GPA is required for students");
                return;
            }
            const gpa = parseFloat(newUserData.gpa);
            if (gpa < 0 || gpa > 4) {
                alert("GPA must be between 0 and 4");
                return;
            }
        }

        try {
            const response = await axios.post('http://localhost:3001/admin/add-user', newUserData);
            if (response.data.success) {
                alert("User added successfully!");
                setIsAddUserModalOpen(false);
                setNewUserData({
                    fullName: '', email: '', password: '', role: '',
                    academicYear: '', department: '', phoneNumber: '', code: '',
                    gpa: ''
                });
            }
        } catch (error) {
            alert(error.response?.data?.error || "Something went wrong");
        }
    };

    const handleAddCourseSubmit = async (e) => {
        e.preventDefault();
        const isFormValid = Object.values(newCourseData).every(value => value.trim() !== "");
        if (!isFormValid) {
            alert("Please fill in all fields.");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3001/admin/add-course', newCourseData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                alert("Course added successfully!");
                setIsAddCourseModalOpen(false);
                setNewCourseData({ courseId: '', courseName: '', instructorName: '', SelectDays: '', Time: '', RoomNumber: '', capacity: '',totalStudents:0 });
            }
        } catch (error) {
            alert(error.response?.data?.error || "Failed to add course.");
        }
    };

    const handleDelete = async (collectionName, id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await deleteDoc(doc(db, collectionName, id));
                alert("Deleted successfully!");
            } catch (error) {
                alert("Failed to delete from Database");
            }
        }
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setIsViewModalOpen(true);
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        const newValue = e.target.elements[1]?.value;
        const gpaValue = e.target.elements[2]?.value;
        
        try {
            const collectionName = selectedItem.courseName ? "courses" : "users";
            const itemRef = doc(db, collectionName, selectedItem.id);
            
            let updatedData = {};
            if (selectedItem.courseName) {
                updatedData = { 
                    courseName: selectedItem.courseName,
                    courseId: selectedItem.courseId,
                    instructorName: selectedItem.instructorName,
                    SelectDays: selectedItem.SelectDays,
                    Time: selectedItem.Time,
                    RoomNumber: newValue || selectedItem.RoomNumber,
                    capacity: selectedItem.capacity
                };
            } else {
                updatedData = { 
                    fullName: selectedItem.fullName,
                    email: selectedItem.email,
                    role: selectedItem.role,
                    department: newValue || selectedItem.department,
                    code: selectedItem.code,
                    phoneNumber: selectedItem.phoneNumber,
                    academicYear: selectedItem.academicYear,
                };
                
                if (selectedItem.role === 'student' && gpaValue) {
                    if (gpaValue < 0 || gpaValue > 4) {
                        alert("GPA must be between 0 and 4");
                        return;
                    }
                    updatedData.gpa = gpaValue;
                } else if (selectedItem.role === 'student' && selectedItem.gpa) {
                    updatedData.gpa = selectedItem.gpa;
                }
            }
            
            await updateDoc(itemRef, updatedData);
            alert("Updated successfully!");
            setIsEditModalOpen(false);
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (passwordFields.newPassword !== passwordFields.confirmPassword) {
            alert("New passwords do not match!");
            return;
        }
        try {
            const credential = EmailAuthProvider.credential(user.email, passwordFields.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordFields.newPassword);
            alert("Password updated successfully!");
            setIsPasswordModalOpen(false);
            setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            alert("Error: Check your current password.");
        }
    };

    const handleSendMessage = async () => {
        if (!selectedStudent || !messageText.trim()) {
            alert("Please select a student and enter a message");
            return;
        }

        try {
            const messageData = {
                from: 'admin',
                fromId: auth.currentUser?.uid,
                fromName: adminData.name,
                to: 'student',
                toId: selectedStudent.id,
                toName: selectedStudent.fullName,
                subject: messageSubject.trim() || 'No Subject',
                message: messageText.trim(),
                createdAt: serverTimestamp(),
                read: false,
                adminRead: true // Admin has read it since they sent it
            };

            await addDoc(collection(db, "messages"), messageData);
            
            alert("Message sent successfully!");
            setIsMessageModalOpen(false);
            setSelectedStudent(null);
            setMessageText('');
            setMessageSubject('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        }
    };

    const markMessageAsRead = async (messageId) => {
        try {
            const messageRef = doc(db, "messages", messageId);
            await updateDoc(messageRef, { adminRead: true });
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setTimeout(() => { navigate('/'); }, 1000);
    };

    const getRoleIcon = (role) => {
        switch(role) {
            case 'instructor': return <UserCheck size={18} />;
            case 'student': return <GraduationCap size={18} />;
            default: return <Users size={18} />;
        }
    };

    const getGpaColor = (gpa) => {
        if (!gpa) return '#a0aec0';
        const numGpa = parseFloat(gpa);
        if (numGpa >= 3.5) return '#48bb78';
        if (numGpa >= 2.5) return '#ecc94b';
        if (numGpa >= 2.0) return '#f56565';
        return '#ef4444';
    };

    const adminMessages = messages.filter(m => m.to === 'admin');
    const unreadAdminMessages = adminMessages.filter(m => !m.adminRead);

    return (
        <div className="dashboard-container">
            
            <aside className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
                <div className="profile-section">
                    <div className="profile-image-wrapper" onClick={() => document.getElementById('admin-profile-upload').click()}>
                        {adminProfileImage ? (
                            <img src={adminProfileImage} alt="Admin" className="profile-image" />
                        ) : (
                            <div className="profile-image-placeholder">
                                {adminData.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="profile-status-indicator"></div>
                    </div>
                    <input type="file" id="admin-profile-upload" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                    <h3 className="profile-name">{adminData.name}</h3>
                    <p className="profile-id">ID: {adminData.code}</p>
                    
                    <button 
                        className="digital-id-button"
                        onClick={() => setIsDigitalIdModalOpen(true)}
                    >
                        <Shield size={16} />
                        <span>Digital ID</span>
                    </button>
                    
                    {adminProfileImage && (
                        <button className="remove-photo-button" onClick={removeProfileImage}>Remove Photo</button>
                    )}
                </div>

                <nav className="navigation-menu">
                    <button className={`nav-button ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button className={`nav-button ${activeTab === 'All Users' ? 'active' : ''}`} onClick={() => setActiveTab('All Users')}>
                        <Users size={20} />
                        <span>All Users</span>
                    </button>
                    <button className={`nav-button ${activeTab === 'Courses' ? 'active' : ''}`} onClick={() => setActiveTab('Courses')}>
                        <BookOpen size={20} />
                        <span>Courses</span>
                    </button>
                    <button className={`nav-button ${activeTab === 'Messages' ? 'active' : ''}`} onClick={() => setActiveTab('Messages')}>
                        <MessageSquare size={20} />
                        <span>Messages</span>
                        {unreadCount > 0 && (
                            <span className="message-badge">{unreadCount}</span>
                        )}
                    </button>
                    <button className={`nav-button ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
                        <TrendingUp size={20} />
                        <span>Analytics</span>
                    </button>
                    <button className={`nav-button ${activeTab === 'Settings' ? 'active' : ''}`} onClick={() => setActiveTab('Settings')}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-button password-button" onClick={() => setIsPasswordModalOpen(true)}>
                        <Key size={18} />
                        <span>Change Password</span>
                    </button>
                    <button className="nav-button logout-button" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content-area">
                <header className="content-header">
                    <div className="page-title">
                        <button className="mobile-menu-trigger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>{activeTab}</h1>
                            <p>Welcome to Your Management System</p>
                        </div>
                    </div>
                    <div className="header-controls">
                        <div className="search-container">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search here..." 
                                className="search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="notification-button" onClick={() => setActiveTab('Messages')}>
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="notification-badge"></span>
                            )}
                        </button>
                    </div>
                </header>

                <div className="scrollable-content">
                    {activeTab === 'Dashboard' && (
                        <div className="dashboard-view">
                            <div className="quick-actions-grid">
                                <div className="action-card-item card-blue" onClick={() => setIsAddCourseModalOpen(true)}>
                                    <BookOpen size={28} />
                                    <span>New Course</span>
                                </div>
                                <div className="action-card-item card-green" onClick={() => setIsAddUserModalOpen(true)}>
                                    <Users size={28} />
                                    <span>New User</span>
                                </div>
                                <div className="action-card-item card-yellow" onClick={() => setActiveTab('Messages')}>
                                    <Send size={28} />
                                    <span>Send Message</span>
                                </div>
                                <div className="action-card-item card-red" onClick={() => setActiveTab('Settings')}>
                                    <Shield size={28} />
                                    <span>Settings</span>
                                </div>
                            </div>

                            <div className="middle-row-grid">
                                <div className="chart-card-container">
                                    <div className="card-header">
                                        <Building size={20} />
                                        <h3>Students by Department</h3>
                                    </div>
                                    <div className="department-list">
                                        {departments.length === 0 ? <p className="no-data-message">No data available</p> : (
                                            departments.map(dept => (
                                                <div className="department-item" key={dept.name}>
                                                    <div className="department-info">
                                                        <span className="department-name">{dept.name}</span>
                                                        <span className="department-count">{dept.count} Users</span>
                                                    </div>
                                                    <div className="progress-bar-bg">
                                                        <div className="progress-bar-fill" style={{ width: `${(dept.count / totalStudents) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card-container">
                                    <div className="card-header">
                                        <Bell size={20} className="text-primary" />
                                        <h3>Recent Activities</h3>
                                    </div>
                                    <div className="activity-list-container">
                                        {courses.slice(0, 3).length === 0 ? <p className="no-data-message">No recent activities</p> : (
                                            courses.slice(0, 3).map((act, i) => (
                                                <div className="activity-list-item" key={i}>
                                                    <div className="activity-icon-wrapper"><Plus size={16}/></div>
                                                    <div className="activity-text">
                                                        <h4>New course added</h4>
                                                        <p>{act.courseName}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="tables-row-grid">
                                <div className="table-card-container">
                                    <div className="table-header">
                                        <h3>Recent Users</h3>
                                        <span className="view-all-link" onClick={() => setActiveTab('All Users')}>View All</span>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Full Name</th>
                                                    <th>Role</th>
                                                    <th>GPA</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.slice(0, 4).length === 0 ? <tr><td colSpan="5" className="no-data-message">No data</td></tr> : filteredUsers.slice(0, 4).map(u => (
                                                    <tr key={u.id}>
                                                        <td className="text-muted">{u.code || '---'}</td>
                                                        <td className="text-bold">{u.fullName}</td>
                                                        <td>
                                                            <span className={`role-badge ${u.role === 'instructor' ? 'instructor-badge' : 'student-badge'}`}>
                                                                {getRoleIcon(u.role)} {u.role || 'Student'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {u.role === 'student' ? (
                                                                u.gpa ? (
                                                                    <span className="gpa-badge" style={{ backgroundColor: getGpaColor(u.gpa) + '20', color: getGpaColor(u.gpa) }}>
                                                                        <Star size={12} /> {u.gpa}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted">Not set</span>
                                                                )
                                                            ) : (
                                                                <span className="text-muted">---</span>
                                                            )}
                                                        </td>
                                                        <td className="action-buttons">
                                                            <button className="icon-button view-button" onClick={() => handleView(u)} title="View Details">
                                                                <Eye size={16}/>
                                                            </button>
                                                            <button className="icon-button edit-button" onClick={() => handleEdit(u)} title="Edit">
                                                                <Edit size={16}/>
                                                            </button>
                                                            <button className="icon-button delete-button" onClick={() => handleDelete('users', u.id)} title="Delete">
                                                                <Trash2 size={16}/>
                                                            </button>
                                                            {u.role === 'student' && (
                                                                <button className="icon-button message-button" onClick={() => {
                                                                    setSelectedStudent(u);
                                                                    setIsMessageModalOpen(true);
                                                                }} title="Send Message">
                                                                    <Mail size={16}/>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="table-card-container">
                                    <div className="table-header">
                                        <h3>Recent Courses</h3>
                                        <span className="view-all-link" onClick={() => setActiveTab('Courses')}>View All</span>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Course Name</th>
                                                    <th>Instructor</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCourses.slice(0, 4).length === 0 ? <tr><td colSpan="4" className="no-data-message">No data</td></tr> : filteredCourses.slice(0, 4).map(c => (
                                                    <tr key={c.id}>
                                                        <td className="text-muted">{c.courseId}</td>
                                                        <td className="text-primary text-bold">{c.courseName}</td>
                                                        <td>{c.instructorName}</td>
                                                        <td className="action-buttons">
                                                            <button className="icon-button view-button" onClick={() => handleView(c)} title="View Details">
                                                                <Eye size={16}/>
                                                            </button>
                                                            <button className="icon-button edit-button" onClick={() => handleEdit(c)} title="Edit">
                                                                <Edit size={16}/>
                                                            </button>
                                                            <button className="icon-button delete-button" onClick={() => handleDelete('courses', c.id)} title="Delete">
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                   
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'All Users' && (
                        <div className="table-card-container full-page">
                            <div className="table-header">
                                <div className="flex-align-center">
                                    <Users size={24} className="text-primary margin-right-2" />
                                    <h3>User Management ({filteredUsers.length})</h3>
                                </div>
                                <button className="primary-action-button" onClick={() => setIsAddUserModalOpen(true)}>
                                    <Plus size={18} /> Add User
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Full Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Department</th>
                                            <th>GPA</th>
                                            <th>Phone</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? <tr><td colSpan="8" className="no-data-message">No data</td></tr> : filteredUsers.map(u => (
                                            <tr key={u.id}>
                                                <td className="text-muted">{u.code || '---'}</td>
                                                <td className="text-bold">{u.fullName}</td>
                                                <td>{u.email}</td>
                                                <td>
                                                    <span className={`role-badge ${u.role === 'instructor' ? 'instructor-badge' : 'student-badge'}`}>
                                                        {getRoleIcon(u.role)} {u.role || 'Student'}
                                                    </span>
                                                </td>
                                                <td className="text-muted">{u.department || 'General'}</td>
                                                <td>
                                                    {u.role === 'student' ? (
                                                        u.gpa ? (
                                                            <span className="gpa-badge" style={{ backgroundColor: getGpaColor(u.gpa) + '20', color: getGpaColor(u.gpa) }}>
                                                                <Star size={12} /> {u.gpa}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">Not set</span>
                                                        )
                                                    ) : (
                                                        <span className="text-muted">---</span>
                                                    )}
                                                </td>
                                                <td>{u.phoneNumber}</td>
                                                <td className="action-buttons">
                                                    <button className="icon-button view-button" onClick={() => handleView(u)} title="View Details">
                                                        <Eye size={16}/>
                                                    </button>
                                                    <button className="icon-button edit-button" onClick={() => handleEdit(u)} title="Edit">
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button className="icon-button delete-button" onClick={() => handleDelete('users', u.id)} title="Delete">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                    {u.role === 'student' && (
                                                        <button className="icon-button message-button" onClick={() => {
                                                            setSelectedStudent(u);
                                                            setIsMessageModalOpen(true);
                                                        }} title="Send Message">
                                                            <Mail size={16}/>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Courses' && (
                        <div className="table-card-container full-page">
                            <div className="table-header">
                                <div className="flex-align-center">
                                    <BookOpen size={24} className="text-primary margin-right-2" />
                                    <h3>Course Management ({filteredCourses.length})</h3>
                                </div>
                                <button className="primary-action-button" onClick={() => setIsAddCourseModalOpen(true)}>
                                    <Plus size={18} /> Add Course
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Course Name</th>
                                            <th>Instructor</th>
                                            <th>Days</th>
                                            <th>Time</th>
                                            <th>Room</th>
                                            <th>Capacity</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCourses.length === 0 ? <tr><td colSpan="8" className="no-data-message">No data</td></tr> : filteredCourses.map(c => (
                                            <tr key={c.id}>
                                                <td className="text-muted">{c.courseId}</td>
                                                <td className="text-primary text-bold">{c.courseName}</td>
                                                <td>{c.instructorName}</td>
                                                <td><span className="day-badge">{c.SelectDays}</span></td>
                                                <td>{c.Time}</td>
                                                <td>{c.RoomNumber}</td>
                                                <td>{c.capacity}</td>
                                                <td className="action-buttons">
                                                    <button className="icon-button view-button" onClick={() => handleView(c)} title="View Details">
                                                        <Eye size={16}/>
                                                    </button>
                                                    <button className="icon-button edit-button" onClick={() => handleEdit(c)} title="Edit">
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button className="icon-button delete-button" onClick={() => handleDelete('courses', c.id)} title="Delete">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Messages' && (
                        <div className="messages-container">
                            <div className="messages-header">
                                <div className="flex-align-center">
                                    <MessageSquare size={24} className="text-primary margin-right-2" />
                                    <h3>Message Center</h3>
                                </div>
                                <button className="primary-action-button" onClick={() => {
                                    setSelectedStudent(null);
                                    setIsMessageModalOpen(true);
                                }}>
                                    <Send size={18} /> New Message
                                </button>
                            </div>

                            <div className="messages-grid">
                                {/* Compose Section */}
                                <div className="compose-message-card">
                                    <h4>Quick Message</h4>
                                    <select 
                                        className="form-input"
                                        value={selectedStudent?.id || ''}
                                        onChange={(e) => {
                                            const student = studentUsers.find(s => s.id === e.target.value);
                                            setSelectedStudent(student);
                                        }}
                                    >
                                        <option value="">Select Student</option>
                                        {studentUsers.map(s => (
                                            <option key={s.id} value={s.id}>{s.fullName} ({s.code})</option>
                                        ))}
                                    </select>
                                    <input 
                                        type="text"
                                        className="form-input"
                                        placeholder="Subject (optional)"
                                        value={messageSubject}
                                        onChange={(e) => setMessageSubject(e.target.value)}
                                    />
                                    <textarea
                                        className="form-input message-textarea"
                                        placeholder="Type your message here..."
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        rows="4"
                                    />
                                    <button 
                                        className="submit-button send-message-btn"
                                        onClick={handleSendMessage}
                                        disabled={!selectedStudent || !messageText.trim()}
                                    >
                                        <Send size={16} /> Send Message
                                    </button>
                                </div>

                                {/* Inbox Section */}
                                <div className="inbox-card">
                                    <h4>
                                        <Inbox size={18} />
                                        Inbox ({unreadAdminMessages.length} unread)
                                    </h4>
                                    <div className="messages-list">
                                        {adminMessages.length === 0 ? (
                                            <p className="no-data-message">No messages yet</p>
                                        ) : (
                                            adminMessages.map(msg => (
                                                <div 
                                                    key={msg.id} 
                                                    className={`message-item ${!msg.adminRead ? 'unread' : ''}`}
                                                    onClick={() => markMessageAsRead(msg.id)}
                                                >
                                                    <div className="message-avatar">
                                                        {msg.fromName?.charAt(0).toUpperCase() || 'S'}
                                                    </div>
                                                    <div className="message-content">
                                                        <div className="message-header">
                                                            <span className="message-sender">{msg.fromName || 'Student'}</span>
                                                            <span className="message-date">
                                                                {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Just now'}
                                                            </span>
                                                        </div>
                                                        {msg.subject && <span className="message-subject">{msg.subject}</span>}
                                                        <p className="message-text">{msg.message}</p>
                                                    </div>
                                                    {!msg.adminRead && <div className="unread-dot"></div>}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'Analytics' || activeTab === 'Settings') && (
                        <div className="under-development-page">
                            <Settings size={60} className="text-muted" />
                            <h2>This page is currently under development</h2>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Course Modal */}
            {isAddCourseModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <div className="flex-align-center">
                                <h2>Add Course</h2>
                                <BookOpen size={24} className="text-primary margin-left-2" />
                            </div>
                            <button className="close-modal-button" onClick={() => setIsAddCourseModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCourseSubmit} className="modal-form">
                            <div className="form-grid-layout">
                                <input type="text" name="courseName" className="form-input input-full-width" value={newCourseData.courseName} onChange={handleCourseInputChange} placeholder="Course Name" required />
                                <input type="text" name="courseId" className="form-input" value={newCourseData.courseId} onChange={handleCourseInputChange} placeholder="Course Code" required />
                                <input type="text" name="instructorName" className="form-input" value={newCourseData.instructorName} onChange={handleCourseInputChange} placeholder="Instructor" required />
                                <select name="SelectDays" className="form-input select-input" value={newCourseData.SelectDays} onChange={handleCourseInputChange} required>
                                    <option value="" disabled hidden>Select Day</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                </select>
                                <input type="text" name="Time" className="form-input" value={newCourseData.Time} onChange={handleCourseInputChange} placeholder="Time" required />
                                <input type="text" name="RoomNumber" className="form-input" value={newCourseData.RoomNumber} onChange={handleCourseInputChange} placeholder="Room Number" required />
                                <input type="number" name="capacity" className="form-input" value={newCourseData.capacity} onChange={handleCourseInputChange} placeholder="Capacity" required />
                            </div>
                            <div className="modal-action-buttons">
                                <button type="button" className="cancel-button" onClick={() => setIsAddCourseModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-button">Add Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <div className="flex-align-center">
                                <h2>Add User</h2>
                                <Users size={24} className="text-primary margin-left-2" />
                            </div>
                            <button className="close-modal-button" onClick={() => setIsAddUserModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUserSubmit} className="modal-form">
                            <div className="form-grid-layout">
                                <input type="text" name="fullName" className="form-input input-full-width" value={newUserData.fullName} onChange={handleUserInputChange} placeholder="Full Name" required />
                                <input type="email" name="email" className="form-input" value={newUserData.email} onChange={handleUserInputChange} placeholder="Email" required />
                                <input type="password" name="password" className="form-input" value={newUserData.password} onChange={handleUserInputChange} placeholder="Password" required />
                                
                                <select name="role" className="form-input select-input" value={newUserData.role} onChange={handleUserInputChange} required>
                                    <option value="" disabled hidden>Choose Role</option>
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                </select>
                                
                                <select name="department" className="form-input select-input" value={newUserData.department} onChange={handleUserInputChange}>
                                    <option value="" disabled hidden>Department</option>
                                    <option value="CS">CS</option>
                                    <option value="IT">IT</option>
                                    <option value="IS">IS</option>
                                    <option value="AI">AI</option>
                                    <option value="General">General</option>
                                </select>
                                
                                <input type="text" name="academicYear" className="form-input" value={newUserData.academicYear} onChange={handleUserInputChange} placeholder="Academic Year" />
                                <input type="text" name="code" className="form-input" value={newUserData.code} onChange={handleUserInputChange} placeholder="Code" />
                                <input type="tel" name="phoneNumber" className="form-input" value={newUserData.phoneNumber} onChange={handleUserInputChange} placeholder="Phone Number" required />
                                
                                {newUserData.role === 'student' && (
                                    <>
                                        <input 
                                            type="number" 
                                            name="gpa" 
                                            step="0.01" 
                                            min="0" 
                                            max="4" 
                                            className="form-input" 
                                            value={newUserData.gpa} 
                                            onChange={handleUserInputChange} 
                                            placeholder="GPA (0-4)"
                                            required
                                        />
                                        <small style={{ color: '#718096', gridColumn: 'span 2' }}>
                                            Note: GPA should be between 0 and 4
                                        </small>
                                    </>
                                )}
                            </div>
                            
                            <div className="modal-action-buttons">
                                <button type="button" className="cancel-button" onClick={() => setIsAddUserModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-button">Add User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {isMessageModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container modal-small">
                        <div className="modal-header">
                            <div className="flex-align-center">
                                <h2>Send Message</h2>
                                <Mail size={24} className="text-primary margin-left-2" />
                            </div>
                            <button className="close-modal-button" onClick={() => {
                                setIsMessageModalOpen(false);
                                setSelectedStudent(null);
                                setMessageText('');
                                setMessageSubject('');
                            }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-form">
                            <div className="form-group">
                                <label className="view-label">To:</label>
                                <select 
                                    className="form-input"
                                    value={selectedStudent?.id || ''}
                                    onChange={(e) => {
                                        const student = studentUsers.find(s => s.id === e.target.value);
                                        setSelectedStudent(student);
                                    }}
                                >
                                    <option value="">Select Student</option>
                                    {studentUsers.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="view-label">Subject (Optional):</label>
                                <input 
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter subject"
                                    value={messageSubject}
                                    onChange={(e) => setMessageSubject(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="view-label">Message:</label>
                                <textarea
                                    className="form-input message-textarea"
                                    placeholder="Type your message here..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    rows="5"
                                />
                            </div>
                            <div className="modal-action-buttons">
                                <button type="button" className="cancel-button" onClick={() => {
                                    setIsMessageModalOpen(false);
                                    setSelectedStudent(null);
                                    setMessageText('');
                                    setMessageSubject('');
                                }}>Cancel</button>
                                <button 
                                    type="button" 
                                    className="submit-button"
                                    onClick={handleSendMessage}
                                    disabled={!selectedStudent || !messageText.trim()}
                                >
                                    <Send size={16} /> Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && selectedItem && (
                <div className="modal-overlay">
                    <div className="modal-container view-modal-container">
                        <div className="view-modal-header">
                            {selectedItem.courseName ? (
                                <BookOpen size={32} />
                            ) : selectedItem.role === 'instructor' ? (
                                <UserCheck size={32} />
                            ) : (
                                <GraduationCap size={32} />
                            )}
                            <h2>
                                {selectedItem.courseName ? 'Course Details' : 
                                 selectedItem.role === 'instructor' ? 'Instructor Details' : 'Student Details'}
                            </h2>
                            <button className="close-modal-button" onClick={() => setIsViewModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        {selectedItem.courseName ? (
                            <div className="view-content">
                                <div className="view-badge course">Course</div>
                                <div className="view-grid">
                                    <div className="view-item">
                                        <div className="view-label">
                                            <BookMarked size={16} /> Course Name
                                        </div>
                                        <div className="view-value">{selectedItem.courseName}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Hash size={16} /> Course Code
                                        </div>
                                        <div className="view-value id-value">{selectedItem.courseId}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <UserCheck size={16} /> Instructor
                                        </div>
                                        <div className="view-value">{selectedItem.instructorName}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Calendar size={16} /> Day
                                        </div>
                                        <div className="view-value">{selectedItem.SelectDays}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Clock size={16} /> Time
                                        </div>
                                        <div className="view-value">{selectedItem.Time}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <DoorOpen size={16} /> Room
                                        </div>
                                        <div className="view-value">{selectedItem.RoomNumber}</div>
                                    </div>
                                    <div className="view-item view-item-full-width">
                                        <div className="view-label">
                                            <Users size={16} /> Capacity
                                        </div>
                                        <div className="view-value">{selectedItem.capacity} Students</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="view-content">
                                <div className={`view-badge ${selectedItem.role === 'instructor' ? 'instructor' : 'student'}`}>
                                    {selectedItem.role === 'instructor' ? '👨‍🏫 Instructor' : '👨‍🎓 Student'}
                                </div>
                                <div className="view-grid">
                                    <div className="view-item view-item-full-width">
                                        <div className="view-label">
                                            <Users size={16} /> Full Name
                                        </div>
                                        <div className="view-value">{selectedItem.fullName}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Mail size={16} /> Email
                                        </div>
                                        <div className="view-value">{selectedItem.email}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Hash size={16} /> ID
                                        </div>
                                        <div className="view-value id-value">{selectedItem.code}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Building size={16} /> Department
                                        </div>
                                        <div className="view-value">{selectedItem.department || 'General'}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Phone size={16} /> Phone
                                        </div>
                                        <div className="view-value">{selectedItem.phoneNumber}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label">
                                            <Calendar size={16} /> Academic Year
                                        </div>
                                        <div className="view-value">{selectedItem.academicYear || '2024'}</div>
                                    </div>
                                    {selectedItem.role === 'student' && (
                                        <div className="view-item">
                                            <div className="view-label">
                                                <Star size={16} /> GPA
                                            </div>
                                            <div className="view-value">
                                                <span style={{ color: getGpaColor(selectedItem.gpa), fontWeight: 'bold' }}>
                                                    {selectedItem.gpa || 'Not set'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="modal-action-buttons">
                            <button type="button" className="cancel-button" onClick={() => setIsViewModalOpen(false)}>Close</button>
                            <button type="button" className="submit-button" onClick={() => {
                                setIsViewModalOpen(false);
                                handleEdit(selectedItem);
                            }}>Edit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedItem && (
                <div className="modal-overlay">
                    <div className="modal-container modal-small">
                        <div className="modal-header">
                            <div className="flex-align-center">
                                <h2>Update Details</h2>
                                <Edit size={24} className="text-primary margin-left-2" />
                            </div>
                            <button className="close-modal-button" onClick={() => setIsEditModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form className="modal-form" onSubmit={handleSaveChanges}>
                            <div className="form-group">
                                <label className="view-label">Name (Read Only)</label>
                                <input type="text" className="form-input disabled-input" value={selectedItem.fullName || selectedItem.courseName} disabled />
                            </div>
                            <div className="form-group-single">
                                <label className="view-label">
                                    New {selectedItem.courseName ? 'Room Number' : 'Department'}
                                </label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    defaultValue={selectedItem.department || selectedItem.RoomNumber || ""} 
                                    placeholder={`Enter new ${selectedItem.courseName ? 'room number' : 'department'}`}
                                    required 
                                />
                            </div>
                            {!selectedItem.courseName && selectedItem.role === 'student' && (
                                <div className="form-group-single">
                                    <label className="view-label">
                                        <Star size={16} /> GPA
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0" 
                                        max="4" 
                                        className="form-input" 
                                        defaultValue={selectedItem.gpa || ""} 
                                        placeholder="GPA (0-4)"
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 4)) {
                                                selectedItem.gpa = value;
                                            }
                                        }}
                                    />
                                    <small style={{ color: '#718096' }}>GPA must be between 0 and 4</small>
                                </div>
                            )}
                            <div className="modal-action-buttons">
                                <button type="button" className="cancel-button" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-button success-button">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container modal-small">
                        <div className="modal-header">
                            <div className="flex-align-center">
                                <h2>Change Password</h2>
                                <Key size={24} className="text-primary margin-left-2" />
                            </div>
                            <button className="close-modal-button" onClick={() => setIsPasswordModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordUpdate} className="modal-form vertical-form">
                            <input 
                                type="password" 
                                name="currentPassword" 
                                required 
                                className="form-input input-full-width" 
                                value={passwordFields.currentPassword} 
                                onChange={handlePasswordInputChange} 
                                placeholder="Current Password" 
                            />
                            <input 
                                type="password" 
                                name="newPassword" 
                                required 
                                className="form-input input-full-width" 
                                value={passwordFields.newPassword} 
                                onChange={handlePasswordInputChange} 
                                placeholder="New Password" 
                            />
                            <input 
                                type="password" 
                                name="confirmPassword" 
                                required 
                                className="form-input input-full-width" 
                                value={passwordFields.confirmPassword} 
                                onChange={handlePasswordInputChange} 
                                placeholder="Confirm Password" 
                            />
                            <div className="modal-action-buttons">
                                <button type="button" className="cancel-button" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-button">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Digital ID Modal */}
            {isDigitalIdModalOpen && (
                <div className="modal-overlay" onClick={() => setIsDigitalIdModalOpen(false)}>
                    <div className="modal-container digital-id-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Admin Digital ID Card</h2>
                            <button className="close-modal-button" onClick={() => setIsDigitalIdModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="digital-id-full">
                            <div className="id-card-header">
                                <div className="id-school">
                                    <Building size={24} />
                                    <div>
                                        <h3>YallaClass University</h3>
                                        <p>Administrator Identification Card</p>
                                    </div>
                                </div>
                                <Shield size={32} className="id-shield" />
                            </div>

                            <div className="id-card-body">
                                <div className="id-photo-section">
                                    {adminProfileImage ? (
                                        <img src={adminProfileImage} alt="Admin" className="id-photo" />
                                    ) : (
                                        <div className="id-photo-placeholder">
                                            {adminData.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="id-info-section">
                                    <div className="id-field">
                                        <span className="id-field-label">Admin Name</span>
                                        <span className="id-field-value">{adminData.name}</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">Admin ID</span>
                                        <span className="id-field-value">{adminData.code}</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">Department</span>
                                        <span className="id-field-value">System Administration</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">Email</span>
                                        <span className="id-field-value">{auth.currentUser?.email || 'admin@yallaclass.com'}</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">Role</span>
                                        <span className="id-field-value role-admin">🔐 System Administrator</span>
                                    </div>
                                </div>
                            </div>

                            <div className="id-card-footer">
                                <div className="id-qr-large">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                                            JSON.stringify({
                                                id: adminData.code,
                                                name: adminData.name,
                                                email: auth.currentUser?.email,
                                                department: 'System Administration',
                                                type: 'admin',
                                                university: 'YallaClass',
                                                role: 'Administrator'
                                            })
                                        )}`}
                                        alt="Admin QR Code"
                                        className="qr-image-large"
                                    />
                                </div>
                                <div className="id-validity">
                                    <div className="id-validity-badge">
                                        <CheckCircle size={16} />
                                        <span>ADMIN ID 2026</span>
                                    </div>
                                    <p className="id-scan-text">Scan QR code to verify administrator identity</p>
                                    <p className="id-issue-date">Issued: March 2026 | Valid through: 2028</p>
                                </div>
                            </div>

                            <div className="id-actions">
                                <button className="id-download-btn" onClick={() => alert('Downloading ID Card...')}>
                                    <Download size={18} />
                                    Download ID
                                </button>
                                <button className="id-print-btn" onClick={() => window.print()}>
                                    <Eye size={18} />
                                    Print Card
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;