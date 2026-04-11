import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Users, BookOpen, TrendingUp, Settings, 
    Search, Bell, LogOut, Key, Plus, Edit, Trash2, Eye, 
    Download, Shield, Building, X, Menu, Mail, Phone, Calendar,
    BookMarked, Clock, Hash, DoorOpen, UserCheck, GraduationCap,
    Star, CheckCircle, Send, MessageSquare, Inbox, PieChart,
    Activity, AlertTriangle, UserMinus, BarChart3, FileText
} from 'lucide-react';
import axios from 'axios';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, getDoc, addDoc, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from './firebase'; 
import './AdminDashboard.css';
import { subscribeToAllCoursesAttendance } from './services/firebaseAttendanceService';

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
    
    // رسائل من الأساتذة
    const [professorMessages, setProfessorMessages] = useState([]);
    const [unreadProfessorCount, setUnreadProfessorCount] = useState(0);
    const [isMessageToProfModalOpen, setIsMessageToProfModalOpen] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState(null);
    const [messageToProfText, setMessageToProfText] = useState('');
    const [messageToProfSubject, setMessageToProfSubject] = useState('');
    const [professors, setProfessors] = useState([]);
    
    // Cumulative attendance stats state
    const [cumulativeAttendanceStats, setCumulativeAttendanceStats] = useState({
        courses: [],
        overall: {
            totalCourses: 0,
            totalStudents: 0,
            totalSessions: 0,
            avgAttendanceRate: 0,
            totalPresent: 0,
            totalLate: 0,
            totalAbsent: 0
        }
    });
    const [attendanceLoading, setAttendanceLoading] = useState(true);

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

    const [isUploadingImage, setIsUploadingImage] = useState(false);

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

    // جلب الأساتذة
    useEffect(() => {
        const fetchProfessors = () => {
            const q = query(collection(db, "users"), where("role", "==", "instructor"));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const profsArray = [];
                querySnapshot.forEach((doc) => {
                    profsArray.push({ id: doc.id, ...doc.data() });
                });
                setProfessors(profsArray);
            });
            return unsubscribe;
        };
        fetchProfessors();
    }, []);

    // جلب الرسائل من الأساتذة
    useEffect(() => {
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, where("to", "==", "admin"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesArray = [];
            let unread = 0;
            querySnapshot.forEach((doc) => {
                const messageData = { id: doc.id, ...doc.data() };
                messagesArray.push(messageData);
                if (!messageData.adminRead) {
                    unread++;
                }
            });
            setProfessorMessages(messagesArray);
            setUnreadProfessorCount(unread);
        });
        
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const navbar = document.querySelector('.navbar-container');
        
        if (isDigitalIdModalOpen) {
            if (navbar) {
                navbar.style.display = 'none';
                navbar.classList.add('hidden');
            }
            document.body.style.overflow = 'hidden';
            document.body.classList.add('digital-id-open');
        } else {
            if (navbar) {
                navbar.style.display = 'flex';
                navbar.classList.remove('hidden');
            }
            document.body.style.overflow = '';
            document.body.classList.remove('digital-id-open');
        }
        
        return () => {
            const navbarCleanup = document.querySelector('.navbar-container');
            if (navbarCleanup) {
                navbarCleanup.style.display = 'flex';
                navbarCleanup.classList.remove('hidden');
            }
            document.body.style.overflow = '';
            document.body.classList.remove('digital-id-open');
        };
    }, [isDigitalIdModalOpen]);

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
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesArray = [];
            let unread = 0;
            querySnapshot.forEach((doc) => {
                const messageData = { id: doc.id, ...doc.data() };
                messagesArray.push(messageData);
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
        setAttendanceLoading(true);
        const unsubscribe = subscribeToAllCoursesAttendance((data) => {
            if (data && data.courses) {
                const transformedData = {
                    courses: data.courses.map(course => ({
                        courseId: course.courseId,
                        courseName: course.courseName,
                        courseCode: course.courseId,
                        attendanceRate: course.attendanceRate || 0,
                        totalRecords: course.totalRecords || 0,
                        presentCount: course.presentCount || 0,
                        lateCount: course.lateCount || 0,
                        absentCount: course.absentCount || 0,
                        totalStudents: course.totalStudents || 0
                    })),
                    overall: {
                        totalCourses: data.overallStats?.totalCourses || 0,
                        totalStudents: data.courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0),
                        totalSessions: data.courses.reduce((sum, c) => sum + (c.totalRecords || 0), 0),
                        avgAttendanceRate: data.overallStats?.overallAttendanceRate || 0,
                        totalPresent: data.overallStats?.totalPresent || 0,
                        totalLate: data.courses.reduce((sum, c) => sum + (c.lateCount || 0), 0),
                        totalAbsent: data.courses.reduce((sum, c) => sum + (c.absentCount || 0), 0)
                    }
                };
                setCumulativeAttendanceStats(transformedData);
            }
            setAttendanceLoading(false);
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
                        setAdminProfileImage(data.profileImage || null);
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

    const getCourseAttendanceRate = (courseId) => {
        const courseStats = cumulativeAttendanceStats.courses.find(c => c.courseId === courseId);
        return courseStats?.attendanceRate || 0;
    };
    const getAttendanceColor = (rate) => {
        if (rate >= 85) return '#28a745';
        if (rate >= 70) return '#ffc107';
        if (rate >= 50) return '#fd7e14';
        return '#dc3545';
    };
    const getAttendanceStatus = (rate) => {
        if (rate >= 85) return 'Excellent';
        if (rate >= 70) return 'Good';
        if (rate >= 50) return 'At Risk';
        return 'Critical';
    };
    const exportAttendanceReport = () => {
        if (cumulativeAttendanceStats.courses.length === 0) {
            alert("No attendance data available to export");
            return;
        }
        
        const reportData = cumulativeAttendanceStats.courses.map(course => ({
            'Course Code': course.courseCode,
            'Course Name': course.courseName,
            'Attendance Rate': `${course.attendanceRate}%`,
            'Status': getAttendanceStatus(course.attendanceRate),
            'Total Sessions': course.totalRecords,
            'Present': course.presentCount,
            'Late': course.lateCount,
            'Absent': course.absentCount,
            'Total Students': course.totalStudents
        }));
        
        const headers = Object.keys(reportData[0]);
        const csvRows = [
            headers.join(','),
            ...reportData.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        alert("Report exported successfully!");
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploadingImage(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'Lms_uploads');
            
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/dsxijrxup/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            
            if (!uploadData.secure_url) {
                throw new Error('Upload failed');
            }
            
            const user = auth.currentUser;
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                await updateDoc(userDocRef, {
                    profileImage: uploadData.secure_url
                });
                
                setAdminProfileImage(uploadData.secure_url);
                alert('Profile image updated successfully!');
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            alert('Error uploading image');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const removeProfileImage = async () => {
        if (!window.confirm('Remove your profile image?')) return;
        
        try {
            const user = auth.currentUser;
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                await updateDoc(userDocRef, {
                    profileImage: null
                });
                
                setAdminProfileImage(null);
                alert('Profile image removed');
            }
        } catch (error) {
            console.error("Error removing image:", error);
            alert('Error removing image');
        }
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
                adminRead: true
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

    const handleSendMessageToProfessor = async () => {
        if (!selectedProfessor || !messageToProfText.trim()) {
            alert("Please select a professor and enter a message");
            return;
        }

        try {
            const messageData = {
                from: 'admin',
                fromId: auth.currentUser?.uid,
                fromName: adminData.name,
                to: 'professor',
                toId: selectedProfessor.id,
                toName: selectedProfessor.fullName,
                subject: messageToProfSubject.trim() || 'No Subject',
                message: messageToProfText.trim(),
                createdAt: serverTimestamp(),
                read: false,
                adminRead: true
            };

            await addDoc(collection(db, "messages"), messageData);
            
            alert("Message sent to professor successfully!");
            setIsMessageToProfModalOpen(false);
            setSelectedProfessor(null);
            setMessageToProfText('');
            setMessageToProfSubject('');
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

    const markProfessorMessageAsRead = async (messageId) => {
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
                    <div
                        className="profile-image-wrapper"
                        onClick={() => {
                            if (!isUploadingImage) {
                                document.getElementById('admin-profile-upload').click();
                            }
                        }}
                        style={{ cursor: isUploadingImage ? 'not-allowed' : 'pointer', opacity: isUploadingImage ? 0.6 : 1 }}
                    >
                        {adminProfileImage ? (
                            <img src={adminProfileImage} alt="Admin" className="profile-image" />
                        ) : (
                            <div className="profile-image-placeholder">
                                {adminData.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {isUploadingImage && (
                            <div className="upload-overlay">
                                <div className="spinner"></div>
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
                    </button>
                    <button className={`nav-button ${activeTab === 'Attendance Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Attendance Analytics')}>
                        <BarChart3 size={20} />
                        <span>Attendance Analytics</span>
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
                        <button 
                            className="notification-button" 
                            onClick={() => {
                                setActiveTab('Messages');
                                setSelectedStudent(null);
                                setIsMessageModalOpen(true);
                            }}
                        >
                            <MessageSquare size={20} />
                            {unreadCount > 0 && (
                                <span className="notification-badge">{unreadCount}</span>
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
                                <div className="action-card-item card-yellow" onClick={() => {
                                    setActiveTab('Messages');
                                    setSelectedStudent(null);
                                    setIsMessageModalOpen(true);
                                }}>
                                    <Send size={28} />
                                    <span>Send Message</span>
                                </div>
                                <div className="action-card-item card-blue" onClick={() => setIsMessageToProfModalOpen(true)}>
                                    <MessageSquare size={28} />
                                    <span>Message Professor</span>
                                </div>
                            </div>

                            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                    <div className="stat-icon"><TrendingUp size={24} /></div>
                                    <div className="stat-info">
                                        <span className="stat-label">Avg Attendance Rate</span>
                                        <span className="stat-value">{cumulativeAttendanceStats.overall.avgAttendanceRate || 0}%</span>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                                    <div className="stat-icon"><Users size={24} /></div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total Students</span>
                                        <span className="stat-value">{cumulativeAttendanceStats.overall.totalStudents || 0}</span>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                                    <div className="stat-icon"><Activity size={24} /></div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total Sessions</span>
                                        <span className="stat-value">{cumulativeAttendanceStats.overall.totalSessions || 0}</span>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                                    <div className="stat-icon"><CheckCircle size={24} /></div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total Present</span>
                                        <span className="stat-value">{cumulativeAttendanceStats.overall.totalPresent || 0}</span>
                                    </div>
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

                            <div className="chart-card-container" style={{ marginBottom: '30px' }}>
                                <div className="card-header">
                                    <PieChart size={20} />
                                    <h3>Course Attendance Rankings</h3>
                                </div>
                                {attendanceLoading ? (
                                    <div className="loading-spinner">Loading attendance data...</div>
                                ) : cumulativeAttendanceStats.courses.length === 0 ? (
                                    <p className="no-data-message">No attendance data available yet</p>
                                ) : (
                                    <div className="courses-attendance-list">
                                        {[...cumulativeAttendanceStats.courses]
                                            .sort((a, b) => b.attendanceRate - a.attendanceRate)
                                            .slice(0, 5)
                                            .map((course, idx) => (
                                                <div className="attendance-item" key={course.courseId}>
                                                    <div className="attendance-rank">{idx + 1}</div>
                                                    <div className="attendance-course-info">
                                                        <div className="attendance-course-name">{course.courseName}</div>
                                                        <div className="attendance-course-code">{course.courseCode}</div>
                                                    </div>
                                                    <div className="attendance-stats">
                                                        <div className="attendance-percent" style={{ color: getAttendanceColor(course.attendanceRate) }}>
                                                            {course.attendanceRate}%
                                                        </div>
                                                        <div className="attendance-status" style={{ color: getAttendanceColor(course.attendanceRate) }}>
                                                            {getAttendanceStatus(course.attendanceRate)}
                                                        </div>
                                                    </div>
                                                    <div className="attendance-bar-container">
                                                        <div 
                                                            className="attendance-bar-fill" 
                                                            style={{ width: `${course.attendanceRate}%`, backgroundColor: getAttendanceColor(course.attendanceRate) }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
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
                                                    <th>Attendance</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCourses.slice(0, 4).length === 0 ? <tr><td colSpan="5" className="no-data-message">No data</td></tr> : filteredCourses.slice(0, 4).map(c => (
                                                    <tr key={c.id}>
                                                        <td className="text-muted">{c.courseId}</td>
                                                        <td className="text-primary text-bold">{c.courseName}</td>
                                                        <td>{c.instructorName}</td>
                                                        <td>
                                                            <div className="attendance-cell">
                                                                <span className="attendance-percent-small" style={{ color: getAttendanceColor(getCourseAttendanceRate(c.id)) }}>
                                                                    {getCourseAttendanceRate(c.id)}%
                                                                </span>
                                                                <div className="mini-attendance-bar">
                                                                    <div 
                                                                        className="mini-attendance-fill"
                                                                        style={{ width: `${getCourseAttendanceRate(c.id)}%`, backgroundColor: getAttendanceColor(getCourseAttendanceRate(c.id)) }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
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
                                            <th>Attendance Rate</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCourses.length === 0 ? <tr><td colSpan="9" className="no-data-message">No data</td></tr> : filteredCourses.map(c => {
                                            const attendanceRate = getCourseAttendanceRate(c.id);
                                            return (
                                                <tr key={c.id}>
                                                    <td className="text-muted">{c.courseId}</td>
                                                    <td className="text-primary text-bold">{c.courseName}</td>
                                                    <td>{c.instructorName}</td>
                                                    <td><span className="day-badge">{c.SelectDays}</span></td>
                                                    <td>{c.Time}</td>
                                                    <td>{c.RoomNumber}</td>
                                                    <td>{c.capacity}</td>
                                                    <td>
                                                        <div className="attendance-cell">
                                                            <span className="attendance-percent-small" style={{ color: getAttendanceColor(attendanceRate), fontWeight: 'bold' }}>
                                                                {attendanceRate}%
                                                            </span>
                                                            <div className="mini-attendance-bar">
                                                                <div 
                                                                    className="mini-attendance-fill"
                                                                    style={{ width: `${attendanceRate}%`, backgroundColor: getAttendanceColor(attendanceRate) }}
                                                                ></div>
                                                            </div>
                                                            <span className="attendance-status-text" style={{ color: getAttendanceColor(attendanceRate), fontSize: '11px' }}>
                                                                {getAttendanceStatus(attendanceRate)}
                                                            </span>
                                                        </div>
                                                    </td>
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
                                            );
                                        })}
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
                            </div>

                            <div className="messages-grid">
                                <div className="compose-message-card">
                                    <h4>Quick Message to Student</h4>
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

                                <div className="inbox-card">
                                    <h4>
                                        <Inbox size={18} />
                                        Messages from Students ({unreadAdminMessages.length} unread)
                                    </h4>
                                    <div className="messages-list">
                                        {adminMessages.length === 0 ? (
                                            <p className="no-data-message">No messages from students</p>
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

                            {/* قسم رسائل الأساتذة */}
                            <div className="messages-grid" style={{ marginTop: '25px' }}>
                                <div className="inbox-card">
                                    <h4>
                                        <Inbox size={18} />
                                        Messages from Professors ({unreadProfessorCount} unread)
                                    </h4>
                                    <div className="messages-list">
                                        {professorMessages.length === 0 ? (
                                            <p className="no-data-message">No messages from professors</p>
                                        ) : (
                                            professorMessages.map(msg => (
                                                <div 
                                                    key={msg.id} 
                                                    className={`message-item ${!msg.adminRead ? 'unread' : ''}`}
                                                    onClick={() => markProfessorMessageAsRead(msg.id)}
                                                >
                                                    <div className="message-avatar">
                                                        {msg.fromName?.charAt(0).toUpperCase() || 'P'}
                                                    </div>
                                                    <div className="message-content">
                                                        <div className="message-header">
                                                            <span className="message-sender">Prof. {msg.fromName || 'Professor'}</span>
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

                    {activeTab === 'Attendance Analytics' && (
                        <div className="attendance-analytics-container">
                            <div className="analytics-header">
                                <div className="flex-align-center">
                                    <BarChart3 size={28} className="text-primary margin-right-2" />
                                    <div>
                                        <h2>Attendance Analytics</h2>
                                        <p>Comprehensive attendance report for all courses</p>
                                    </div>
                                </div>
                                <button className="export-report-button" onClick={exportAttendanceReport}>
                                    <Download size={18} />
                                    Export Report
                                </button>
                            </div>

                            <div className="analytics-summary-grid">
                                <div className="summary-card">
                                    <div className="summary-icon blue"><TrendingUp size={24} /></div>
                                    <div className="summary-info">
                                        <span className="summary-label">Overall Attendance</span>
                                        <span className="summary-value">{cumulativeAttendanceStats.overall.avgAttendanceRate || 0}%</span>
                                    </div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-icon green"><BookOpen size={24} /></div>
                                    <div className="summary-info">
                                        <span className="summary-label">Total Courses</span>
                                        <span className="summary-value">{cumulativeAttendanceStats.overall.totalCourses || 0}</span>
                                    </div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-icon purple"><Users size={24} /></div>
                                    <div className="summary-info">
                                        <span className="summary-label">Total Students</span>
                                        <span className="summary-value">{cumulativeAttendanceStats.overall.totalStudents || 0}</span>
                                    </div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-icon orange"><Activity size={24} /></div>
                                    <div className="summary-info">
                                        <span className="summary-label">Total Sessions</span>
                                        <span className="summary-value">{cumulativeAttendanceStats.overall.totalSessions || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="analytics-table-container">
                                <div className="table-header">
                                    <h3>Courses Attendance Details</h3>
                                    <div className="legend">
                                        <span className="legend-dot excellent"></span>
                                        <span>Excellent (≥85%)</span>
                                        <span className="legend-dot good"></span>
                                        <span>Good (70-84%)</span>
                                        <span className="legend-dot risk"></span>
                                        <span>At Risk (50-69%)</span>
                                        <span className="legend-dot critical"></span>
                                        <span>Critical (&lt;50%)</span>
                                    </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="analytics-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Course Code</th>
                                                <th>Course Name</th>
                                                <th>Instructor</th>
                                                <th>Attendance Rate</th>
                                                <th>Status</th>
                                                <th>Sessions</th>
                                                <th>Present</th>
                                                <th>Late</th>
                                                <th>Absent</th>
                                                <th>Students</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceLoading ? (
                                                <tr><td colSpan="11" className="loading-cell">Loading attendance data...</td></tr>
                                            ) : cumulativeAttendanceStats.courses.length === 0 ? (
                                                <tr><td colSpan="11" className="no-data-cell">No attendance data available</td></tr>
                                            ) : (
                                                cumulativeAttendanceStats.courses.map((course, idx) => {
                                                    const rate = course.attendanceRate;
                                                    const status = getAttendanceStatus(rate);
                                                    const color = getAttendanceColor(rate);
                                                    const courseDetails = courses.find(c => c.id === course.courseId);
                                                    
                                                    return (
                                                        <tr key={course.courseId} className="course-row">
                                                            <td>{idx + 1}</td>
                                                            <td className="course-code">{course.courseCode}</td>
                                                            <td className="course-name">{course.courseName}</td>
                                                            <td>{courseDetails?.instructorName || 'N/A'}</td>
                                                            <td>
                                                                <div className="attendance-cell">
                                                                    <span className="attendance-rate" style={{ color: color, fontWeight: 'bold' }}>
                                                                        {rate}%
                                                                    </span>
                                                                    <div className="attendance-bar">
                                                                        <div className="attendance-fill" style={{ width: `${rate}%`, backgroundColor: color }}></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`status-badge ${status.toLowerCase().replace(' ', '-')}`} style={{ backgroundColor: color + '20', color: color }}>
                                                                    {status}
                                                                </span>
                                                            </td>
                                                            <td>{course.totalRecords || 0}</td>
                                                            <td className="present-cell">{course.presentCount || 0}</td>
                                                            <td className="late-cell">{course.lateCount || 0}</td>
                                                            <td className="absent-cell">{course.absentCount || 0}</td>
                                                            <td>{course.totalStudents || 0}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Risk Distribution - Modified Section */}
                            <div className="risk-distribution">
                                <div className="risk-header">
                                    <AlertTriangle size={20} />
                                    <h3>Risk Distribution</h3>
                                </div>
                                <div className="risk-stats">
                                    {(() => {
                                        const excellent = cumulativeAttendanceStats.courses.filter(c => c.attendanceRate >= 85).length;
                                        const good = cumulativeAttendanceStats.courses.filter(c => c.attendanceRate >= 70 && c.attendanceRate < 85).length;
                                        const risk = cumulativeAttendanceStats.courses.filter(c => c.attendanceRate >= 50 && c.attendanceRate < 70).length;
                                        const critical = cumulativeAttendanceStats.courses.filter(c => c.attendanceRate < 50).length;
                                        const total = cumulativeAttendanceStats.courses.length || 1;
                                        
                                        return (
                                            <>
                                                <div className="risk-item">
                                                    <div className="risk-label">Excellent</div>
                                                    <div className="risk-bar-container">
                                                        <div className="risk-bar">
                                                            <div 
                                                                className="excellent-bar" 
                                                                style={{ width: `${(excellent / total) * 100}%`, height: '100%', borderRadius: '14px' }}
                                                            ></div>
                                                        </div>
                                                        <span className="risk-percent">{Math.round((excellent / total) * 100)}%</span>
                                                    </div>
                                                    <div className="risk-count">{excellent} courses</div>
                                                </div>
                                                <div className="risk-item">
                                                    <div className="risk-label">Good</div>
                                                    <div className="risk-bar-container">
                                                        <div className="risk-bar">
                                                            <div 
                                                                className="good-bar" 
                                                                style={{ width: `${(good / total) * 100}%`, height: '100%', borderRadius: '14px' }}
                                                            ></div>
                                                        </div>
                                                        <span className="risk-percent">{Math.round((good / total) * 100)}%</span>
                                                    </div>
                                                    <div className="risk-count">{good} courses</div>
                                                </div>
                                                <div className="risk-item">
                                                    <div className="risk-label">At Risk</div>
                                                    <div className="risk-bar-container">
                                                        <div className="risk-bar">
                                                            <div 
                                                                className="risk-bar-fill" 
                                                                style={{ width: `${(risk / total) * 100}%`, height: '100%', borderRadius: '14px' }}
                                                            ></div>
                                                        </div>
                                                        <span className="risk-percent">{Math.round((risk / total) * 100)}%</span>
                                                    </div>
                                                    <div className="risk-count">{risk} courses</div>
                                                </div>
                                                <div className="risk-item">
                                                    <div className="risk-label">Critical</div>
                                                    <div className="risk-bar-container">
                                                        <div className="risk-bar">
                                                            <div 
                                                                className="critical-bar" 
                                                                style={{ width: `${(critical / total) * 100}%`, height: '100%', borderRadius: '14px' }}
                                                            ></div>
                                                        </div>
                                                        <span className="risk-percent">{Math.round((critical / total) * 100)}%</span>
                                                    </div>
                                                    <div className="risk-count">{critical} courses</div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
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

            {isMessageModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container modal-small">
                        <div className="modal-header">
                            <div className="flex-align-center">
                                <h2>Send Message to Student</h2>
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

            {/* Message to Professor Modal */}
            {isMessageToProfModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container modal-small">
                        <div className="modal-header">
                            <div className="flex-align-center">
                                <h2>Send Message to Professor</h2>
                                <Mail size={24} className="text-primary margin-left-2" />
                            </div>
                            <button className="close-modal-button" onClick={() => setIsMessageToProfModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-form">
                            <div className="form-group">
                                <label className="view-label">To:</label>
                                <select 
                                    className="form-input"
                                    value={selectedProfessor?.id || ''}
                                    onChange={(e) => {
                                        const prof = professors.find(p => p.id === e.target.value);
                                        setSelectedProfessor(prof);
                                    }}
                                >
                                    <option value="">Select Professor</option>
                                    {professors.map(p => (
                                        <option key={p.id} value={p.id}>{p.fullName} ({p.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="view-label">Subject (Optional):</label>
                                <input 
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter subject"
                                    value={messageToProfSubject}
                                    onChange={(e) => setMessageToProfSubject(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="view-label">Message:</label>
                                <textarea
                                    className="form-input message-textarea"
                                    placeholder="Type your message here..."
                                    value={messageToProfText}
                                    onChange={(e) => setMessageToProfText(e.target.value)}
                                    rows="5"
                                />
                            </div>
                            <div className="modal-action-buttons">
                                <button type="button" className="cancel-button" onClick={() => setIsMessageToProfModalOpen(false)}>Cancel</button>
                                <button 
                                    type="button" 
                                    className="submit-button"
                                    onClick={handleSendMessageToProfessor}
                                    disabled={!selectedProfessor || !messageToProfText.trim()}
                                >
                                    <Send size={16} /> Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                        <div className="view-label"><BookMarked size={16} /> Course Name</div>
                                        <div className="view-value">{selectedItem.courseName}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Hash size={16} /> Course Code</div>
                                        <div className="view-value id-value">{selectedItem.courseId}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><UserCheck size={16} /> Instructor</div>
                                        <div className="view-value">{selectedItem.instructorName}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Calendar size={16} /> Day</div>
                                        <div className="view-value">{selectedItem.SelectDays}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Clock size={16} /> Time</div>
                                        <div className="view-value">{selectedItem.Time}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><DoorOpen size={16} /> Room</div>
                                        <div className="view-value">{selectedItem.RoomNumber}</div>
                                    </div>
                                    <div className="view-item view-item-full-width">
                                        <div className="view-label"><Users size={16} /> Capacity</div>
                                        <div className="view-value">{selectedItem.capacity} Students</div>
                                    </div>
                                    <div className="view-item view-item-full-width">
                                        <div className="view-label"><Activity size={16} /> Attendance Rate</div>
                                        <div className="view-value">
                                            <div className="attendance-detail">
                                                <span className="attendance-percent-large" style={{ color: getAttendanceColor(getCourseAttendanceRate(selectedItem.id)), fontSize: '24px', fontWeight: 'bold' }}>
                                                    {getCourseAttendanceRate(selectedItem.id)}%
                                                </span>
                                                <div className="attendance-status-large" style={{ color: getAttendanceColor(getCourseAttendanceRate(selectedItem.id)) }}>
                                                    {getAttendanceStatus(getCourseAttendanceRate(selectedItem.id))}
                                                </div>
                                                <div className="attendance-bar-large" style={{ marginTop: '10px' }}>
                                                    <div 
                                                        className="attendance-bar-fill-large"
                                                        style={{ width: `${getCourseAttendanceRate(selectedItem.id)}%`, backgroundColor: getAttendanceColor(getCourseAttendanceRate(selectedItem.id)), height: '8px', borderRadius: '4px' }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
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
                                        <div className="view-label"><Users size={16} /> Full Name</div>
                                        <div className="view-value">{selectedItem.fullName}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Mail size={16} /> Email</div>
                                        <div className="view-value">{selectedItem.email}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Hash size={16} /> ID</div>
                                        <div className="view-value id-value">{selectedItem.code}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Building size={16} /> Department</div>
                                        <div className="view-value">{selectedItem.department || 'General'}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Phone size={16} /> Phone</div>
                                        <div className="view-value">{selectedItem.phoneNumber}</div>
                                    </div>
                                    <div className="view-item">
                                        <div className="view-label"><Calendar size={16} /> Academic Year</div>
                                        <div className="view-value">{selectedItem.academicYear || '2024'}</div>
                                    </div>
                                    {selectedItem.role === 'student' && (
                                        <div className="view-item">
                                            <div className="view-label"><Star size={16} /> GPA</div>
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
                                    <label className="view-label"><Star size={16} /> GPA</label>
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
                        <div className="digital-id-full new-design">
                            <div className="id-card-header new-header">
                                <div className="university-badge">
                                    <div className="university-icon">
                                        <GraduationCap size={28} />
                                    </div>
                                    <div className="university-text">
                                        <h3>Cairo University</h3>
                                        <p>Student Identification Card</p>
                                    </div>
                                </div>
                            </div>

                            <div className="id-card-body new-body">
                                <div className="id-info-section new-info">
                                    <div className="id-field">
                                        <span className="id-field-label">STUDENT NAME</span>
                                        <span className="id-field-value">{adminData.name}</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">STUDENT ID</span>
                                        <span className="id-field-value id-value">{adminData.code}</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">DEPARTMENT</span>
                                        <span className="id-field-value">CS</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">ACADEMIC YEAR</span>
                                        <span className="id-field-value">2024</span>
                                    </div>
                                    <div className="id-field">
                                        <span className="id-field-label">EMAIL</span>
                                        <span className="id-field-value">{auth.currentUser?.email || 'student.yallaclass@gmail.com'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="id-card-footer new-footer">
                                <div className="qr-section">
                                    <div className="qr-code-box">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                                                JSON.stringify({
                                                    id: adminData.code,
                                                    name: adminData.name,
                                                    email: auth.currentUser?.email,
                                                    department: 'CS',
                                                    type: 'student',
                                                    university: 'Cairo University'
                                                })
                                            )}`}
                                            alt="QR Code"
                                            className="qr-image"
                                        />
                                    </div>
                                    <div className="qr-label">QR Code</div>
                                </div>
                                
                                <div className="validity-section">
                                    <div className="validity-badge">
                                        <CheckCircle size={14} />
                                        <span>VALID ID 2026</span>
                                    </div>
                                    <p className="scan-text">Scan QR code to verify identity</p>
                                    <p className="issue-date">Issued: March 2026</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;