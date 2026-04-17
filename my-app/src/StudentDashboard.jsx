import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StudentDashboard.css';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Users, BookOpen, TrendingUp, Settings, 
    Search, Bell, LogOut, Key, Plus, Edit, Trash2, Eye, 
    Download, Shield, Building, X, Menu, User, Calendar,
    Clock, MapPin, CheckCircle, AlertCircle, AlertTriangle,
    BookPlus, GraduationCap, FileText, Video, MessageSquare, Award, Zap, Upload,
    Mail, Inbox, UserCheck, Send
} from 'lucide-react';

import { auth, db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, orderBy, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { attendanceAPI } from './services/api';
import firebaseAttendanceService, { 
    subscribeToStudentAttendance, 
    getStudentOverallAttendance,
    getAttendanceRiskLevel 
} from './services/firebaseAttendanceService';

const STORAGE_KEYS = {
    USER: 'yallaclass_user',
    COURSES: 'yallaclass_courses',
    UPCOMING: 'yallaclass_upcoming',
    ATTENDANCE: 'yallaclass_attendance',
    TREND: 'yallaclass_trend'
};

const CLOUDINARY_CLOUD_NAME = 'dsxijrxup'; 
const CLOUDINARY_UPLOAD_PRESET = 'Lms_uploads';

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
    
   const [courses, setCourses] = useState(() => {
    // حاول تقرأ الكورسات القديمة من الكاش عشان الصفحة متبقاش فاضية أول ما تفتح
    const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
    return saved ? JSON.parse(saved) : [];
});
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
    const [isDigitalIdModalOpen, setIsDigitalIdModalOpen] = useState(false);
    const [selectedRiskCourse, setSelectedRiskCourse] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Messages States
    const [studentMessages, setStudentMessages] = useState([]);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isMessageToAdminModalOpen, setIsMessageToAdminModalOpen] = useState(false);
    const [isMessageToProfessorModalOpen, setIsMessageToProfessorModalOpen] = useState(false);
    const [messageToAdminText, setMessageToAdminText] = useState('');
    const [messageToAdminSubject, setMessageToAdminSubject] = useState('');
    const [messageToProfessorText, setMessageToProfessorText] = useState('');
    const [messageToProfessorSubject, setMessageToProfessorSubject] = useState('');
    const [selectedProfessor, setSelectedProfessor] = useState(null);
    const [professorsList, setProfessorsList] = useState([]);
    
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

    // ========== LMS States ==========
    const [lmsMaterials, setLmsMaterials] = useState([]);
    const [lmsAssignments, setLmsAssignments] = useState([]);
    const [lmsQuizzes, setLmsQuizzes] = useState([]);
    const [lmsDiscussions, setLmsDiscussions] = useState([]);
    const [selectedCourseForLMS, setSelectedCourseForLMS] = useState(null);
    const [activeLmsTab, setActiveLmsTab] = useState('materials');
    const [isLmsModalOpen, setIsLmsModalOpen] = useState(false);
    const [lmsModalType, setLmsModalType] = useState('');
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissionFile, setSubmissionFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // ========== جلب الرسائل ==========
    useEffect(() => {
        if (!auth.currentUser) return;
        
        const messagesRef = collection(db, "messages");
        const q = query(
            messagesRef, 
            where("toId", "==", auth.currentUser.uid),
            orderBy("createdAt", "desc")
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesArray = [];
            let unread = 0;
            querySnapshot.forEach((doc) => {
                const messageData = { id: doc.id, ...doc.data() };
                messagesArray.push(messageData);
                if (!messageData.read) {
                    unread++;
                }
            });
            setStudentMessages(messagesArray);
            setUnreadMessageCount(unread);
        });
        
        return () => unsubscribe();
    }, []);

    // ========== جلب الأساتذة من الكورسات ==========
  // ========== جلب الأساتذة من الكورسات ==========
    useEffect(() => {
        const fetchProfessors = async () => {
            if (courses.length > 0) {
                const profsArray = [];
                for (let course of courses) {
                    if (course.instructor && course.instructor !== 'TBA' && course.instructor !== 'Loading...') {
                        // بنتأكد إننا مضفناش الكورس ده قبل كده
                        if (!profsArray.find(p => p.courseId === course.id)) {
                            let profId = course.id; // حل بديل مؤقت
                            try {
                                // بنبحث في جدول الكورسات الخاصة بالدكاترة باستخدام الـ courseId
                                const q = query(collection(db, "professorCourses"), where("courseId", "==", course.id));
                                const querySnapshot = await getDocs(q);
                                
                                if (!querySnapshot.empty) {
                                    // لو لقينا الكورس، بنسحب الـ ID الحقيقي بتاع الدكتور
                                    profId = querySnapshot.docs[0].data().professorId; 
                                }
                            } catch (error) {
                                console.error("Error fetching professor ID:", error);
                            }

                            // بنمنع تكرار نفس الدكتور في القائمة لو بيدرس كذا كورس للطالب
                            if (!profsArray.find(p => p.id === profId)) {
                                profsArray.push({
                                    id: profId,
                                    name: course.instructor,
                                    courseName: course.name,
                                    courseId: course.id
                                });
                            }
                        }
                    }
                }
                setProfessorsList(profsArray);
            }
        };
        
        fetchProfessors();
    }, [courses]);

    // ========== وظائف الرسائل ==========
    const markMessageAsRead = async (messageId) => {
        try {
            const messageRef = doc(db, "messages", messageId);
            await updateDoc(messageRef, { read: true });
            setUnreadMessageCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    };

    const handleSendMessageToAdmin = async () => {
        if (!messageToAdminText.trim()) {
            showNotification("Please enter a message", 'error');
            return;
        }

        try {
            const messageData = {
                from: 'student',
                fromId: auth.currentUser?.uid,
                fromName: studentData.name,
                to: 'admin',
                toId: 'admin',
                toName: 'System Admin',
                subject: messageToAdminSubject.trim() || 'No Subject',
                message: messageToAdminText.trim(),
                createdAt: serverTimestamp(),
                read: false,
                adminRead: false
            };

            await addDoc(collection(db, "messages"), messageData);
            
            showNotification("Message sent to Admin successfully!", 'success');
            setIsMessageToAdminModalOpen(false);
            setMessageToAdminText('');
            setMessageToAdminSubject('');
        } catch (error) {
            console.error("Error sending message:", error);
            showNotification("Failed to send message", 'error');
        }
    };

    const handleSendMessageToProfessor = async () => {
        if (!selectedProfessor || !messageToProfessorText.trim()) {
            showNotification("Please select a professor and enter a message", 'error');
            return;
        }

        try {
            const messageData = {
                from: 'student',
                fromId: auth.currentUser?.uid,
                fromName: studentData.name,
                to: 'professor',
                toId: selectedProfessor.id,
                toName: selectedProfessor.name,
                subject: messageToProfessorSubject.trim() || 'No Subject',
                message: messageToProfessorText.trim(),
                createdAt: serverTimestamp(),
                read: false,
                adminRead: true
            };

            await addDoc(collection(db, "messages"), messageData);
            
            showNotification(`Message sent to Professor ${selectedProfessor.name} successfully!`, 'success');
            setIsMessageToProfessorModalOpen(false);
            setSelectedProfessor(null);
            setMessageToProfessorText('');
            setMessageToProfessorSubject('');
        } catch (error) {
            console.error("Error sending message:", error);
            showNotification("Failed to send message", 'error');
        }
    };

    const getMessageSenderIcon = (from) => {
        if (from === 'admin') return '👨‍💼';
        if (from === 'professor') return '👨‍🏫';
        return '📧';
    };

    const getMessageSenderName = (msg) => {
        if (msg.from === 'admin') return `Admin (${msg.fromName || 'System'})`;
        if (msg.from === 'professor') return `Prof. ${msg.fromName || 'Professor'}`;
        return msg.fromName || 'Unknown';
    };
    // =================================

    // ========== LMS Functions ==========
    const fetchLMSMaterials = async (courseId) => {
        try {
            const q = query(collection(db, "lms_materials"), where("courseId", "==", courseId));
            const snapshot = await getDocs(q);
            const materials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLmsMaterials(materials);
        } catch (error) {
            console.error("Error fetching materials:", error);
            setLmsMaterials([]);
        }
    };

    const fetchLMSAssignments = async (courseId) => {
        try {
            const q = query(collection(db, "lms_assignments"), where("courseId", "==", courseId));
            const snapshot = await getDocs(q);
            const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const user = auth.currentUser;
            if (user) {
                for (let assignment of assignments) {
                    const submissionQuery = query(
                        collection(db, "lms_submissions"),
                        where("assignmentId", "==", assignment.id),
                        where("studentId", "==", user.uid)
                    );
                    const submissionSnap = await getDocs(submissionQuery);
                    if (!submissionSnap.empty) {
                        assignment.submitted = true;
                        assignment.submission = submissionSnap.docs[0].data();
                    } else {
                        assignment.submitted = false;
                    }
                }
            }
            
            setLmsAssignments(assignments);
        } catch (error) {
            console.error("Error fetching assignments:", error);
            setLmsAssignments([]);
        }
    };

    const fetchLMSQuizzes = async (courseId) => {
        try {
            const q = query(collection(db, "lms_quizzes"), where("courseId", "==", courseId));
            const snapshot = await getDocs(q);
            const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLmsQuizzes(quizzes);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setLmsQuizzes([]);
        }
    };

    const fetchLMSDiscussions = async (courseId) => {
        try {
            const q = query(collection(db, "lms_discussions"), where("courseId", "==", courseId));
            const snapshot = await getDocs(q);
            const discussions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLmsDiscussions(discussions);
        } catch (error) {
            console.error("Error fetching discussions:", error);
            setLmsDiscussions([]);
        }
    };

    useEffect(() => {
        if (selectedCourseForLMS) {
            fetchLMSMaterials(selectedCourseForLMS.id);
            fetchLMSAssignments(selectedCourseForLMS.id);
            fetchLMSQuizzes(selectedCourseForLMS.id);
            fetchLMSDiscussions(selectedCourseForLMS.id);
        }
    }, [selectedCourseForLMS]);

    const handleAssignmentSubmit = async () => {
        if (!submissionFile) {
            showNotification('Please select a file to submit', 'error');
            return;
        }
        
        setIsSubmitting(true);
        const user = auth.currentUser;
        
        try {
            const formData = new FormData();
            formData.append('file', submissionFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            
            if (!uploadData.secure_url) {
                throw new Error('Upload failed');
            }
            
            await addDoc(collection(db, "lms_submissions"), {
                assignmentId: selectedAssignment.id,
                assignmentTitle: selectedAssignment.title,
                courseId: selectedCourseForLMS.id,
                studentId: user.uid,
                studentCode: studentData.id,
                studentName: studentData.name,
                fileUrl: uploadData.secure_url,
                fileName: submissionFile.name,
                submittedAt: new Date().toISOString(),
                grade: null,
                feedback: ''
            });
            
            showNotification('Assignment submitted successfully!', 'success');
            setIsLmsModalOpen(false);
            setSubmissionFile(null);
            setSelectedAssignment(null);
            fetchLMSAssignments(selectedCourseForLMS.id);
            
        } catch (error) {
            console.error("Error submitting assignment:", error);
            showNotification('Error submitting assignment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const navigate = useNavigate();
    
    useEffect(() => {
        const event = isDigitalIdModalOpen ? 'openDigitalID' : 'closeDigitalID';
        window.dispatchEvent(new Event(event));
        
        if (isDigitalIdModalOpen) {
            document.body.classList.add('digital-id-open');
        } else {
            document.body.classList.remove('digital-id-open');
        }
        
        return () => {
            document.body.classList.remove('digital-id-open');
        };
    }, [isDigitalIdModalOpen]);

    // Real-time attendance subscription ref
    const [attendanceUnsubscribe, setAttendanceUnsubscribe] = useState(null);

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
                            profileImage: userData.profileImage || null,
                            gpa: userData.gpa || 0
                        }));
                        
                        await loadStudentCourses(user.uid);
                        await loadAvailableCourses();
                        
                        // Set up real-time attendance subscription
                        setupRealTimeAttendance(user.uid);

                        const currentRisk = userData.riskLevel || "Low Risk"; 
                        if (currentRisk === "High Risk" || currentRisk === "Medium Risk") {
                            console.log("Student is at risk, notifying server...");
                            updateRiskOnServer(user.uid, currentRisk);
                        } else {
                            console.log("Student is safe, no server update needed.");
                        }
                    }
                } catch (error) {
                    console.error("Error fetching student data:", error);
                }
            } else {
                // Cleanup attendance subscription on logout
                if (attendanceUnsubscribe) {
                    attendanceUnsubscribe();
                }
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // Set up real-time attendance tracking from Firebase
    const setupRealTimeAttendance = (userId) => {
        // Unsubscribe from previous subscription if exists
        if (attendanceUnsubscribe) {
            attendanceUnsubscribe();
        }

        const unsubscribe = subscribeToStudentAttendance(userId, (coursesWithAttendance) => {
            if (coursesWithAttendance.length > 0) {
                // Update courses with real Firebase attendance data
                setCourses(prevCourses => {
                    return prevCourses.map(course => {
                        const firebaseCourse = coursesWithAttendance.find(fc => fc.id === course.id);
                        if (firebaseCourse) {
                            return {
                                ...course,
                                attendanceRate: firebaseCourse.attendanceRate,
                                absenceRate: firebaseCourse.absenceRate,
                                presentCount: firebaseCourse.presentCount,
                                absentCount: firebaseCourse.absentCount,
                                lateCount: firebaseCourse.lateCount,
                                totalSessions: firebaseCourse.totalRecords,
                                attendanceRecords: firebaseCourse.records || []
                            };
                        }
                        return course;
                    });
                });

                // Update overall attendance from Firebase data
                const totalPresent = coursesWithAttendance.reduce((sum, c) => sum + c.presentCount, 0);
                const totalRecords = coursesWithAttendance.reduce((sum, c) => sum + c.totalRecords, 0);
                const overallRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
                setStudentData(prev => ({
                    ...prev,
                    overallAttendance: overallRate
                }));
            }
        });

        setAttendanceUnsubscribe(() => unsubscribe);
    };

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            if (attendanceUnsubscribe) {
                attendanceUnsubscribe();
            }
        };
    }, []);
     // أضف هذا الـ useEffect بعد الـ useEffect الخاص بـ onAuthStateChanged
useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // مراقبة تغييرات user document في Firestore
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            const enrolledCourses = userData.enrolledCourses || [];
            
            // إذا تغير عدد الكورسات، نعيد تحميلها
            if (enrolledCourses.length !== courses.length) {
                console.log("Courses changed, reloading...");
                loadStudentCourses(user.uid);
            }
        }
    });

    return () => unsubscribe();
}, [auth.currentUser]);


    // ========== ATTENDANCE TRACKING FUNCTIONS ==========
    const fetchStudentCoursesWithAttendance = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/student/${user.uid}/courses-attendance`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.courses) {
                setCourses(prevCourses => {
                    const updatedCourses = prevCourses.map(course => {
                        const serverCourse = data.courses.find(sc => sc.id === course.id);
                        if (serverCourse) {
                            return {
                                ...course,
                                attendanceRate: serverCourse.attendanceRate,
                                absenceRate: serverCourse.absenceRate,
                                presentCount: serverCourse.presentCount,
                                absentCount: serverCourse.absentCount,
                                lateCount: serverCourse.lateCount,
                                totalSessions: serverCourse.totalSessions
                            };
                        }
                        return course;
                    });
                    return updatedCourses;
                });
            }
        } catch (error) {
            console.error("Error fetching student courses attendance:", error);
        }
    };

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

        // جلب بيانات الكورسات
        const coursesRef = collection(db, "courses");
        const enrolledCourses = [];
        
        for (const courseId of enrolledCourseIds) {
            try {
                // البحث عن الكورس باستخدام courseId
                const courseQuery = query(coursesRef, where("courseId", "==", courseId));
                const courseSnap = await getDocs(courseQuery);
                
                if (!courseSnap.empty) {
                    courseSnap.forEach((doc) => {
                        const courseData = doc.data();
                        
                        // حساب attendance rate من السجلات الحقيقية
                        let attendanceRate = 75; // قيمة افتراضية
                        
                        enrolledCourses.push({
                            id: courseData.courseId,
                            courseId: courseData.courseId,
                            name: courseData.courseName,
                            instructor: courseData.instructorName,
                            schedule: `${courseData.SelectDays || 'TBA'} ${courseData.Time || ''}`,
                            days: courseData.SelectDays ? courseData.SelectDays.split(', ') : [],
                            time: courseData.Time || 'TBA',
                            room: courseData.RoomNumber || 'TBA',
                            students: parseInt(courseData.capacity) || 0,
                            attendanceRate: attendanceRate,
                            absenceRate: 100 - attendanceRate,
                            presentCount: 0,
                            absentCount: 0,
                            lateCount: 0,
                            totalSessions: 0,
                            checkedIn: false,
                            timeRemaining: 0,
                            grades: Math.floor(Math.random() * 30) + 70,
                            timeliness: Math.floor(Math.random() * 50) + 50,
                            riskScore: calculateRiskScore(attendanceRate, 75, userData.gpa || 3.0, 75),
                        });
                        
                        // إضافة riskLevel لكل كورس
                        enrolledCourses[enrolledCourses.length - 1].riskLevel = 
                            getRiskLevel(enrolledCourses[enrolledCourses.length - 1].riskScore);
                    });
                } else {
                    console.warn(`Course ${courseId} not found in courses collection`);
                }
            } catch (err) {
                console.error(`Error loading course ${courseId}:`, err);
            }
        }
        
        console.log("Loaded courses:", enrolledCourses); // للتأكد من تحميل الكورسات
        setCourses(enrolledCourses);
        setStudentData(prev => ({
            ...prev,
            enrolledCourses: enrolledCourses.length
        }));
        
        // تحديث upcoming classes
        const upcomingClasses = enrolledCourses.slice(0, 3).map((c, index) => ({
            id: index + 1,
            name: c.name,
            time: c.time,
            room: c.room,
            date: index === 0 ? "Today" : index === 1 ? "Today" : "Tomorrow",
            courseId: c.id
        }));
        setUpcoming(upcomingClasses);
        
        // تحديث trend data
        const trendData = enrolledCourses.map((c, idx) => ({
            week: `W${idx + 1}`,
            rate: c.riskScore
        }));
        setTrend(trendData);
        
        // جلب بيانات الحضور
        await fetchStudentCoursesWithAttendance();
        
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

        // التحقق من العدد
        if (courses.length >= 5) {
            showNotification('You can only enroll in up to 5 courses', 'error');
            return;
        }

        // التحقق من التكرار
        const courseIdentifier = course.courseId || course.id;
        if (courses.some(c => (c.courseId || c.id) === courseIdentifier)) {
            showNotification('You are already enrolled in this course', 'error');
            return;
        }

        setLoading(true);

        // 1. تحديث Firestore أولاً
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            enrolledCourses: arrayUnion(courseIdentifier)
        });

        // 2. إرسال للـ Backend للتسجيل الرسمي
        try {
            const response = await axios.post('http://localhost:3001/api/enroll-course', {
                studentId: user.uid,  // تم التصحيح من studentUid إلى studentId
                courseId: courseIdentifier
            });

            if (response.data.success) {
                console.log("Server enrollment successful");
            }
        } catch (apiError) {
            console.warn("Server enrollment failed but Firestore updated:", apiError);
            // نكمل عادي لأن Firestore اتحدث
        }

        // 3. إنشاء سجل في مجموعة enrollments في Firestore
        try {
            const enrollmentData = {
                studentId: user.uid,
                courseId: courseIdentifier,
                studentName: studentData.name,
                studentCode: studentData.id,
                studentEmail: studentData.email,
                enrolledAt: new Date().toISOString(),
                status: "active"
            };
            
            await addDoc(collection(db, "enrollments"), enrollmentData);
        } catch (enrollError) {
            console.warn("Could not create enrollment record:", enrollError);
        }

        // 4. تحديث الـ UI
        const attendanceRate = Math.floor(Math.random() * 40) + 60;
        const grades = Math.floor(Math.random() * 30) + 70;
        const timeliness = Math.floor(Math.random() * 50) + 50;
        
        const riskScore = calculateRiskScore(
            attendanceRate, 
            grades, 
            studentData.gpa, 
            timeliness
        );
        
        const newCourse = {
            ...course,
            id: courseIdentifier,
            courseId: courseIdentifier,
            students: (course.enrolled || 0) + 1,
            attendanceRate: attendanceRate,
            absenceRate: 100 - attendanceRate,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            totalSessions: 0,
            checkedIn: false,
            timeRemaining: 0,
            grades: grades,
            timeliness: timeliness,
            riskScore: riskScore,
            riskLevel: getRiskLevel(riskScore)
        };

        setCourses(prev => [...prev, newCourse]);
        setStudentData(prev => ({
            ...prev,
            enrolledCourses: (prev.enrolledCourses || 0) + 1
        }));

        // تحديث القوائم
        const upcomingClasses = [...upcoming, {
            id: upcoming.length + 1,
            name: course.name || course.courseName,
            time: course.time || 'TBA',
            room: course.room || 'TBA',
            date: "Today",
            courseId: courseIdentifier
        }];
        setUpcoming(upcomingClasses);

        showNotification(`Successfully enrolled in ${course.courseName || course.name}`, 'success');
        setIsAddCourseModalOpen(false);
        
        setTimeout(() => {
            loadStudentCourses(user.uid);
        }, 500);

    } catch (error) {
        console.error("Error adding course:", error);
        const errorMsg = error.response?.data?.error || 'Error enrolling in course';
        showNotification(errorMsg, 'error');
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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return; 
        setIsUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
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
                setStudentData(prev => ({
                    ...prev,
                    profileImage: uploadData.secure_url
                }));
                
                showNotification('Profile image updated successfully!', 'success');
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            showNotification('Error uploading image', 'error');
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
                
                setStudentData(prev => ({
                    ...prev,
                    profileImage: null
                }));
                
                showNotification('Profile image removed', 'success');
            }
        } catch (error) {
            console.error("Error removing image:", error);
            showNotification('Error removing image', 'error');
        }
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

    const handleCheckIn = async (courseId) => {
        setCourses(prev => {
            const updatedCourses = prev.map(c => {
                if (c.id === courseId && !c.checkedIn) {
                    const newAttendanceRate = Math.min(100, c.attendanceRate + 5);
                    const newRiskScore = calculateRiskScore(
                        newAttendanceRate,
                        c.grades,
                        studentData.gpa,
                        c.timeliness
                    );
                    
                    showNotification(`Checked in to ${c.name}. Risk score updated to ${newRiskScore}`);
                    
                    return { 
                        ...c, 
                        checkedIn: true, 
                        attendanceRate: newAttendanceRate,
                        absenceRate: 100 - newAttendanceRate,
                        riskScore: newRiskScore,
                        riskLevel: getRiskLevel(newRiskScore)
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
                if (riskLevel === "High Risk") {
                    showNotification("Alert: High risk level detected due to low attendance!", "error");
                } else if (riskLevel === "Medium Risk") {
                    showNotification("Warning: Your risk level is now Medium. Stay consistent!", "warning");
                } else {
                    showNotification("Status Check: Risk level updated successfully.", "success");
                }
            } else {
                console.error("Server update failed: ", data.error);
            }
        } catch (error) {
            console.error("Error connecting to backend:", error);
        }
    };
    
    const openDigitalID = () => {
        setIsDigitalIdModalOpen(true);
        const navbar = document.querySelector('.navbar-container');
        if (navbar) {
            navbar.style.display = 'none';
        }
    };

    const closeDigitalID = () => {
        setIsDigitalIdModalOpen(false);
        const navbar = document.querySelector('.navbar-container');
        if (navbar) {
            navbar.style.display = 'flex';
        }
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
                    <div
                        className="student-profile-image-wrapper"
                        onClick={() => {
                            if (!isUploadingImage) {
                                document.getElementById('student-profile-upload').click();
                            }
                        }}
                        style={{ cursor: isUploadingImage ? 'not-allowed' : 'pointer', opacity: isUploadingImage ? 0.6 : 1 }}
                    >
                        {isUploadingImage && (
                            <div className="student-upload-overlay">
                                <div className="student-spinner"></div>
                            </div>
                        )}

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
                    
                    <button 
                        className="student-digital-id-button"
                        onClick={openDigitalID}
                    >
                        <Shield size={16} />
                        <span>Digital ID</span>
                    </button>

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
                        className={`student-nav-button ${activeTab === 'Profile' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Profile')}
                    >
                        <User size={20} />
                        <span>Profile</span>
                    </button>
                    <button 
                        className={`student-nav-button ${activeTab === 'LMS' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('LMS')}
                    >
                        <GraduationCap size={20} />
                        <span>L.M.S.</span>
                    </button>
                    <button 
                        className={`student-nav-button ${activeTab === 'Messages' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('Messages')}
                    >
                        <MessageSquare size={20} />
                        <span>Messages</span>
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
                        <button className="student-notification-button" onClick={() => setIsMessagesModalOpen(true)}>
                            <Bell size={20} />
                            {unreadMessageCount > 0 && (
                                <span className="student-notification-badge">{unreadMessageCount}</span>
                            )}
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
                                                   <div className="student-risk-mini-badge" style={{ 
                                                         backgroundColor: `${course?.riskLevel?.color || '#888888'}20`, 
                                                           color: course?.riskLevel?.color || '#888888' 
                                                        }}>
                                                            {course?.riskLevel?.icon || '⚠️'} {course?.riskScore || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="student-table-card">
                                    <div className="student-table-header">
                                        <h3>Risk Score Trend</h3>
                                        <span className="student-view-all-link" onClick={viewAttendanceHistory}>
                                            View Details
                                        </span>
                                    </div>
                                    <div className="student-trend-mini">
                                        <div className="student-chart-bars">
                                            {trend.slice(-4).map((week, index) => (
                                                <div key={index} className="student-bar-wrapper">
                                                    <div className="student-bar" style={{ height: `${week.rate}px`, backgroundColor: week.rate < 40 ? '#ef4444' : week.rate < 60 ? '#f59e0b' : week.rate < 80 ? '#10b981' : '#3b82f6' }}></div>
                                                    <span className="student-bar-label">{week.rate}</span>
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
                                                        className="student-view-risk-button"
                                                        onClick={() => viewRiskDetails(course)}
                                                        title="View Risk Details"
                                                        style={{ backgroundColor: `${course.riskLevel?.color || '#4a90e2'}20`, color: course.riskLevel?.color || '#4a90e2' }}
                                                    >
                                                        <AlertTriangle size={16} />
                                                        <span>{course.riskScore || 0}</span>
                                                    </button>
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

                                            {/* ATTENDANCE PROGRESS BAR SECTION */}
                                            <div className="student-attendance-stats">
                                                <div className="student-attendance-header">
                                                    <span>Attendance Rate</span>
                                                    <span className="student-attendance-percent-value" style={{ color: (course.attendanceRate || 0) >= 75 ? '#28a745' : (course.attendanceRate || 0) >= 50 ? '#ffc107' : '#dc3545' }}>
                                                        {course.attendanceRate || 0}%
                                                    </span>
                                                </div>
                                                <div className="student-attendance-progress-bar">
                                                    <div 
                                                        className="student-attendance-progress-fill present"
                                                        style={{ width: `${course.attendanceRate || 0}%` }}
                                                    ></div>
                                                    <div 
                                                        className="student-attendance-progress-fill absent"
                                                        style={{ width: `${course.absenceRate || 0}%` }}
                                                    ></div>
                                                </div>
                                                <div className="student-attendance-legend">
                                                    <span className="legend-present">✓ Present: {course.presentCount || 0}</span>
                                                    <span className="legend-absent">✗ Absent: {course.absentCount || 0}</span>
                                                    <span className="legend-late">⏰ Late: {course.lateCount || 0}</span>
                                                    <span className="legend-total">Total Sessions: {course.totalSessions || 0}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="student-risk-indicator" style={{ borderLeft: `4px solid ${course.riskLevel?.color || '#4a90e2'}`, backgroundColor: `${course.riskLevel?.color || '#4a90e2'}10` }}>
                                                <span style={{ color: course.riskLevel?.color || '#4a90e2' }}>{course.riskLevel?.icon || '⚠️'} Risk Level: {course.riskLevel?.level || 'Low Risk'}</span>
                                                <span style={{ color: course.riskLevel?.color || '#4a90e2', fontWeight: 'bold' }}>{course.riskScore || 0}</span>
                                            </div>
                                            
                                            <div className="student-course-card-footer">
                                                <div className="student-attendance-progress">
                                                    <div className="student-progress-bar">
                                                        <div className="student-progress-fill" style={{ width: `${course.attendanceRate || 0}%` }}></div>
                                                    </div>
                                                    <span className="student-attendance-percent">{course.attendanceRate || 0}%</span>
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
                                    <h3>Attendance & Risk Records</h3>
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
                                    <span className="student-summary-label">Overall Risk Score</span>
                                    <span className="student-summary-value" style={{ color: overallRiskLevel.color }}>{overallRiskScore}</span>
                                </div>
                                <div className="student-summary-item">
                                    <span className="student-summary-label">Overall Risk Level</span>
                                    <span className="student-summary-value" style={{ color: overallRiskLevel.color }}>{overallRiskLevel.icon} {overallRiskLevel.level}</span>
                                </div>
                            </div>
                            <div className="student-table-responsive">
                                <table className="student-data-table">
                                    <thead>
                                        <tr>
                                            <th>Course Code</th>
                                            <th>Course Name</th>
                                            <th>Attendance Rate</th>
                                            <th>Absence Rate</th>
                                            <th>Present</th>
                                            <th>Absent</th>
                                            <th>Late</th>
                                            <th>Total Sessions</th>
                                            <th>Risk Score</th>
                                            <th>Risk Level</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courses.length === 0 ? (
                                            <tr><td colSpan="10" className="student-no-data">No attendance records</td></tr>
                                        ) : (
                                            courses.map((course, idx) => (
                                                <tr key={idx}>
                                                    <td className="student-text-muted">{course.id}</td>
                                                    <td className="student-text-bold">{course.name}</td>
                                                    <td>
                                                        <span style={{ color: (course.attendanceRate || 0) >= 75 ? '#28a745' : (course.attendanceRate || 0) >= 50 ? '#ffc107' : '#dc3545', fontWeight: 'bold' }}>
                                                            {course.attendanceRate || 0}%
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ color: (course.absenceRate || 0) > 25 ? '#dc3545' : (course.absenceRate || 0) > 10 ? '#ffc107' : '#28a745' }}>
                                                            {course.absenceRate || 0}%
                                                        </span>
                                                    </td>
                                                    <td className="student-text-success">{course.presentCount || 0}</td>
                                                    <td className="student-text-danger">{course.absentCount || 0}</td>
                                                    <td className="student-text-warning">{course.lateCount || 0}</td>
                                                    <td>{course.totalSessions || 0}</td>
                                                    <td style={{ color: course.riskLevel?.color, fontWeight: 'bold' }}>{course.riskScore || 0}</td>
                                                    <td>
                                                        <span style={{ color: course.riskLevel?.color }}>
                                                            {course.riskLevel?.icon} {course.riskLevel?.level || 'Low Risk'}
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
                                                    const course = courses.find(c => c.id === cls.courseId);
                                                    return (
                                                        <div className="student-day-class" key={idx}>
                                                            <span className="student-class-time">{cls.time}</span>
                                                            <span className="student-class-name">{cls.name}</span>
                                                            <span className="student-class-room">Room {cls.room}</span>
                                                            {course && (
                                                                <span className="student-class-risk" style={{ color: course.riskLevel?.color }}>
                                                                    Risk: {course.riskScore}
                                                                </span>
                                                            )}
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
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Overall Risk Score:</span>
                                                <span className="student-detail-value" style={{ color: overallRiskLevel.color, fontWeight: 'bold' }}>{overallRiskScore}</span>
                                            </div>
                                            <div className="student-detail-row">
                                                <span className="student-detail-label">Overall Risk Level:</span>
                                                <span className="student-detail-value" style={{ color: overallRiskLevel.color }}>{overallRiskLevel.icon} {overallRiskLevel.level}</span>
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
                    
                    {activeTab === 'LMS' && (
                        <div className="student-lms-container">
                            <div className="student-lms-header">
                                <div className="student-lms-title">
                                    <GraduationCap size={40} />
                                    <div>
                                        <h2>Learning Management System</h2>
                                        <p>Access your course materials, assignments, and learning resources</p>
                                    </div>
                                </div>
                            </div>

                            {!selectedCourseForLMS ? (
                                <div className="student-lms-select-course">
                                    <h3>Select a course to start</h3>
                                    <div className="student-lms-course-grid">
                                        {courses.length === 0 ? (
                                            <div className="student-lms-empty-courses">
                                                <p>You are not enrolled in any courses yet.</p>
                                                <button 
                                                    className="student-primary-button"
                                                    onClick={() => setIsAddCourseModalOpen(true)}
                                                >
                                                    <BookPlus size={18} /> Enroll in a Course
                                                </button>
                                            </div>
                                        ) : (
                                            courses.map(course => (
                                                <div 
                                                    key={course.id} 
                                                    className="student-lms-course-option"
                                                    onClick={() => setSelectedCourseForLMS(course)}
                                                >
                                                    <BookOpen size={32} />
                                                    <h4>{course.name}</h4>
                                                    <p>{course.id}</p>
                                                    <small>{course.instructor}</small>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="student-lms-course-header">
                                        <button 
                                            className="student-back-button"
                                            onClick={() => setSelectedCourseForLMS(null)}
                                        >
                                            ← Back to Courses
                                        </button>
                                        <div className="student-lms-course-info">
                                            <h3>{selectedCourseForLMS.name}</h3>
                                            <span>{selectedCourseForLMS.id}</span>
                                            <small>{selectedCourseForLMS.instructor}</small>
                                        </div>
                                    </div>

                                    <div className="student-lms-tabs">
                                        <button 
                                            className={`student-lms-tab ${activeLmsTab === 'materials' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('materials')}
                                        >
                                            <Video size={18} /> Materials
                                        </button>
                                        <button 
                                            className={`student-lms-tab ${activeLmsTab === 'assignments' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('assignments')}
                                        >
                                            <FileText size={18} /> Assignments
                                        </button>
                                        <button 
                                            className={`student-lms-tab ${activeLmsTab === 'quizzes' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('quizzes')}
                                        >
                                            <Award size={18} /> Quizzes
                                        </button>
                                        <button 
                                            className={`student-lms-tab ${activeLmsTab === 'discussions' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('discussions')}
                                        >
                                            <MessageSquare size={18} /> Discussions
                                        </button>
                                    </div>

                                    {activeLmsTab === 'materials' && (
                                        <div className="student-lms-materials">
                                            {lmsMaterials.length === 0 ? (
                                                <div className="student-lms-empty">
                                                    <p>No materials uploaded yet for this course.</p>
                                                </div>
                                            ) : (
                                                <div className="student-lms-materials-grid">
                                                    {lmsMaterials.map(material => (
                                                        <div key={material.id} className="student-lms-material-card">
                                                            <div className="student-lms-material-icon">
                                                                {material.fileType === 'video' ? <Video size={24} /> : <FileText size={24} />}
                                                            </div>
                                                            <div className="student-lms-material-info">
                                                                <h4>{material.title}</h4>
                                                                <p>{material.description}</p>
                                                                {material.fileUrl && (
                                                                    <a 
                                                                        href={material.fileUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="student-material-link"
                                                                    >
                                                                        {material.fileName || 'View File'}
                                                                    </a>
                                                                )}
                                                                <div className="student-material-meta">
                                                                    <small>Uploaded by: {material.uploadedBy || 'Professor'}</small>
                                                                    <small> {new Date(material.uploadedAt).toLocaleDateString()}</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeLmsTab === 'assignments' && (
                                        <div className="student-lms-assignments">
                                            {lmsAssignments.length === 0 ? (
                                                <div className="student-lms-empty">
                                                    <p>No assignments created yet for this course.</p>
                                                </div>
                                            ) : (
                                                <div className="student-lms-assignments-list">
                                                    {lmsAssignments.map(assignment => (
                                                        <div key={assignment.id} className="student-lms-assignment-card">
                                                            <div className="student-assignment-info">
                                                                <h4>{assignment.title}</h4>
                                                                <p>{assignment.description}</p>
                                                                {assignment.fileUrl && (
                                                                    <a 
                                                                        href={assignment.fileUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="student-assignment-file-link"
                                                                    >
                                                                        {assignment.fileName || 'Download Assignment File'}
                                                                    </a>
                                                                )}
                                                                <div className="student-assignment-meta">
                                                                    <span className="due-date">Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                                                    <span className="max-score">Max Score: {assignment.maxScore}</span>
                                                                </div>
                                                                {assignment.submitted && (
                                                                    <div className="student-submission-status submitted">
                                                                        <CheckCircle size={14} />
                                                                        <span>Submitted on {new Date(assignment.submission.submittedAt).toLocaleDateString()}</span>
                                                                        {assignment.submission.grade && (
                                                                            <span className="grade">Grade: {assignment.submission.grade}/{assignment.maxScore}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="student-assignment-actions">
                                                                {assignment.submitted ? (
                                                                    <button className="student-view-submission-button" disabled>
                                                                        ✓ Submitted
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        className="student-submit-button"
                                                                        onClick={() => {
                                                                            setSelectedAssignment(assignment);
                                                                            setIsLmsModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Upload size={16} /> Submit Assignment
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeLmsTab === 'quizzes' && (
                                        <div className="student-lms-coming-soon">
                                            <Award size={48} />
                                            <h3>Quizzes & Exams Coming Soon</h3>
                                            <p>Take online quizzes and view your results instantly.</p>
                                        </div>
                                    )}

                                    {activeLmsTab === 'discussions' && (
                                        <div className="student-lms-coming-soon">
                                            <MessageSquare size={48} />
                                            <h3>Discussions Coming Soon</h3>
                                            <p>Ask questions and collaborate with your classmates.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'Messages' && (
                        <div className="student-messages-container">
                            <div className="student-messages-header">
                                <div className="student-messages-title">
                                    <MessageSquare size={40} />
                                    <div>
                                        <h2>Message Center</h2>
                                        <p>Send messages to Admin or your Professors</p>
                                    </div>
                                </div>
                            </div>

                            <div className="student-messages-stats">
                                <div className="student-messages-stat-card">
                                    <div className="student-messages-stat-icon"><Inbox size={24} /></div>
                                    <div className="student-messages-stat-value">{unreadMessageCount}</div>
                                    <div className="student-messages-stat-label">Unread Messages</div>
                                </div>
                                <div className="student-messages-stat-card">
                                    <div className="student-messages-stat-icon"><Users size={24} /></div>
                                    <div className="student-messages-stat-value">{courses.length}</div>
                                    <div className="student-messages-stat-label">Your Courses</div>
                                </div>
                            </div>

                            <div className="student-messages-actions-grid">
                             <div className="student-message-action-card" onClick={() => setIsMessageToProfessorModalOpen(true)}>
                                    <div className="student-message-action-icon professor">
                                        <UserCheck size={32} />
                                    </div>
                                    <h3>Send to Professor</h3>
                                    <p>Send questions or messages to your course professors</p>
                                    <div className="student-message-action-footer">
                                        <span>{professorsList.length} professors available →</span>
                                    </div>
                                </div>
                            </div>

                            {/* Inbox - All Messages */}
                            <div className="student-inbox-section">
                                <h4>
                                    <Inbox size={18} />
                                    All Messages ({unreadMessageCount} unread)
                                </h4>
                                <div className="student-messages-list">
                                    {studentMessages.length === 0 ? (
                                        <p className="student-no-data">No messages yet</p>
                                    ) : (
                                        studentMessages.map(msg => (
                                            <div 
                                                key={msg.id} 
                                                className={`student-message-item ${!msg.read ? 'unread' : ''}`}
                                                onClick={() => {
                                                    if (!msg.read) markMessageAsRead(msg.id);
                                                    setSelectedMessage(msg);
                                                }}
                                            >
                                                <div className="student-message-avatar">
                                                    {msg.from === 'admin' ? '👨‍💼' : msg.from === 'professor' ? '👨‍🏫' : '📧'}
                                                </div>
                                                <div className="student-message-content">
                                                    <div className="student-message-header">
                                                        <span className="student-message-sender">
                                                            {msg.from === 'admin' ? `Admin (${msg.fromName || 'System'})` : 
                                                             msg.from === 'professor' ? `Prof. ${msg.fromName || 'Professor'}` : 
                                                             msg.fromName || 'Unknown'}
                                                        </span>
                                                        <span className="student-message-date">
                                                            {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Just now'}
                                                        </span>
                                                    </div>
                                                    {msg.subject && <span className="student-message-subject">{msg.subject}</span>}
                                                    <p className="student-message-text">
                                                        {msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message}
                                                    </p>
                                                </div>
                                                {!msg.read && <div className="student-unread-dot"></div>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {isRiskDetailsModalOpen && selectedRiskCourse && (
                <div className="student-modal-overlay" onClick={() => setIsRiskDetailsModalOpen(false)}>
                    <div className="student-modal-container" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h2>Risk Details - {selectedRiskCourse.name}</h2>
                            <button className="student-close-modal-button" onClick={() => setIsRiskDetailsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="student-risk-details">
                            <div className="student-risk-score-large" style={{ backgroundColor: `${selectedRiskCourse.riskLevel.color}20`, color: selectedRiskCourse.riskLevel.color }}>
                                <span className="student-risk-number">{selectedRiskCourse.riskScore}</span>
                                <span className="student-risk-label">{selectedRiskCourse.riskLevel.level}</span>
                            </div>
                            
                            <div className="student-risk-factors">
                                <h3>Risk Factors</h3>
                                <div className="student-risk-factor-item">
                                    <span>Attendance Rate:</span>
                                    <div className="student-risk-factor-bar">
                                        <div className="student-risk-factor-fill" style={{ width: `${selectedRiskCourse.attendanceRate}%`, backgroundColor: selectedRiskCourse.attendanceRate < 60 ? '#ef4444' : selectedRiskCourse.attendanceRate < 80 ? '#f59e0b' : '#10b981' }}></div>
                                        <span>{selectedRiskCourse.attendanceRate}%</span>
                                    </div>
                                </div>
                                <div className="student-risk-factor-item">
                                    <span>Grades:</span>
                                    <div className="student-risk-factor-bar">
                                        <div className="student-risk-factor-fill" style={{ width: `${selectedRiskCourse.grades}%`, backgroundColor: selectedRiskCourse.grades < 60 ? '#ef4444' : selectedRiskCourse.grades < 75 ? '#f59e0b' : '#10b981' }}></div>
                                        <span>{selectedRiskCourse.grades}%</span>
                                    </div>
                                </div>
                                <div className="student-risk-factor-item">
                                    <span>Timeliness:</span>
                                    <div className="student-risk-factor-bar">
                                        <div className="student-risk-factor-fill" style={{ width: `${selectedRiskCourse.timeliness}%`, backgroundColor: selectedRiskCourse.timeliness < 60 ? '#ef4444' : selectedRiskCourse.timeliness < 80 ? '#f59e0b' : '#10b981' }}></div>
                                        <span>{selectedRiskCourse.timeliness}%</span>
                                    </div>
                                </div>
                                <div className="student-risk-factor-item">
                                    <span>GPA Impact:</span>
                                    <div className="student-risk-factor-bar">
                                        <div className="student-risk-factor-fill" style={{ width: `${studentData.gpa * 25}%`, backgroundColor: studentData.gpa < 2.0 ? '#ef4444' : studentData.gpa < 2.5 ? '#f59e0b' : studentData.gpa < 3.0 ? '#10b981' : '#3b82f6' }}></div>
                                        <span>{studentData.gpa}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="student-risk-recommendations">
                                <h3>Recommendations</h3>
                                {selectedRiskCourse.riskScore < 40 ? (
                                    <p className="student-risk-recommendation urgent">🔴 Urgent: Please contact your academic advisor immediately. Your attendance and performance need immediate attention.</p>
                                ) : selectedRiskCourse.riskScore < 60 ? (
                                    <p className="student-risk-recommendation warning">🟡 Warning: Consider improving your attendance and completing pending assignments.</p>
                                ) : selectedRiskCourse.riskScore < 80 ? (
                                    <p className="student-risk-recommendation good">🟢 Good: You're doing well, but stay consistent to maintain your performance.</p>
                                ) : (
                                    <p className="student-risk-recommendation excellent">🔵 Excellent: Outstanding performance! Keep up the great work!</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="student-modal-actions">
                            <button className="student-cancel-button" onClick={() => setIsRiskDetailsModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

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
            
            {isDigitalIdModalOpen && (
                <div className="student-modal-overlay" onClick={closeDigitalID}>
                    <div className="student-modal-container digital-id-modal" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h2>Digital ID Card</h2>
                            <button className="student-close-modal-button" onClick={closeDigitalID}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="student-digital-id-full">
                            <div className="student-id-card-header">
                                <div className="student-id-school">
                                    <Building size={24} />
                                    <div>
                                        <h3>Cairo University</h3>
                                        <p>Student Identification Card</p>
                                    </div>
                                </div>
                                <Shield size={32} className="student-id-shield" />
                            </div>
                            <div className="student-id-card-body">
                                <div className="student-id-photo-section">
                                    {studentData.profileImage ? (
                                        <img src={studentData.profileImage} alt="Student" className="student-id-photo" />
                                    ) : (
                                        <div className="student-id-photo-placeholder">
                                            {studentData.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="student-id-info-section">
                                    <div className="student-id-field">
                                        <span className="student-id-field-label">Student Name</span>
                                        <span className="student-id-field-value">{studentData.name}</span>
                                    </div>
                                    <div className="student-id-field">
                                        <span className="student-id-field-label">Student ID</span>
                                        <span className="student-id-field-value">{studentData.id}</span>
                                    </div>
                                    <div className="student-id-field">
                                        <span className="student-id-field-label">Department</span>
                                        <span className="student-id-field-value">{studentData.department}</span>
                                    </div>
                                    <div className="student-id-field">
                                        <span className="student-id-field-label">Academic Year</span>
                                        <span className="student-id-field-value">{studentData.academicYear}</span>
                                    </div>
                                    <div className="student-id-field">
                                        <span className="student-id-field-label">Email</span>
                                        <span className="student-id-field-value">{studentData.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="student-id-card-footer">
                                <div className="student-id-qr-large">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                                            JSON.stringify({
                                                id: studentData.id,
                                                name: studentData.name,
                                                email: studentData.email,
                                                dept: studentData.department,
                                                year: studentData.academicYear,
                                                type: 'student',
                                                university: 'Cairo'
                                            })
                                        )}`}
                                        alt="Student QR Code"
                                        className="student-qr-image-large"
                                    />
                                </div>
                                <div className="student-id-validity">
                                    <div className="student-id-validity-badge">
                                        <CheckCircle size={16} />
                                        <span>VALID ID 2026</span>
                                    </div>
                                    <p className="student-id-scan-text">Scan QR code to verify identity</p>
                                    <p className="student-id-issue-date">Issued: March 2026</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message to Admin Modal */}
            {isMessageToAdminModalOpen && (
                <div className="student-modal-overlay" onClick={() => setIsMessageToAdminModalOpen(false)}>
                    <div className="student-modal-container small" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h3>Send Message to Admin</h3>
                            <button className="student-close-modal-button" onClick={() => setIsMessageToAdminModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="student-modal-form">
                            <div className="student-form-group">
                                <label>Subject (Optional)</label>
                                <input
                                    type="text"
                                    className="student-form-input"
                                    value={messageToAdminSubject}
                                    onChange={(e) => setMessageToAdminSubject(e.target.value)}
                                    placeholder="Enter subject"
                                />
                            </div>
                            <div className="student-form-group">
                                <label>Message</label>
                                <textarea
                                    className="student-form-input"
                                    rows="5"
                                    value={messageToAdminText}
                                    onChange={(e) => setMessageToAdminText(e.target.value)}
                                    placeholder="Type your message here..."
                                />
                            </div>
                            <div className="student-modal-actions">
                                <button className="student-cancel-button" onClick={() => setIsMessageToAdminModalOpen(false)}>Cancel</button>
                                <button 
                                    className="student-update-button"
                                    onClick={handleSendMessageToAdmin}
                                    disabled={!messageToAdminText.trim()}
                                >
                                    <Send size={16} /> Send to Admin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message to Professor Modal */}
            {isMessageToProfessorModalOpen && (
                <div className="student-modal-overlay" onClick={() => setIsMessageToProfessorModalOpen(false)}>
                    <div className="student-modal-container small" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h3>Send Message to Professor</h3>
                            <button className="student-close-modal-button" onClick={() => setIsMessageToProfessorModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="student-modal-form">
                            <div className="student-form-group">
                                <label>Select Professor / Course</label>
                                <select
                                    className="student-form-input"
                                    value={selectedProfessor?.id || ''}
                                    onChange={(e) => {
                                        const prof = professorsList.find(p => p.id === e.target.value);
                                        setSelectedProfessor(prof);
                                    }}
                                >
                                    <option value="">Select Professor</option>
                                    {professorsList.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} - {p.courseName} ({p.courseId})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="student-form-group">
                                <label>Subject (Optional)</label>
                                <input
                                    type="text"
                                    className="student-form-input"
                                    value={messageToProfessorSubject}
                                    onChange={(e) => setMessageToProfessorSubject(e.target.value)}
                                    placeholder="Enter subject"
                                />
                            </div>
                            <div className="student-form-group">
                                <label>Message</label>
                                <textarea
                                    className="student-form-input"
                                    rows="5"
                                    value={messageToProfessorText}
                                    onChange={(e) => setMessageToProfessorText(e.target.value)}
                                    placeholder="Type your message here..."
                                />
                            </div>
                            <div className="student-modal-actions">
                                <button className="student-cancel-button" onClick={() => setIsMessageToProfessorModalOpen(false)}>Cancel</button>
                                <button 
                                    className="student-update-button"
                                    onClick={handleSendMessageToProfessor}
                                    disabled={!selectedProfessor || !messageToProfessorText.trim()}
                                >
                                    <Send size={16} /> Send to Professor
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Detail Modal */}
            {selectedMessage && (
                <div className="student-modal-overlay" onClick={() => setSelectedMessage(null)}>
                    <div className="student-modal-container message-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h2>Message Details</h2>
                            <button className="student-close-modal-button" onClick={() => setSelectedMessage(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="student-message-detail">
                            <div className="student-message-detail-header">
                                <div className="student-message-detail-sender">
                                    <strong>From:</strong> {getMessageSenderName(selectedMessage)}
                                </div>
                                <div className="student-message-detail-date">
                                    <strong>Date:</strong> {selectedMessage.createdAt?.toDate ? new Date(selectedMessage.createdAt.toDate()).toLocaleString() : 'Just now'}
                                </div>
                            </div>
                            {selectedMessage.subject && (
                                <div className="student-message-detail-subject">
                                    <strong>Subject:</strong> {selectedMessage.subject}
                                </div>
                            )}
                            <div className="student-message-detail-body">
                                <strong>Message:</strong>
                                <p>{selectedMessage.message}</p>
                            </div>
                        </div>
                        
                        <div className="student-modal-actions">
                            <button className="student-submit-button" onClick={() => setSelectedMessage(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Assignment Modal */}
            {isLmsModalOpen && selectedAssignment && (
                <div className="student-modal-overlay" onClick={() => setIsLmsModalOpen(false)}>
                    <div className="student-modal-container" onClick={e => e.stopPropagation()}>
                        <div className="student-modal-header">
                            <h2>Submit Assignment</h2>
                            <button className="student-close-modal-button" onClick={() => setIsLmsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="student-modal-form">
                            <div className="student-form-group">
                                <label>Assignment: <strong>{selectedAssignment.title}</strong></label>
                            </div>
                            <div className="student-form-group">
                                <label>Due Date: {new Date(selectedAssignment.dueDate).toLocaleDateString()}</label>
                            </div>
                            <div className="student-form-group">
                                <label>Upload File (PDF, DOCX, Image)</label>
                                <div className="student-file-upload-area">
                                    <input
                                        type="file"
                                        id="assignment-file"
                                        accept=".pdf,.docx,.jpg,.png"
                                        onChange={(e) => setSubmissionFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                    />
                                    <button 
                                        type="button"
                                        className="student-upload-button"
                                        onClick={() => document.getElementById('assignment-file').click()}
                                    >
                                        <Upload size={18} />
                                        {submissionFile ? submissionFile.name : 'Choose File'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="student-modal-actions">
                            <button className="student-cancel-button" onClick={() => setIsLmsModalOpen(false)}>Cancel</button>
                            <button 
                                className="student-submit-button"
                                onClick={handleAssignmentSubmit}
                                disabled={isSubmitting || !submissionFile}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}