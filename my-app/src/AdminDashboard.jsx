import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Users, BookOpen, TrendingUp, Settings, 
    Search, Bell, LogOut, Key, Plus, Edit, Trash2, Eye, 
    Download, Shield, Building, X, Menu, Mail, Phone, Calendar,
    BookMarked, Clock, Hash, DoorOpen, UserCheck, GraduationCap
} from 'lucide-react';
import axios from 'axios';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
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

    const [adminData, setAdminData] = useState({ name: 'System Admin', code: 'ADM-001' });
    const [adminProfileImage, setAdminProfileImage] = useState(localStorage.getItem('admin_profile_image') || null);

    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [newUserData, setNewUserData] = useState({
        fullName: '', email: '', password: '', role: '',
        academicYear: '', code: '', department: '', phoneNumber: ''
    });

    const [newCourseData, setNewCourseData] = useState({
        courseId: '', courseName: '', instructorName: '',
        SelectDays: '', Time: '', RoomNumber: '', capacity: ''
    });

    const [passwordFields, setPasswordFields] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    });

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
        const hasEmptyField = Object.values(newUserData).some(value => value.trim() === "");
        if (hasEmptyField) {
            alert("Please fill in all fields.");
            return;
        }
        try {
            const response = await axios.post('http://localhost:3001/admin/add-user', newUserData);
            if (response.data.success) {
                alert("User added successfully!");
                setIsAddUserModalOpen(false);
                setNewUserData({
                    fullName: '', email: '', password: '', role: '',
                    academicYear: '', department: '', phoneNumber: '', code: '' 
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
                setNewCourseData({ courseId: '', courseName: '', instructorName: '', SelectDays: '', Time: '', RoomNumber: '', capacity: '' });
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
        const newValue = e.target.elements[1].value; 
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
                    academicYear: selectedItem.academicYear
                };
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

    return (
        <div className="admin-layout">
            
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-profile-section">
                    <div className="profile-img-container" onClick={() => document.getElementById('admin-profile-upload').click()}>
                        {adminProfileImage ? (
                            <img src={adminProfileImage} alt="Admin" className="profile-img" />
                        ) : (
                            <div className="profile-placeholder">
                                {adminData.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="profile-status"></div>
                    </div>
                    <input type="file" id="admin-profile-upload" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                    <h3 className="profile-name">{adminData.name}</h3>
                    <p className="profile-id">ID: {adminData.code}</p>
                    {adminProfileImage && (
                        <button className="remove-photo-text" onClick={removeProfileImage}>Remove Photo</button>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <button className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'All Users' ? 'active' : ''}`} onClick={() => setActiveTab('All Users')}>
                        <Users size={20} />
                        <span>All Users</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'Courses' ? 'active' : ''}`} onClick={() => setActiveTab('Courses')}>
                        <BookOpen size={20} />
                        <span>Courses</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
                        <TrendingUp size={20} />
                        <span>Analytics</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`} onClick={() => setActiveTab('Settings')}>
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

            <main className="admin-main">
                <header className="main-header">
                    <div className="header-title">
                        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>{activeTab}</h1>
                            <p>Welcome to YallaClass Management System</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <div className="search-bar">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search here..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="bell-btn">
                            <Bell size={20} />
                            <span className="bell-badge"></span>
                        </button>
                    </div>
                </header>

                <div className="content-scroll">
                    {activeTab === 'Dashboard' && (
                        <div className="dashboard-view">
                            <div className="quick-actions-row">
                                <div className="action-card blue" onClick={() => setIsAddCourseModalOpen(true)}>
                                    <BookOpen size={28} />
                                    <span>New Course</span>
                                </div>
                                <div className="action-card green" onClick={() => setIsAddUserModalOpen(true)}>
                                    <Users size={28} />
                                    <span>New User</span>
                                </div>
                                <div className="action-card yellow" onClick={() => setActiveTab('Analytics')}>
                                    <Download size={28} />
                                    <span>Reports</span>
                                </div>
                                <div className="action-card red" onClick={() => setActiveTab('Settings')}>
                                    <Shield size={28} />
                                    <span>Settings</span>
                                </div>
                            </div>

                            <div className="middle-row">
                                <div className="chart-card dept-card">
                                    <div className="card-heading">
                                        <Building size={20} />
                                        <h3>Students by Department</h3>
                                    </div>
                                    <div className="dept-list">
                                        {departments.length === 0 ? <p className="no-data">No data available</p> : (
                                            departments.map(dept => (
                                                <div className="dept-item" key={dept.name}>
                                                    <div className="dept-info">
                                                        <span className="dept-name">{dept.name}</span>
                                                        <span className="dept-count">{dept.count} Users</span>
                                                    </div>
                                                    <div className="progress-bg">
                                                        <div className="progress-fill" style={{ width: `${(dept.count / totalStudents) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card activity-card">
                                    <div className="card-heading">
                                        <Bell size={20} className="text-red" />
                                        <h3>Recent Activities</h3>
                                    </div>
                                    <div className="activity-list">
                                        {courses.slice(0, 3).length === 0 ? <p className="no-data border-dash">No recent activities</p> : (
                                            courses.slice(0, 3).map((act, i) => (
                                                <div className="activity-item" key={i}>
                                                    <div className="activity-icon"><Plus size={16}/></div>
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

                            <div className="tables-row">
                                <div className="table-card">
                                    <div className="table-header">
                                        <h3>Recent Users</h3>
                                        <span className="view-all" onClick={() => setActiveTab('All Users')}>View All</span>
                                    </div>
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Full Name</th>
                                                    <th>Role</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.slice(0, 4).length === 0 ? <tr><td colSpan="4" className="no-data">No data</td></tr> : filteredUsers.slice(0, 4).map(u => (
                                                    <tr key={u.id}>
                                                        <td className="text-muted">{u.code || '---'}</td>
                                                        <td className="fw-bold">{u.fullName}</td>
                                                        <td>
                                                            <span className={`role-badge ${u.role === 'instructor' ? 'instructor-badge' : 'student-badge'}`}>
                                                                {getRoleIcon(u.role)} {u.role || 'Student'}
                                                            </span>
                                                        </td>
                                                        <td className="actions-cell">
                                                            <button className="icon-btn view-btn" onClick={() => handleView(u)} title="View Details">
                                                                <Eye size={16}/>
                                                            </button>
                                                            <button className="icon-btn edit-btn" onClick={() => handleEdit(u)} title="Edit">
                                                                <Edit size={16}/>
                                                            </button>
                                                            <button className="icon-btn delete-btn" onClick={() => handleDelete('users', u.id)} title="Delete">
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="table-card">
                                    <div className="table-header">
                                        <h3>Recent Courses</h3>
                                        <span className="view-all" onClick={() => setActiveTab('Courses')}>View All</span>
                                    </div>
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Course Name</th>
                                                    <th>Instructor</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCourses.slice(0, 4).length === 0 ? <tr><td colSpan="4" className="no-data">No data</td></tr> : filteredCourses.slice(0, 4).map(c => (
                                                    <tr key={c.id}>
                                                        <td className="text-muted">{c.courseId}</td>
                                                        <td className="text-primary fw-bold">{c.courseName}</td>
                                                        <td>{c.instructorName}</td>
                                                        <td className="actions-cell">
                                                            <button className="icon-btn view-btn" onClick={() => handleView(c)} title="View Details">
                                                                <Eye size={16}/>
                                                            </button>
                                                            <button className="icon-btn edit-btn" onClick={() => handleEdit(c)} title="Edit">
                                                                <Edit size={16}/>
                                                            </button>
                                                            <button className="icon-btn delete-btn" onClick={() => handleDelete('courses', c.id)} title="Delete">
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
                        <div className="table-card full-page">
                            <div className="table-header">
                                <div className="flex-align">
                                    <Users size={24} className="text-primary mr-2" />
                                    <h3>User Management ({filteredUsers.length})</h3>
                                </div>
                                <button className="primary-btn" onClick={() => setIsAddUserModalOpen(true)}>
                                    <Plus size={18} /> Add User
                                </button>
                            </div>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Full Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Department</th>
                                            <th>Phone</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? <tr><td colSpan="7" className="no-data">No data</td></tr> : filteredUsers.map(u => (
                                            <tr key={u.id}>
                                                <td className="text-muted">{u.code || '---'}</td>
                                                <td className="fw-bold">{u.fullName}</td>
                                                <td>{u.email}</td>
                                                <td>
                                                    <span className={`role-badge ${u.role === 'instructor' ? 'instructor-badge' : 'student-badge'}`}>
                                                        {getRoleIcon(u.role)} {u.role || 'Student'}
                                                    </span>
                                                </td>
                                                <td className="text-muted">{u.department || 'General'}</td>
                                                <td>{u.phoneNumber}</td>
                                                <td className="actions-cell">
                                                    <button className="icon-btn view-btn" onClick={() => handleView(u)} title="View Details">
                                                        <Eye size={16}/>
                                                    </button>
                                                    <button className="icon-btn edit-btn" onClick={() => handleEdit(u)} title="Edit">
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button className="icon-btn delete-btn" onClick={() => handleDelete('users', u.id)} title="Delete">
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

                    {activeTab === 'Courses' && (
                        <div className="table-card full-page">
                            <div className="table-header">
                                <div className="flex-align">
                                    <BookOpen size={24} className="text-primary mr-2" />
                                    <h3>Course Management ({filteredCourses.length})</h3>
                                </div>
                                <button className="primary-btn" onClick={() => setIsAddCourseModalOpen(true)}>
                                    <Plus size={18} /> Add Course
                                </button>
                            </div>
                            <div className="table-wrapper">
                                <table>
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
                                        {filteredCourses.length === 0 ? <tr><td colSpan="8" className="no-data">No data</td></tr> : filteredCourses.map(c => (
                                            <tr key={c.id}>
                                                <td className="text-muted">{c.courseId}</td>
                                                <td className="text-primary fw-bold">{c.courseName}</td>
                                                <td>{c.instructorName}</td>
                                                <td><span className="day-badge">{c.SelectDays}</span></td>
                                                <td>{c.Time}</td>
                                                <td>{c.RoomNumber}</td>
                                                <td>{c.capacity}</td>
                                                <td className="actions-cell">
                                                    <button className="icon-btn view-btn" onClick={() => handleView(c)} title="View Details">
                                                        <Eye size={16}/>
                                                    </button>
                                                    <button className="icon-btn edit-btn" onClick={() => handleEdit(c)} title="Edit">
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button className="icon-btn delete-btn" onClick={() => handleDelete('courses', c.id)} title="Delete">
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

                    {(activeTab === 'Analytics' || activeTab === 'Settings') && (
                        <div className="under-development">
                            <Settings size={60} className="spin-icon text-muted" />
                            <h2>This page is currently under development</h2>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Course Modal */}
            {isAddCourseModalOpen && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-head">
                            <div className="flex-align">
                                <h2>Add Course</h2>
                                <BookOpen size={24} className="text-primary ml-2" />
                            </div>
                            <button className="close-modal" onClick={() => setIsAddCourseModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCourseSubmit} className="modal-form">
                            <div className="form-grid">
                                <input type="text" name="courseName" className="input-field full-width" value={newCourseData.courseName} onChange={handleCourseInputChange} placeholder="Course Name" required />
                                <input type="text" name="courseId" className="input-field" value={newCourseData.courseId} onChange={handleCourseInputChange} placeholder="Course Code" required />
                                <input type="text" name="instructorName" className="input-field" value={newCourseData.instructorName} onChange={handleCourseInputChange} placeholder="Instructor" required />
                                <select name="SelectDays" className="input-field select-field" value={newCourseData.SelectDays} onChange={handleCourseInputChange} required>
                                    <option value="" disabled hidden>Select Day</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                </select>
                                <input type="text" name="Time" className="input-field" value={newCourseData.Time} onChange={handleCourseInputChange} placeholder="Time" required />
                                <input type="text" name="RoomNumber" className="input-field" value={newCourseData.RoomNumber} onChange={handleCourseInputChange} placeholder="Room Number" required />
                                <input type="number" name="capacity" className="input-field" value={newCourseData.capacity} onChange={handleCourseInputChange} placeholder="Capacity" required />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsAddCourseModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-submit">Add Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-head">
                            <div className="flex-align">
                                <h2>Add User</h2>
                                <Users size={24} className="text-primary ml-2" />
                            </div>
                            <button className="close-modal" onClick={() => setIsAddUserModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUserSubmit} className="modal-form">
                            <div className="form-grid">
                                <input type="text" name="fullName" className="input-field full-width" value={newUserData.fullName} onChange={handleUserInputChange} placeholder="Full Name" required />
                                <input type="email" name="email" className="input-field" value={newUserData.email} onChange={handleUserInputChange} placeholder="Email" required />
                                <input type="password" name="password" className="input-field" value={newUserData.password} onChange={handleUserInputChange} placeholder="Password" required />
                                <select name="role" className="input-field select-field" value={newUserData.role} onChange={handleUserInputChange} required>
                                    <option value="" disabled hidden>Choose Role</option>
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <select name="department" className="input-field select-field" value={newUserData.department} onChange={handleUserInputChange}>
                                    <option value="" disabled hidden>Department</option>
                                    <option value="CS">CS</option>
                                    <option value="IT">IT</option>
                                    <option value="IS">IS</option>
                                    <option value="AI">AI</option>
                                    <option value="General">General</option>
                                </select>
                                <input type="text" name="academicYear" className="input-field" value={newUserData.academicYear} onChange={handleUserInputChange} placeholder="Academic Year" />
                                <input type="text" name="code" className="input-field" value={newUserData.code} onChange={handleUserInputChange} placeholder="Code" />
                                <input type="tel" name="phoneNumber" className="input-field full-width" value={newUserData.phoneNumber} onChange={handleUserInputChange} placeholder="Phone Number" required />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsAddUserModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-submit">Add User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && selectedItem && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal view-modal">
                        <div className="view-header">
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
                            <button className="close-modal" onClick={() => setIsViewModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        {selectedItem.courseName ? (
                            /* Course Details View */
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
                                    <div className="view-item full-width">
                                        <div className="view-label">
                                            <Users size={16} /> Capacity
                                        </div>
                                        <div className="view-value">{selectedItem.capacity} Students</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* User Details View (Student/Instructor) */
                            <div className="view-content">
                                <div className={`view-badge ${selectedItem.role === 'instructor' ? 'instructor' : 'student'}`}>
                                    {selectedItem.role === 'instructor' ? '👨‍🏫 Instructor' : '👨‍🎓 Student'}
                                </div>
                                <div className="view-grid">
                                    <div className="view-item full-width">
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
                                </div>
                            </div>
                        )}
                        
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={() => setIsViewModalOpen(false)}>Close</button>
                            <button type="button" className="btn-submit" onClick={() => {
                                setIsViewModalOpen(false);
                                handleEdit(selectedItem);
                            }}>Edit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedItem && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal small-modal">
                        <div className="modal-head">
                            <div className="flex-align">
                                <h2>Update Details</h2>
                                <Edit size={24} className="text-primary ml-2" />
                            </div>
                            <button className="close-modal" onClick={() => setIsEditModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form className="modal-form" onSubmit={handleSaveChanges}>
                            <div className="form-group">
                                <label className="view-label">Name (Read Only)</label>
                                <input type="text" className="input-field disabled-input" value={selectedItem.fullName || selectedItem.courseName} disabled />
                            </div>
                            <div className="form-group-single">
                                <label className="view-label">
                                    New {selectedItem.courseName ? 'Room Number' : 'Department'}
                                </label>
                                <input 
                                    type="text" 
                                    className="input-field" 
                                    defaultValue={selectedItem.department || selectedItem.RoomNumber || ""} 
                                    placeholder={`Enter new ${selectedItem.courseName ? 'room number' : 'department'}`}
                                    required 
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-submit success-btn">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal small-modal">
                        <div className="modal-head">
                            <div className="flex-align">
                                <h2>Change Password</h2>
                                <Key size={24} className="text-primary ml-2" />
                            </div>
                            <button className="close-modal" onClick={() => setIsPasswordModalOpen(false)}>
                                <X size={24} />
                            </button>
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
        </div>
    );
};

export default AdminDashboard;