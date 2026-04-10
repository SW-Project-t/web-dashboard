import React, { useState, useEffect } from 'react';
import './ProfessorDashboard.css';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, BookOpen, Users, Calendar, Settings, 
    LogOut, Key, Plus, Edit, Trash2, Bell, Download,
    TrendingUp, Clock, CheckCircle, XCircle, AlertCircle,
    Menu, Search, ChevronRight, BarChart3, UserPlus,
    X, Shield, Building, Eye, GraduationCap, Video, 
    FileText, MessageSquare, Award, Upload, Share2, Zap,
    Filter, UserCheck, UserX, AlertTriangle, Star, Mail, Phone
} from 'lucide-react';

import { auth, db } from './firebase'; 
import { doc, getDoc, updateDoc, getDocs, collection, setDoc, addDoc, where, query, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const STORAGE_KEYS = {
    PROF_IMAGE: 'yallaclass_prof_image'
};

const CLOUDINARY_CLOUD_NAME = 'dsxijrxup'; 
const CLOUDINARY_UPLOAD_PRESET = 'Lms_uploads';

export default function ProfessorDashboard() {
    const navigate = useNavigate();
    
    const [profileImage, setProfileImage] = useState(localStorage.getItem(STORAGE_KEYS.PROF_IMAGE) || null);
    const [profData, setProfData] = useState({ name: 'Loading...', code: '...' });
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDigitalIdModalOpen, setIsDigitalIdModalOpen] = useState(false);
    const [passwordFields, setPasswordFields] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [enrolledStudents, setEnrolledStudents] = useState({});
    const [selectedCourseForStudents, setSelectedCourseForStudents] = useState(null);
    const [showStudentsModal, setShowStudentsModal] = useState(false);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [studentFilterType, setStudentFilterType] = useState('all'); // all, name, code, risk
    const [riskFilterRange, setRiskFilterRange] = useState({ min: 0, max: 100 });
    const [showRiskFilter, setShowRiskFilter] = useState(false);
    const [sortBy, setSortBy] = useState('name'); // name, code, risk, attendance
    const [sortOrder, setSortOrder] = useState('asc');

    const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
    const [currentSubmissions, setCurrentSubmissions] = useState([]);
    const [selectedAssignmentForSub, setSelectedAssignmentForSub] = useState(null);
    
    const fetchAssignmentSubmissions = async (assignmentId) => {
    try {
        const q = query(collection(db, "lms_submissions"), where("assignmentId", "==", assignmentId));
        const snapshot = await getDocs(q);
        const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCurrentSubmissions(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        setCurrentSubmissions([]);
    }
};

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
 const BASE_URL = "http://localhost:3001"; // تأكد إن ده بورت الباك-إند بتاعك

async function enrollStudent(data) {
  const response = await fetch(`${BASE_URL}/api/enroll-student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Enrollment failed");
  return response.json();
}

async function unenrollStudent(data) {
  const response = await fetch(`${BASE_URL}/api/unenroll-student`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Unenrollment failed");
  return response.json();
}

async function getCourseStudents(courseId) {
  const response = await fetch(`${BASE_URL}/api/course-students/${courseId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to fetch students");
  return response.json();
}

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

    const [adminCourses, setAdminCourses] = useState([]);
    const [lmsMaterials, setLmsMaterials] = useState([]);
    const [lmsAssignments, setLmsAssignments] = useState([]);
    const [lmsQuizzes, setLmsQuizzes] = useState([]);
    const [lmsDiscussions, setLmsDiscussions] = useState([]);
    const [selectedCourseForLMS, setSelectedCourseForLMS] = useState(null);
    const [showLmsModal, setShowLmsModal] = useState(false);
    const [lmsModalType, setLmsModalType] = useState(''); 
    const [activeLmsTab, setActiveLmsTab] = useState('materials');
    const [lmsFormData, setLmsFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        fileUrl: '',
        maxScore: 100,
        questions: []
    });

    const [assignmentFile, setAssignmentFile] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fetchEnrolledStudents = async (courseId, courseName) => {
    setIsLoadingStudents(true);
    try {
        // 1. نداء الـ API اللي إنت عملته في الباك لآخذ بيانات الطلاب
       // تأكد من البورت 3001 ومن كلمة /api/
        const response = await fetch(`http://localhost:3001/api/course-students/${courseId}`);
        
        // لو السيرفر رجع صفحة HTML (Error)، السطر ده هيمسكها
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new TypeError("الباك إند رجع HTML مش JSON! تأكد من المسار في السيرفر.");
        }

        if (!response.ok) {
            throw new Error("Failed to fetch students from server");
        }

        const students = await response.json();

        // 2. معالجة البيانات وحساب الـ Risk Score (نفس اللوجيك بتاعك القديم)
        const processedStudents = students.map(student => {
            // ملاحظة: تأكد إن الباك-إند بيرجع attendanceRecords و grades لكل طالب
            // لو الباك بيرجع البيانات دي جاهزة، تقدر تشيل الحسابات دي
            
            const attendance = student.attendanceRecords || [];
            const grades = student.grades || [];
            
            const totalClasses = attendance.length || 1;
            const presentClasses = attendance.filter(r => r.status === 'present').length;
            const lateCount = attendance.filter(r => r.status === 'late').length;
            const attendanceRate = (presentClasses / totalClasses) * 100;
            
            const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
            const averageGrade = grades.length > 0 ? (totalScore / grades.length) : 0;

            let riskScore = 0;
            
            // حسابات الـ Risk Score (Attendance)
            if (attendanceRate < 50) riskScore += 40;
            else if (attendanceRate < 70) riskScore += 25;
            else if (attendanceRate < 85) riskScore += 10;

            // حسابات الـ Risk Score (Grades)
            if (averageGrade < 50) riskScore += 40;
            else if (averageGrade < 65) riskScore += 25;
            else if (averageGrade < 75) riskScore += 10;

            // حسابات الـ Risk Score (Lateness)
            if (lateCount > 10) riskScore += 20;
            else if (lateCount > 5) riskScore += 15;
            else if (lateCount > 2) riskScore += 10;
            else if (lateCount > 0) riskScore += 5;

            return {
                ...student,
                attendanceRate: Math.round(attendanceRate),
                averageGrade: Math.round(averageGrade),
                riskScore: riskScore,
                lateCount: lateCount,
                totalClasses: totalClasses,
                presentCount: presentClasses,
                riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low'
            };
        });

        // 3. تحديث الـ State
        setEnrolledStudents(prev => ({
            ...prev,
            [courseId]: processedStudents
        }));

        return processedStudents;
    } catch (error) {
        console.error("Error fetching enrolled students:", error);
        showNotification('حدث خطأ أثناء تحميل الطلاب', 'error');
        return [];
    } finally {
        setIsLoadingStudents(false);
    }
};
    const viewCourseStudents = async (course) => {
        setSelectedCourseForStudents(course);
        setStudentSearchQuery('');
        setStudentFilterType('all');
        setRiskFilterRange({ min: 0, max: 100 });
        setShowRiskFilter(false);
        setSortBy('name');
        setSortOrder('asc');
        
        if (!enrolledStudents[course.id]) {
            await fetchEnrolledStudents(course.id, course.name);
        }
        setShowStudentsModal(true);
    };

  const removeStudentFromCourse = async (enrollmentId, courseId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName} from this course?`)) return;
    
    try {
        // نداء الـ API اللي إنت عملته (unenroll-student)
        const response = await fetch("/api/unenroll-student", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                enrollmentId: enrollmentId 
                // ملحوظة: لو الباك محتاج studentId أو courseId برضه ضيفهم هنا
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Unenrollment failed");
        }

        // تحديث الـ UI محلياً بعد نجاح الـ Request
        setEnrolledStudents(prev => ({
            ...prev,
            [courseId]: prev[courseId].filter(s => s.id !== enrollmentId)
        }));
        
        showNotification(`${studentName} removed from course`, 'success');
    } catch (error) {
        console.error("Error removing student:", error);
        showNotification(error.message || 'Error removing student', 'error');
    }
};
    const getFilteredAndSortedStudents = () => {
        if (!selectedCourseForStudents) return [];
        
        let students = [...(enrolledStudents[selectedCourseForStudents.id] || [])];
        if (studentSearchQuery) {
            switch (studentFilterType) {
                case 'name':
                    students = students.filter(s => 
                        s.studentName?.toLowerCase().includes(studentSearchQuery.toLowerCase())
                    );
                    break;
                case 'code':
                    students = students.filter(s => 
                        s.studentCode?.toLowerCase().includes(studentSearchQuery.toLowerCase())
                    );
                    break;
                case 'risk':
                    const riskValue = parseInt(studentSearchQuery);
                    if (!isNaN(riskValue)) {
                        students = students.filter(s => s.riskScore <= riskValue);
                    }
                    break;
                default: // all
                    students = students.filter(s => 
                        s.studentName?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        s.studentCode?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        s.studentEmail?.toLowerCase().includes(studentSearchQuery.toLowerCase())
                    );
            }
        }
        
        if (showRiskFilter) {
            students = students.filter(s => 
                s.riskScore >= riskFilterRange.min && s.riskScore <= riskFilterRange.max
            );
        }
    
        students.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = (a.studentName || '').localeCompare(b.studentName || '');
                    break;
                case 'code':
                    comparison = (a.studentCode || '').localeCompare(b.studentCode || '');
                    break;
                case 'risk':
                    comparison = (a.riskScore || 0) - (b.riskScore || 0);
                    break;
                case 'attendance':
                    comparison = (a.attendanceRate || 0) - (b.attendanceRate || 0);
                    break;
                case 'grade':
                    comparison = (a.averageGrade || 0) - (b.averageGrade || 0);
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return students;
    };

    
    const getRiskColor = (riskScore) => {
        if (riskScore >= 70) return '#dc3545';
        if (riskScore >= 40) return '#ffc107';
        return '#28a745';
    };
     const getRiskText = (riskScore) => {
        if (riskScore >= 70) return 'High Risk';
        if (riskScore >= 40) return 'Medium Risk';
        return 'Low Risk';
    };

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
        for (let assignment of assignments) {
            const submissionsQuery = query(
                collection(db, "lms_submissions"),
                where("assignmentId", "==", assignment.id)
            );
            const submissionsSnap = await getDocs(submissionsQuery);
            assignment.submissionsCount = submissionsSnap.size;
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

    const addLMSMaterial = async () => {
        if (!selectedCourseForLMS) {
            showNotification('Please select a course first', 'error');
            return;
        }
        
        try {
            await addDoc(collection(db, "lms_materials"), {
                courseId: selectedCourseForLMS.id,
                courseName: selectedCourseForLMS.name,
                title: lmsFormData.title,
                description: lmsFormData.description,
                fileUrl: lmsFormData.fileUrl || '',
                uploadedBy: profData.name,
                uploadedById: auth.currentUser?.uid,
                uploadedAt: new Date().toISOString()
            });
            showNotification('Material added successfully!', 'success');
            setShowLmsModal(false);
            setLmsFormData({ title: '', description: '', dueDate: '', fileUrl: '', maxScore: 100, questions: [] });
            fetchLMSMaterials(selectedCourseForLMS.id);
        } catch (error) {
            console.error("Error adding material:", error);
            showNotification('Error adding material', 'error');
        }
    };

    const addLMSAssignment = async () => {
        if (!selectedCourseForLMS) {
            showNotification('Please select a course first', 'error');
            return;
        }
        
        if (!lmsFormData.title) {
            showNotification('Please enter a title', 'error');
            return;
        }
        
        setIsUploading(true);
        let uploadedFileUrl = lmsFormData.fileUrl || '';
        let uploadedFileName = '';
        let uploadedFileType = '';
        
        if (assignmentFile) {
            const formData = new FormData();
            formData.append('file', assignmentFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            
            try {
                const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                
                if (uploadData.secure_url) {
                    uploadedFileUrl = uploadData.secure_url;
                    uploadedFileName = assignmentFile.name;
                    uploadedFileType = uploadData.resource_type;
                    showNotification('File uploaded successfully!', 'success');
                } else {
                    showNotification('File upload failed, but assignment will be saved', 'warning');
                }
            } catch (error) {
                console.error("Error uploading assignment file:", error);
                showNotification('File upload failed, but assignment will be saved', 'warning');
            }
        }
        
        try {
            await addDoc(collection(db, "lms_assignments"), {
                courseId: selectedCourseForLMS.id,
                courseName: selectedCourseForLMS.name,
                title: lmsFormData.title,
                description: lmsFormData.description,
                dueDate: lmsFormData.dueDate,
                maxScore: lmsFormData.maxScore,
                fileUrl: uploadedFileUrl,
                fileName: uploadedFileName,
                fileType: uploadedFileType,
                createdAt: new Date().toISOString()
            });
            showNotification('Assignment added successfully!', 'success');
            setShowLmsModal(false);
            setLmsFormData({ title: '', description: '', dueDate: '', fileUrl: '', maxScore: 100, questions: [] });
            setAssignmentFile(null);
            fetchLMSAssignments(selectedCourseForLMS.id);
        } catch (error) {
            console.error("Error adding assignment:", error);
            showNotification('Error adding assignment', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const deleteLMSAssignment = async (assignmentId) => {
        if (!window.confirm('Delete this assignment?')) return;
        try {
            await deleteDoc(doc(db, "lms_assignments", assignmentId));
            showNotification('Assignment deleted successfully', 'success');
            fetchLMSAssignments(selectedCourseForLMS.id);
        } catch (error) {
            console.error("Error deleting assignment:", error);
            showNotification('Error deleting assignment', 'error');
        }
    };

    const deleteLMSMaterial = async (materialId) => {
        if (!window.confirm('Delete this material?')) return;
        try {
            await deleteDoc(doc(db, "lms_materials", materialId));
            showNotification('Material deleted', 'success');
            fetchLMSMaterials(selectedCourseForLMS.id);
        } catch (error) {
            showNotification('Error deleting material', 'error');
        }
    };

    const openCloudinaryWidget = () => {
        if (!selectedCourseForLMS) {
            showNotification('Please select a course first', 'error');
            return;
        }
        
        if (!lmsFormData.title) {
            showNotification('Please enter a title first', 'error');
            return;
        }
        
        const widget = window.cloudinary.createUploadWidget(
            {
                cloudName: 'dsxijrxup',
                uploadPreset: 'lms_uploads',
                apiKey: '739947389236212',
                sources: ['local', 'camera', 'url', 'google_drive'],
                multiple: false,
                maxFiles: 1,
                resourceType: 'auto',
                clientAllowedFormats: ['pdf', 'mp4', 'mov', 'jpg', 'png', 'jpeg', 'pptx', 'docx'],
                maxFileSize: 200 * 1024 * 1024,
                folder: `lms/${selectedCourseForLMS.id}`,
                type: 'upload',
                styles: {
                    palette: {
                        window: '#FFFFFF',
                        windowBorder: '#4a90e2',
                        tabIcon: '#4a90e2',
                        menuIcons: '#4a90e2',
                        textDark: '#2d3748',
                        textLight: '#FFFFFF',
                        link: '#4a90e2',
                        action: '#4a90e2',
                        inactiveTabIcon: '#a0aec0',
                        error: '#f44236',
                        inProgress: '#4a90e2',
                        complete: '#10b981',
                        sourceBg: '#f8fafd'
                    }
                }
            },
            (error, result) => {
                if (error) {
                    console.error("Upload error:", error);
                    showNotification('Upload failed. Please try again.', 'error');
                    return;
                }
                
                if (result && result.event === 'success') {
                    const uploadedUrl = result.info.secure_url;
                    const fileName = result.info.original_filename;
                    const fileType = result.info.resource_type;
                    const fileFormat = result.info.format;
                    
                    saveMaterialToFirebase(uploadedUrl, fileName, fileType, fileFormat);
                    widget.close();
                }
            }
        );
        widget.open();
    };

    const saveMaterialToFirebase = async (fileUrl, fileName, fileType, fileFormat) => {
        setIsUploading(true);
        
        try {
            await addDoc(collection(db, "lms_materials"), {
                courseId: selectedCourseForLMS.id,
                courseName: selectedCourseForLMS.name,
                title: lmsFormData.title,
                description: lmsFormData.description,
                fileUrl: fileUrl,
                fileName: fileName,
                fileType: fileType,
                fileFormat: fileFormat,
                uploadedBy: profData.name,
                uploadedById: auth.currentUser?.uid,
                uploadedAt: new Date().toISOString()
            });
            
            showNotification('Material uploaded successfully!', 'success');
            setShowLmsModal(false);
            setLmsFormData({ title: '', description: '', dueDate: '', fileUrl: '', maxScore: 100, questions: [] });
            fetchLMSMaterials(selectedCourseForLMS.id);
        } catch (error) {
            console.error("Error saving to Firebase:", error);
            showNotification('File uploaded but failed to save metadata', 'error');
        } finally {
            setIsUploading(false);
        }
    };

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
        id: '', name: '', schedule: '', room: '', students: '', capacity: ''
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

    const openAttendanceModal = (course) => {
        setModalType('attendance');
        setSelectedCourse(course);
        setShowModal(true);
    };

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
                students: selected.totalStudents,
                instructor: selected.instructorName,
                capacity: selected.capacity
            });
            showNotification(`Course ${selected.courseName} selected`, 'success');
        }
    };

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
                capacity: parseInt(newCourse.capacity) || 0,
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
                        capacity: doc.data().capacity,
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
                    
                    <button 
                        className="professor-digital-id-button"
                        onClick={openDigitalID}
                    >
                        <Shield size={16} />
                        <span>Digital ID</span>
                    </button>

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
                        className={`professor-nav-button ${activeTab === 'LMS' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('LMS')}
                    >
                        <GraduationCap size={20} />
                        <span>L.M.S.</span>
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
                                    <Users size={28} />
                                    <span>Students</span>
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
                                                        <button className="professor-icon-button" onClick={() => resetDailyAttendance(course.id)} title="Reset Today">
                                                            <Clock size={18} />
                                                        </button>
                                                        <button className="professor-icon-button" onClick={() => viewCourseStudents(course)} title="View Students">
                                                            <Users size={18} />
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

                    {/* Students Page - New Enhanced Version */}
                    {activeTab === 'Students' && (
                        <div className="professor-students-full-view">
                            <div className="professor-page-header">
                                <h2>Students Management</h2>
                                <p>View and manage students across all your courses</p>
                            </div>

                            {/* Courses Selection Cards */}
                            <div className="professor-courses-selector">
                                <h3>Select a Course</h3>
                                <div className="professor-course-cards-grid">
                                    {courses.map(course => (
                                        <div 
                                            key={course.id} 
                                            className={`professor-course-select-card ${selectedCourseForStudents?.id === course.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedCourseForStudents(course);
                                                if (!enrolledStudents[course.id]) {
                                                    fetchEnrolledStudents(course.id, course.name);
                                                }
                                                setStudentSearchQuery('');
                                                setStudentFilterType('all');
                                                setShowRiskFilter(false);
                                            }}
                                        >
                                            <BookOpen size={24} />
                                            <div className="professor-course-select-info">
                                                <h4>{course.name}</h4>
                                                <p>{course.id}</p>
                                                <span className="professor-student-count">
                                                    <Users size={14} /> {enrolledStudents[course.id]?.length || 0} Students
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Students Table */}
                            {selectedCourseForStudents && (
                                <div className="professor-students-table-container">
                                    <div className="professor-students-header">
                                        <h3>
                                            Students Enrolled in {selectedCourseForStudents.name}
                                            <span className="professor-total-badge">{enrolledStudents[selectedCourseForStudents.id]?.length || 0} Total</span>
                                        </h3>
                                        
                                        {/* Filter Controls */}
                                        <div className="professor-filter-controls">
                                            <div className="professor-search-filter-group">
                                                <Search size={18} className="professor-filter-icon" />
                                                <input
                                                    type="text"
                                                    placeholder={`Search by ${studentFilterType === 'name' ? 'name' : studentFilterType === 'code' ? 'code' : studentFilterType === 'risk' ? 'risk score (≤ value)' : 'name or code'}...`}
                                                    className="professor-filter-input"
                                                    value={studentSearchQuery}
                                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                                />
                                                <select 
                                                    className="professor-filter-select"
                                                    value={studentFilterType}
                                                    onChange={(e) => setStudentFilterType(e.target.value)}
                                                >
                                                    <option value="all">All Fields</option>
                                                    <option value="name">Student Name</option>
                                                    <option value="code">Student Code</option>
                                                    <option value="risk">Risk Score</option>
                                                </select>
                                            </div>
                                            
                                            <button 
                                                className={`professor-risk-filter-btn ${showRiskFilter ? 'active' : ''}`}
                                                onClick={() => setShowRiskFilter(!showRiskFilter)}
                                            >
                                                <AlertTriangle size={16} />
                                                Risk Filter
                                            </button>
                                            
                                            <select 
                                                className="professor-sort-select"
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                            >
                                                <option value="name">Sort by Name</option>
                                                <option value="code">Sort by Code</option>
                                                <option value="risk">Sort by Risk Score</option>
                                                <option value="attendance">Sort by Attendance</option>
                                                <option value="grade">Sort by Grade</option>
                                            </select>
                                            
                                            <button 
                                                className="professor-sort-order-btn"
                                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                            >
                                                {sortOrder === 'asc' ? '↑' : '↓'}
                                            </button>
                                        </div>
                                        
                                        {/* Risk Range Filter */}
                                        {showRiskFilter && (
                                            <div className="professor-risk-range-filter">
                                                <label>Risk Score Range:</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={riskFilterRange.min}
                                                    onChange={(e) => setRiskFilterRange({ ...riskFilterRange, min: parseInt(e.target.value) })}
                                                />
                                                <span>Min: {riskFilterRange.min}</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={riskFilterRange.max}
                                                    onChange={(e) => setRiskFilterRange({ ...riskFilterRange, max: parseInt(e.target.value) })}
                                                />
                                                <span>Max: {riskFilterRange.max}</span>
                                                <button onClick={() => setRiskFilterRange({ min: 0, max: 100 })}>Reset</button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isLoadingStudents ? (
                                        <div className="professor-loading-students">
                                            <div className="professor-spinner"></div>
                                            <p>Loading students data...</p>
                                        </div>
                                    ) : (
                                        <div className="professor-table-responsive">
                                            <table className="professor-students-table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Student Name</th>
                                                        <th>Student Code</th>
                                                        <th>Email</th>
                                                        <th>Attendance %</th>
                                                        <th>Average Grade</th>
                                                        <th>Risk Score</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getFilteredAndSortedStudents().length === 0 ? (
                                                        <tr>
                                                            <td colSpan="9" className="professor-no-data">
                                                                No students found matching your filters
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        getFilteredAndSortedStudents().map((student, index) => (
                                                            <tr key={student.id} className={`professor-risk-${student.riskLevel}`}>
                                                                <td>{index + 1}</td>
                                                                <td className="professor-student-name-cell">
                                                                    <div className="professor-student-avatar">
                                                                        {student.studentName?.charAt(0) || 'S'}
                                                                    </div>
                                                                    {student.studentName}
                                                                </td>
                                                                <td>{student.studentCode}</td>
                                                                <td>{student.studentEmail}</td>
                                                                <td>
                                                                    <div className="professor-progress-bar">
                                                                        <div 
                                                                            className="professor-progress-fill"
                                                                            style={{ 
                                                                                width: `${student.attendanceRate || 0}%`,
                                                                                backgroundColor: (student.attendanceRate || 0) >= 75 ? '#28a745' : (student.attendanceRate || 0) >= 50 ? '#ffc107' : '#dc3545'
                                                                            }}
                                                                        ></div>
                                                                        <span>{student.attendanceRate || 0}%</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`professor-grade-badge ${(student.averageGrade || 0) >= 75 ? 'high' : (student.averageGrade || 0) >= 50 ? 'medium' : 'low'}`}>
                                                                        {student.averageGrade || 0}%
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div className="professor-risk-score">
                                                                        <div 
                                                                            className="professor-risk-circle"
                                                                            style={{ 
                                                                                borderColor: getRiskColor(student.riskScore),
                                                                                color: getRiskColor(student.riskScore)
                                                                            }}
                                                                        >
                                                                            {student.riskScore}
                                                                        </div>
                                                                        <span className="professor-risk-text" style={{ color: getRiskColor(student.riskScore) }}>
                                                                            {getRiskText(student.riskScore)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`professor-status-badge ${student.status === 'active' ? 'active' : 'inactive'}`}>
                                                                        {student.status === 'active' ? 'Active' : 'Dropped'}
                                                                    </span>
                                                                </td>
                                                                <td className="professor-actions-cell">
                                                                    <button 
                                                                        className="professor-icon-button view"
                                                                        title="View Details"
                                                                        onClick={() => showNotification(`Viewing details for ${student.studentName}`, 'info')}
                                                                    >
                                                                        <Eye size={16} />
                                                                    </button>
                                                                    <button 
                                                                        className="professor-icon-button delete"
                                                                        title="Remove from Course"
                                                                        onClick={() => removeStudentFromCourse(student.id, selectedCourseForStudents.id, student.studentName)}
                                                                    >
                                                                        <UserX size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    
                                    {/* Summary Cards */}
                                    <div className="professor-students-summary">
                                        <div className="professor-summary-card">
                                            <Star size={20} />
                                            <div>
                                                <h4>Average Risk Score</h4>
                                                <p>{Math.round(getFilteredAndSortedStudents().reduce((sum, s) => sum + (s.riskScore || 0), 0) / (getFilteredAndSortedStudents().length || 1))}</p>
                                            </div>
                                        </div>
                                        <div className="professor-summary-card">
                                            <UserCheck size={20} />
                                            <div>
                                                <h4>Average Attendance</h4>
                                                <p>{Math.round(getFilteredAndSortedStudents().reduce((sum, s) => sum + (s.attendanceRate || 0), 0) / (getFilteredAndSortedStudents().length || 1))}%</p>
                                            </div>
                                        </div>
                                        <div className="professor-summary-card">
                                            <AlertTriangle size={20} />
                                            <div>
                                                <h4>At Risk Students</h4>
                                                <p>{getFilteredAndSortedStudents().filter(s => s.riskLevel === 'high').length}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LMS Page */}
                    {activeTab === 'LMS' && (
                        <div className="professor-lms-container">
                            <div className="professor-lms-header">
                                <div className="professor-lms-title">
                                    <GraduationCap size={40} />
                                    <div>
                                        <h2>Learning Management System</h2>
                                        <p>Manage course content, assignments, quizzes, and discussions</p>
                                    </div>
                                </div>
                            </div>

                            {!selectedCourseForLMS ? (
                                <div className="professor-lms-select-course">
                                    <h3>Select a course to start</h3>
                                    <div className="professor-lms-course-grid">
                                        {courses.map(course => (
                                            <div 
                                                key={course.id} 
                                                className="professor-lms-course-option"
                                                onClick={() => setSelectedCourseForLMS(course)}
                                            >
                                                <BookOpen size={32} />
                                                <h4>{course.name}</h4>
                                                <p>{course.id}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="professor-lms-course-header">
                                        <button 
                                            className="professor-back-button"
                                            onClick={() => setSelectedCourseForLMS(null)}
                                        >
                                            ← Back to Courses
                                        </button>
                                        <div className="professor-lms-course-info">
                                            <h3>{selectedCourseForLMS.name}</h3>
                                            <span>{selectedCourseForLMS.id}</span>
                                        </div>
                                        <button 
                                            className="professor-primary-button"
                                            onClick={() => {
                                                setLmsModalType('material');
                                                setShowLmsModal(true);
                                            }}
                                        >
                                            <Plus size={18} /> Add Content
                                        </button>
                                    </div>

                                    <div className="professor-lms-tabs">
                                        <button 
                                            className={`professor-lms-tab ${activeLmsTab === 'materials' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('materials')}
                                        >
                                            <Video size={18} /> Materials
                                        </button>
                                        <button 
                                            className={`professor-lms-tab ${activeLmsTab === 'assignments' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('assignments')}
                                        >
                                            <FileText size={18} /> Assignments
                                        </button>
                                        <button 
                                            className={`professor-lms-tab ${activeLmsTab === 'quizzes' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('quizzes')}
                                        >
                                            <Award size={18} /> Quizzes
                                        </button>
                                        <button 
                                            className={`professor-lms-tab ${activeLmsTab === 'discussions' ? 'active' : ''}`}
                                            onClick={() => setActiveLmsTab('discussions')}
                                        >
                                            <MessageSquare size={18} /> Discussions
                                        </button>
                                    </div>

                                    {activeLmsTab === 'materials' && (
                                        <div className="professor-lms-materials">
                                            {lmsMaterials.length === 0 ? (
                                                <div className="professor-lms-empty">
                                                    <p>No materials uploaded yet</p>
                                                    <button onClick={() => {
                                                        setLmsModalType('material');
                                                        setShowLmsModal(true);
                                                    }}>Upload First Material</button>
                                                </div>
                                            ) : (
                                                <div className="professor-lms-materials-grid">
                                                    {lmsMaterials.map(material => (
                                                        <div key={material.id} className="professor-lms-material-card">
                                                            <div className="professor-lms-material-icon">
                                                                <FileText size={24} />
                                                            </div>
                                                            <div className="professor-lms-material-info">
                                                                <h4>{material.title}</h4>
                                                                <p>{material.description}</p>
                                                                {material.fileUrl && (
                                                                    <a 
                                                                        href={material.fileUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#4a90e2', fontSize: '13px', display: 'inline-block', marginTop: '5px' }}
                                                                    >
                                                                        {material.fileName || 'View File'}
                                                                    </a>
                                                                )}
                                                                <small>Uploaded: {new Date(material.uploadedAt).toLocaleDateString()}</small>
                                                            </div>
                                                            <button 
                                                                className="professor-icon-button delete"
                                                                onClick={() => deleteLMSMaterial(material.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeLmsTab === 'assignments' && (
                                        <div className="professor-lms-assignments">
                                            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                                <button 
                                                    className="professor-primary-button"
                                                    onClick={() => {
                                                        setLmsModalType('assignment');
                                                        setShowLmsModal(true);
                                                    }}
                                                >
                                                    <Plus size={18} /> Create Assignment
                                                </button>
                                            </div>

                                            {lmsAssignments.length === 0 ? (
                                                <div className="professor-lms-empty">
                                                    <p>No assignments created yet. Click the button above to create one.</p>
                                                </div>
                                            ) : (
                                                <div className="professor-lms-assignments-list">
                                                    {lmsAssignments.map(assignment => (
                                                        <div key={assignment.id} className="professor-lms-assignment-card">
                                                            <div style={{ flex: 1 }}>
                                                                <h4>{assignment.title}</h4>
                                                                <p>{assignment.description}</p>
                                                                {assignment.fileUrl && (
                                                                    <a 
                                                                        href={assignment.fileUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#4a90e2', fontSize: '13px', display: 'inline-block', marginBottom: '8px' }}
                                                                    >
                                                                        {assignment.fileName || 'Assignment File'}
                                                                    </a>
                                                                )}
                                                                <div className="professor-lms-assignment-meta">
                                                                    <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                                                    <span>Max Score: {assignment.maxScore}</span>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                                <button
                                                                    className="professor-secondary-button"
                                                                    onClick={() => {
                                                                        setSelectedAssignmentForSub(assignment);
                                                                        fetchAssignmentSubmissions(assignment.id);
                                                                        setShowSubmissionsModal(true);
                                                                    }}
                                                                >
                                                                    View Submissions
                                                                </button>
                                                                <button 
                                                                    className="professor-icon-button delete"
                                                                    onClick={() => deleteLMSAssignment(assignment.id)}
                                                                    title="Delete Assignment"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeLmsTab === 'quizzes' && (
                                        <div className="professor-lms-coming-soon">
                                            <Award size={48} />
                                            <h3>Quizzes Feature Coming Soon</h3>
                                            <p>Create interactive quizzes with automatic grading</p>
                                        </div>
                                    )}

                                    {activeLmsTab === 'discussions' && (
                                        <div className="professor-lms-coming-soon">
                                            <MessageSquare size={48} />
                                            <h3>Discussions Feature Coming Soon</h3>
                                            <p>Facilitate student discussions and Q&A forums</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Under Development Pages */}
                    {(activeTab === 'Schedule' || activeTab === 'Analytics') && (
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

            {/* Digital ID Modal */}
            {isDigitalIdModalOpen && (
                <div className="professor-modal-overlay" onClick={closeDigitalID}>
                    <div className="professor-modal-container digital-id-modal" onClick={e => e.stopPropagation()}>
                        <div className="professor-modal-header">
                            <h2>Professor Digital ID Card</h2>
                            <button className="professor-close-modal-button" onClick={closeDigitalID}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="professor-digital-id-full">
                            <div className="professor-id-card-header">
                                <div className="professor-id-school">
                                    <Building size={24} />
                                    <div>
                                        <h3>Cairo University</h3>
                                        <p>Professor Identification Card</p>
                                    </div>
                                </div>
                                <Shield size={32} className="professor-id-shield" />
                            </div>

                            <div className="professor-id-card-body">
                                <div className="professor-id-photo-section">
                                    {profileImage ? (
                                        <img src={profileImage} alt="Professor" className="professor-id-photo" />
                                    ) : (
                                        <div className="professor-id-photo-placeholder">
                                            {profData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="professor-id-info-section">
                                    <div className="professor-id-field">
                                        <span className="professor-id-field-label">Professor Name</span>
                                        <span className="professor-id-field-value">{profData.name}</span>
                                    </div>
                                    <div className="professor-id-field">
                                        <span className="professor-id-field-label">Professor ID</span>
                                        <span className="professor-id-field-value">{profData.code}</span>
                                    </div>
                                    <div className="professor-id-field">
                                        <span className="professor-id-field-label">Department</span>
                                        <span className="professor-id-field-value">Computer Science</span>
                                    </div>
                                    <div className="professor-id-field">
                                        <span className="professor-id-field-label">Email</span>
                                        <span className="professor-id-field-value">{auth.currentUser?.email || 'professor@yallaclass.com'}</span>
                                    </div>
                                    <div className="professor-id-field">
                                        <span className="professor-id-field-label">Courses</span>
                                        <span className="professor-id-field-value">{courses.length} Active Courses</span>
                                    </div>
                                </div>
                            </div>

                            <div className="professor-id-card-footer">
                                <div className="professor-id-qr-large">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                                            JSON.stringify({
                                                id: profData.code,
                                                name: profData.name,
                                                email: auth.currentUser?.email,
                                                department: 'Computer Science',
                                                type: 'professor',
                                                university: 'cairo',
                                                courses: courses.length
                                            })
                                        )}`}
                                        alt="Professor QR Code"
                                        className="professor-qr-image-large"
                                    />
                                </div>
                                <div className="professor-id-validity">
                                    <div className="professor-id-validity-badge">
                                        <CheckCircle size={16} />
                                        <span>FACULTY ID 2026</span>
                                    </div>
                                    <p className="professor-id-scan-text">Scan QR code to verify faculty identity</p>
                                    <p className="professor-id-issue-date">Issued: March 2026 | Valid through: 2028</p>
                                </div>
                            </div>
                        </div>
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

            {/* LMS Add Modal */}
            {showLmsModal && (
                <div className="professor-modal-overlay" onClick={() => setShowLmsModal(false)}>
                    <div className="professor-modal-container" onClick={e => e.stopPropagation()}>
                        <div className="professor-modal-header">
                            <h3>
                                {lmsModalType === 'material' && 'Add Course Material'}
                                {lmsModalType === 'assignment' && 'Create Assignment'}
                            </h3>
                            <button className="professor-close-modal-button" onClick={() => setShowLmsModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="professor-modal-form">
                            <div className="professor-form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    className="professor-form-input"
                                    value={lmsFormData.title}
                                    onChange={(e) => setLmsFormData({...lmsFormData, title: e.target.value})}
                                    placeholder="Enter title"
                                />
                            </div>

                            <div className="professor-form-group">
                                <label>Description</label>
                                <textarea
                                    className="professor-form-input"
                                    rows="3"
                                    value={lmsFormData.description}
                                    onChange={(e) => setLmsFormData({...lmsFormData, description: e.target.value})}
                                    placeholder="Enter description"
                                />
                            </div>

                            {lmsModalType === 'assignment' && (
                                <>
                                    <div className="professor-form-group">
                                        <label>Due Date *</label>
                                        <input
                                            type="date"
                                            className="professor-form-input"
                                            value={lmsFormData.dueDate}
                                            onChange={(e) => setLmsFormData({...lmsFormData, dueDate: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="professor-form-group">
                                        <label>Max Score *</label>
                                        <input
                                            type="number"
                                            className="professor-form-input"
                                            value={lmsFormData.maxScore}
                                            onChange={(e) => setLmsFormData({...lmsFormData, maxScore: parseInt(e.target.value) || 0})}
                                            min="0"
                                            step="5"
                                            required
                                        />
                                    </div>
                                    <div className="professor-form-group">
                                        <label>Upload Assignment File (PDF, DOCX, etc.)</label>
                                        <div className="professor-file-upload-area">
                                            <input
                                                type="file"
                                                id="assignment-file-upload"
                                                accept=".pdf,.docx,.jpg,.png"
                                                onChange={(e) => setAssignmentFile(e.target.files[0])}
                                                style={{ display: 'none' }}
                                            />
                                            <button 
                                                type="button"
                                                className="professor-upload-button"
                                                onClick={() => document.getElementById('assignment-file-upload').click()}
                                            >
                                                <Upload size={18} />
                                                {assignmentFile ? assignmentFile.name : 'Choose File'}
                                            </button>
                                            {assignmentFile && (
                                                <button 
                                                    type="button"
                                                    className="professor-clear-file-button"
                                                    onClick={() => setAssignmentFile(null)}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <small>Supported: PDF, DOCX, JPG, PNG (Max 50MB)</small>
                                    </div>
                                    <div className="professor-form-group">
                                        <label>OR Paste Link (Google Drive, etc.)</label>
                                        <input
                                            type="text"
                                            className="professor-form-input"
                                            value={lmsFormData.fileUrl}
                                            onChange={(e) => setLmsFormData({...lmsFormData, fileUrl: e.target.value})}
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                </>
                            )}

                            {lmsModalType === 'material' && (
                                <>
                                    <div className="professor-form-group">
                                        <label>Upload File (PDF, Video, Image, PPTX)</label>
                                        <button 
                                            type="button"
                                            className="professor-cloudinary-upload-button"
                                            onClick={openCloudinaryWidget}
                                            disabled={!lmsFormData.title}
                                        >
                                            <Upload size={18} />
                                            {!lmsFormData.title ? 'Enter title first' : 'Click to Upload File'}
                                        </button>
                                        <small>Supported: PDF, MP4, JPG, PNG, PPTX, DOCX (Max 200MB)</small>
                                    </div>

                                    <div className="professor-form-group">
                                        <label>OR Paste Link (YouTube, Google Drive, etc.)</label>
                                        <input
                                            type="text"
                                            className="professor-form-input"
                                            value={lmsFormData.fileUrl}
                                            onChange={(e) => setLmsFormData({...lmsFormData, fileUrl: e.target.value})}
                                            placeholder="https://example.com/lecture.pdf"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="professor-modal-actions centered">
                                <button className="professor-cancel-button" onClick={() => setShowLmsModal(false)}>
                                    Cancel
                                </button>
                                <button 
                                    className="professor-update-button"
                                    onClick={() => {
                                        if (lmsModalType === 'material') addLMSMaterial();
                                        if (lmsModalType === 'assignment') addLMSAssignment();
                                    }}
                                    disabled={isUploading}
                                >
                                    {isUploading ? 'Uploading... Please wait' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Submissions Modal */}
{showSubmissionsModal && selectedAssignmentForSub && (
    <div className="professor-modal-overlay" onClick={() => setShowSubmissionsModal(false)}>
        <div className="professor-modal-container large" onClick={e => e.stopPropagation()}>
            <div className="professor-modal-header">
                <h2>Submissions - {selectedAssignmentForSub.title}</h2>
                <button className="professor-close-modal-button" onClick={() => setShowSubmissionsModal(false)}>
                    <X size={20} />
                </button>
            </div>

            <div className="professor-submissions-list">
                {currentSubmissions.length === 0 ? (
                    <div className="professor-lms-empty">
                        <p>No submissions yet for this assignment.</p>
                    </div>
                ) : (
                    <table className="professor-submissions-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Student ID</th>
                                <th>Submitted File</th>
                                <th>Submission Date</th>
                                <th>Grade</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentSubmissions.map(sub => (
                                <tr key={sub.id}>
                                    <td>{sub.studentName}</td>
                                    <td>{sub.studentCode}</td>
                                    <td>
                                        <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="professor-submission-link">
                                            {sub.fileName}
                                        </a>
                                    </td>
                                    <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                                    <td>
                                        <input 
                                            type="number" 
                                            className="professor-grade-input"
                                            defaultValue={sub.grade || ''}
                                            placeholder="Grade"
                                            min="0"
                                            max={selectedAssignmentForSub.maxScore}
                                            id={`grade-${sub.id}`}
                                        />
                                        <span>/{selectedAssignmentForSub.maxScore}</span>
                                    </td>
                                    <td>
                                        <button 
                                            className="professor-save-grade-button"
                                            onClick={async () => {
                                                const gradeInput = document.getElementById(`grade-${sub.id}`);
                                                const newGrade = parseInt(gradeInput.value);
                                                if (!isNaN(newGrade)) {
                                                    try {
                                                        await updateDoc(doc(db, "lms_submissions", sub.id), {
                                                            grade: newGrade,
                                                            gradedAt: new Date().toISOString(),
                                                            gradedBy: auth.currentUser?.uid
                                                        });
                                                        showNotification(`Grade saved for ${sub.studentName}`, 'success');
                                                    } catch (error) {
                                                        console.error("Error saving grade:", error);
                                                        showNotification('Error saving grade', 'error');
                                                    }
                                                }
                                            }}
                                        >
                                            Save Grade
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="professor-modal-actions">
                <button className="professor-cancel-button" onClick={() => setShowSubmissionsModal(false)}>Close</button>
            </div>
        </div>
    </div>
)}
        </div>
    );
}