/**
 * Firebase Attendance Service
 * Real-time attendance tracking using Firebase Firestore
 * All data is sourced directly from Firebase with real-time listeners
 */

import { db } from '../firebase';
import { 
    collection, 
    doc, 
    query, 
    where, 
    getDocs, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp,
    orderBy
} from 'firebase/firestore';

// ==================== ATTENDANCE RECORDS COLLECTION ====================

const ATTENDANCE_COLLECTION = 'attendance';
const COURSES_COLLECTION = 'courses';
const USERS_COLLECTION = 'users';
const ENROLLMENTS_COLLECTION = 'enrollments';

/**
 * Calculate attendance statistics for a set of records
 * @param {Array} records - Array of attendance records
 * @returns {Object} Statistics including rates and counts
 */
const calculateAttendanceStats = (records) => {
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    const absenceRate = totalRecords > 0 ? Math.round(((absentCount + lateCount) / totalRecords) * 100) : 0;

    return {
        totalRecords,
        presentCount,
        lateCount,
        absentCount,
        attendanceRate,
        absenceRate
    };
};

// ==================== STUDENT ATTENDANCE ====================

/**
 * Get real-time attendance data for a student across all enrolled courses
 * @param {string} studentId - Student UID
 * @param {Function} callback - Callback function receiving courses with attendance
 * @returns {Function} Unsubscribe function
 */
export const subscribeToStudentAttendance = (studentId, callback) => {
    if (!studentId) {
        console.error('Student ID is required');
        return () => {};
    }

    // First, get the user's enrolled courses
    const userRef = doc(db, USERS_COLLECTION, studentId);
    
    const unsubscribe = onSnapshot(userRef, async (userDoc) => {
        if (!userDoc.exists()) {
            callback([]);
            return;
        }

        const userData = userDoc.data();
        const enrolledCourseIds = userData.enrolledCourses || [];

        if (enrolledCourseIds.length === 0) {
            callback([]);
            return;
        }

        // Get attendance records for this student
        const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
        const attendanceQuery = query(
            attendanceRef, 
            where('studentId', '==', studentId)
        );

        const unsubscribeAttendance = onSnapshot(attendanceQuery, (attendanceSnapshot) => {
            const attendanceRecords = [];
            attendanceSnapshot.forEach((doc) => {
                attendanceRecords.push({ id: doc.id, ...doc.data() });
            });

            // Get course details
            const coursesRef = collection(db, COURSES_COLLECTION);
            const coursesWithAttendance = [];

            Promise.all(enrolledCourseIds.map(async (courseId) => {
                const courseQuery = query(coursesRef, where('courseId', '==', courseId));
                const courseSnapshot = await getDocs(courseQuery);
                
                if (!courseSnapshot.empty) {
                    const courseData = courseSnapshot.docs[0].data();
                    const courseAttendanceRecords = attendanceRecords.filter(r => r.courseId === courseId);
                    const stats = calculateAttendanceStats(courseAttendanceRecords);

                    coursesWithAttendance.push({
                        id: courseData.courseId,
                        name: courseData.courseName,
                        instructor: courseData.instructorName,
                        schedule: `${courseData.SelectDays || 'TBA'} ${courseData.Time || ''}`,
                        room: courseData.RoomNumber || 'TBA',
                        days: courseData.SelectDays ? courseData.SelectDays.split(', ') : [],
                        time: courseData.Time || 'TBA',
                        ...stats,
                        records: courseAttendanceRecords
                    });
                }

                // When all courses are processed, call the callback
                if (coursesWithAttendance.length === enrolledCourseIds.length) {
                    callback(coursesWithAttendance);
                }
            }));
        });

        return () => unsubscribeAttendance();
    });

    return () => unsubscribe();
};

/**
 * Get overall attendance summary for a student
 * @param {string} studentId - Student UID
 * @returns {Promise<Object>} Overall attendance statistics
 */
export const getStudentOverallAttendance = async (studentId) => {
    if (!studentId) {
        return { totalRecords: 0, presentCount: 0, absentCount: 0, attendanceRate: 0, absenceRate: 0 };
    }

    const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(attendanceRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);

    const records = [];
    snapshot.forEach((doc) => {
        records.push(doc.data());
    });

    return calculateAttendanceStats(records);
};

// ==================== PROFESSOR ATTENDANCE ====================

/**
 * Get courses taught by a professor with attendance statistics
 * @param {string} professorId - Professor UID
 * @param {Function} callback - Callback receiving courses with attendance data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToProfessorCourses = (professorId, callback) => {
    if (!professorId) {
        return () => {};
    }

    const coursesRef = collection(db, COURSES_COLLECTION);
    
    const unsubscribe = onSnapshot(coursesRef, async (snapshot) => {
        const allCourses = [];
        snapshot.forEach((doc) => {
            allCourses.push({ id: doc.id, ...doc.data() });
        });

        // Filter courses where this professor is the instructor
        // Note: We match by instructorName since professorCourses collection may not exist
        const professorCourses = allCourses.filter(c => {
            // Try to match by instructor name or ID stored in course
            return c.instructorId === professorId || c.instructorUid === professorId;
        });

        if (professorCourses.length === 0) {
            // If no courses found by instructorId, check if user data has assigned courses
            const userRef = doc(db, USERS_COLLECTION, professorId);
            const userDoc = await getDocs(query(coursesRef));
            
            // Fallback: return all courses and let the frontend filter
            callback([]);
            return;
        }

        // Get attendance records for these courses
        const courseIds = professorCourses.map(c => c.courseId);
        const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
        
        // Firestore 'in' query supports max 10 items
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < courseIds.length; i += chunkSize) {
            chunks.push(courseIds.slice(i, i + chunkSize));
        }

        let allAttendanceRecords = [];
        
        for (const chunk of chunks) {
            const attendanceQuery = query(attendanceRef, where('courseId', 'in', chunk));
            const attendanceSnapshot = await getDocs(attendanceQuery);
            
            attendanceSnapshot.forEach((doc) => {
                allAttendanceRecords.push({ id: doc.id, ...doc.data() });
            });
        }

        // Calculate stats for each course
        const coursesWithStats = professorCourses.map(course => {
            const courseAttendance = allAttendanceRecords.filter(r => r.courseId === course.courseId);
            const stats = calculateAttendanceStats(courseAttendance);
            
            // Get unique students who attended this course
            const uniqueStudents = new Set(courseAttendance.map(r => r.studentId));

            return {
                id: course.courseId,
                name: course.courseName,
                schedule: `${course.SelectDays || 'TBA'} ${course.Time || ''}`,
                room: course.RoomNumber || 'TBA',
                instructorName: course.instructorName,
                capacity: course.capacity || 0,
                ...stats,
                uniqueStudents: uniqueStudents.size,
                records: courseAttendance
            };
        });

        callback(coursesWithStats);
    });

    return () => unsubscribe();
};

/**
 * Get enrolled students for a specific course with their attendance
 * @param {string} courseId - Course ID
 * @param {Function} callback - Callback receiving students with attendance
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCourseStudents = (courseId, callback) => {
    if (!courseId) {
        return () => {};
    }

    const enrollmentsRef = collection(db, ENROLLMENTS_COLLECTION);
    const enrollmentQuery = query(enrollmentsRef, where('courseId', '==', courseId));

    const unsubscribe = onSnapshot(enrollmentQuery, async (snapshot) => {
        const enrollments = [];
        snapshot.forEach((doc) => {
            enrollments.push({ id: doc.id, ...doc.data() });
        });

        if (enrollments.length === 0) {
            callback([]);
            return;
        }

        // Get attendance for each student in this course
        const studentIds = enrollments.map(e => e.studentId);
        const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
        
        // Get attendance records for all students in this course
        const attendanceQuery = query(
            attendanceRef, 
            where('courseId', '==', courseId)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = [];
        attendanceSnapshot.forEach((doc) => {
            attendanceRecords.push(doc.data());
        });

        // Calculate per-student attendance
        const studentsWithAttendance = enrollments.map(enrollment => {
            const studentAttendance = attendanceRecords.filter(
                r => r.studentId === enrollment.studentId
            );
            const stats = calculateAttendanceStats(studentAttendance);

            return {
                id: enrollment.studentId,
                studentName: enrollment.studentName,
                studentCode: enrollment.studentCode,
                studentEmail: enrollment.studentEmail,
                status: enrollment.status || 'active',
                ...stats
            };
        });

        callback(studentsWithAttendance);
    });

    return () => unsubscribe();
};

// ==================== ADMIN ATTENDANCE ====================

/**
 * Get all courses with attendance statistics (Admin view)
 * @param {Function} callback - Callback receiving all courses with stats
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllCoursesAttendance = (callback) => {
    const coursesRef = collection(db, COURSES_COLLECTION);

    const unsubscribe = onSnapshot(coursesRef, async (snapshot) => {
        const courses = [];
        const courseIds = [];
        
        snapshot.forEach((doc) => {
            const courseData = doc.data();
            courses.push({
                id: doc.id,
                courseId: courseData.courseId,
                courseName: courseData.courseName,
                instructorName: courseData.instructorName,
                capacity: courseData.capacity,
                SelectDays: courseData.SelectDays,
                Time: courseData.Time,
                RoomNumber: courseData.RoomNumber
            });
            courseIds.push(courseData.courseId);
        });

        // Get attendance records for all courses
        const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
        
        // Use 'in' query with chunks of 10
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < courseIds.length; i += chunkSize) {
            chunks.push(courseIds.slice(i, i + chunkSize));
        }

        let allAttendanceRecords = [];
        
        for (const chunk of chunks) {
            if (chunk.length > 0) {
                const attendanceQuery = query(attendanceRef, where('courseId', 'in', chunk));
                const attendanceSnapshot = await getDocs(attendanceQuery);
                
                attendanceSnapshot.forEach((doc) => {
                    allAttendanceRecords.push({ id: doc.id, ...doc.data() });
                });
            }
        }

        // Get enrollment counts for each course
        const enrollmentsRef = collection(db, ENROLLMENTS_COLLECTION);
        const enrollmentPromises = courseIds.map(async (courseId) => {
            const enrollmentQuery = query(enrollmentsRef, where('courseId', '==', courseId));
            const enrollmentSnapshot = await getDocs(enrollmentQuery);
            return enrollmentSnapshot.size;
        });

        const enrollmentCounts = await Promise.all(enrollmentPromises);

        // Calculate stats for each course
        const coursesWithStats = courses.map((course, index) => {
            const courseAttendance = allAttendanceRecords.filter(r => r.courseId === course.courseId);
            const stats = calculateAttendanceStats(courseAttendance);
            
            return {
                ...course,
                totalStudents: enrollmentCounts[index],
                ...stats
            };
        });

        // Calculate overall statistics
        const totalRecords = coursesWithStats.reduce((sum, c) => sum + c.totalRecords, 0);
        const totalPresent = coursesWithStats.reduce((sum, c) => sum + c.presentCount, 0);
        const overallAttendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

        callback({
            courses: coursesWithStats,
            overallStats: {
                totalCourses: courses.length,
                totalRecords,
                totalPresent,
                overallAttendanceRate
            }
        });
    });

    return () => unsubscribe();
};

// ==================== ATTENDANCE OPERATIONS ====================

/**
 * Record attendance for a student
 * @param {Object} attendanceData - Attendance data
 * @returns {Promise<Object>} Result with success status and record ID
 */
export const recordAttendance = async (attendanceData) => {
    const {
        studentId,
        studentName,
        studentCode,
        courseId,
        courseName,
        status,
        recordedBy
    } = attendanceData;

    // Validation
    if (!studentId || !courseId || !status) {
        return { success: false, error: 'Student ID, Course ID, and status are required' };
    }

    if (!['present', 'late', 'absent'].includes(status)) {
        return { success: false, error: "Status must be 'present', 'late', or 'absent'" };
    }

    try {
        const newAttendance = {
            studentId,
            studentName: studentName || '',
            studentCode: studentCode || '',
            courseId,
            courseName: courseName || '',
            status,
            date: new Date().toISOString().split('T')[0],
            timestamp: serverTimestamp(),
            recordedBy: recordedBy || ''
        };

        const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), newAttendance);
        
        return {
            success: true,
            id: docRef.id,
            message: 'Attendance recorded successfully'
        };
    } catch (error) {
        console.error('Error recording attendance:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark attendance for multiple students at once
 * @param {string} courseId - Course ID
 * @param {Array} students - Array of {studentId, studentName, studentCode, status}
 * @param {string} recordedBy - Instructor UID who recorded attendance
 * @returns {Promise<Object>} Results for each student
 */
export const markBulkAttendance = async (courseId, students, recordedBy) => {
    if (!courseId || !students || students.length === 0) {
        return { success: false, error: 'Course ID and students are required' };
    }

    try {
        // Get course name
        const coursesRef = collection(db, COURSES_COLLECTION);
        const courseQuery = query(coursesRef, where('courseId', '==', courseId));
        const courseSnapshot = await getDocs(courseQuery);
        
        let courseName = '';
        if (!courseSnapshot.empty) {
            courseName = courseSnapshot.docs[0].data().courseName;
        }

        const results = [];
        const date = new Date().toISOString().split('T')[0];

        for (const student of students) {
            try {
                const attendanceData = {
                    studentId: student.studentId,
                    studentName: student.studentName || '',
                    studentCode: student.studentCode || '',
                    courseId,
                    courseName,
                    status: student.status,
                    date,
                    timestamp: serverTimestamp(),
                    recordedBy
                };

                await addDoc(collection(db, ATTENDANCE_COLLECTION), attendanceData);
                results.push({ success: true, studentId: student.studentId });
            } catch (error) {
                results.push({ success: false, studentId: student.studentId, error: error.message });
            }
        }

        return {
            success: true,
            message: 'Attendance marked for all students',
            results
        };
    } catch (error) {
        console.error('Error marking bulk attendance:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update an attendance record
 * @param {string} recordId - Attendance record ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Result with success status
 */
export const updateAttendanceRecord = async (recordId, updates) => {
    if (!recordId) {
        return { success: false, error: 'Record ID is required' };
    }

    const allowedFields = ['status', 'studentName', 'studentCode', 'courseName'];
    const validUpdates = {};
    
    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            validUpdates[key] = updates[key];
        }
    });

    if (Object.keys(validUpdates).length === 0) {
        return { success: false, error: 'No valid fields to update' };
    }

    try {
        const recordRef = doc(db, ATTENDANCE_COLLECTION, recordId);
        await updateDoc(recordRef, validUpdates);
        
        return {
            success: true,
            message: 'Attendance record updated successfully'
        };
    } catch (error) {
        console.error('Error updating attendance record:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete an attendance record
 * @param {string} recordId - Attendance record ID
 * @returns {Promise<Object>} Result with success status
 */
export const deleteAttendanceRecord = async (recordId) => {
    if (!recordId) {
        return { success: false, error: 'Record ID is required' };
    }

    try {
        await deleteDoc(doc(db, ATTENDANCE_COLLECTION, recordId));
        
        return {
            success: true,
            message: 'Attendance record deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        return { success: false, error: error.message };
    }
};

// ==================== SESSION MANAGEMENT ====================

/**
 * Get attendance sessions for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of unique session dates
 */
export const getCourseAttendanceSessions = async (courseId) => {
    if (!courseId) {
        return [];
    }

    const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(attendanceRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);

    const dates = new Set();
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
            dates.add(data.date);
        }
    });

    return Array.from(dates).sort().reverse();
};

/**
 * Get attendance records for a specific course session
 * @param {string} courseId - Course ID
 * @param {string} date - Session date (YYYY-MM-DD)
 * @returns {Promise<Array>} Attendance records for the session
 */
export const getSessionAttendance = async (courseId, date) => {
    if (!courseId || !date) {
        return [];
    }

    const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(
        attendanceRef, 
        where('courseId', '==', courseId),
        where('date', '==', date)
    );
    
    const snapshot = await getDocs(q);
    const records = [];
    snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
    });

    return records;
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get attendance risk level based on attendance rate
 * @param {number} attendanceRate - Attendance percentage
 * @returns {Object} Risk level information
 */
export const getAttendanceRiskLevel = (attendanceRate) => {
    if (attendanceRate < 50) {
        return { level: 'High Risk', color: '#ef4444', icon: '🔴' };
    } else if (attendanceRate < 75) {
        return { level: 'Medium Risk', color: '#f59e0b', icon: '🟡' };
    } else if (attendanceRate < 90) {
        return { level: 'Low Risk', color: '#10b981', icon: '🟢' };
    } else {
        return { level: 'Excellent', color: '#3b82f6', icon: '🔵' };
    }
};

export default {
    subscribeToStudentAttendance,
    getStudentOverallAttendance,
    subscribeToProfessorCourses,
    subscribeToCourseStudents,
    subscribeToAllCoursesAttendance,
    recordAttendance,
    markBulkAttendance,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    getCourseAttendanceSessions,
    getSessionAttendance,
    getAttendanceRiskLevel,
    calculateAttendanceStats
};