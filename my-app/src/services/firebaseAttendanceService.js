
import { db } from '../firebase';
import { 
  collection, query, where, getDocs, onSnapshot, 
  doc, getDoc, setDoc, deleteDoc, updateDoc, 
  orderBy, serverTimestamp, addDoc 
} from 'firebase/firestore';


const ALLOWED_RADIUS = 30; 




export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const deltaP = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};














export const startLiveAttendanceSession = async (courseId, courseName, professorId, professorName, latitude, longitude, attendanceCode) => {
  try {
    const sessionData = {
      courseId,
      courseName,
      professorId,
      professorName,
      attendanceCode,
      latitude,
      longitude,
      isActive: true,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 60000) 
    };
    
    await setDoc(doc(db, "active_sessions", courseId), sessionData);
    return { success: true, sessionData };
  } catch (error) {
    console.error("Error starting session:", error);
    return { success: false, error: error.message };
  }
};






export const endLiveAttendanceSession = async (courseId) => {
  try {
    await deleteDoc(doc(db, "active_sessions", courseId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};






export const isSessionActive = async (courseId) => {
  try {
    const sessionRef = doc(db, "active_sessions", courseId);
    const sessionSnap = await getDoc(sessionRef);
    return sessionSnap.exists() && sessionSnap.data().isActive;
  } catch (error) {
    return false;
  }
};






export const getActiveSession = async (courseId) => {
  try {
    const sessionRef = doc(db, "active_sessions", courseId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      return { id: sessionSnap.id, ...sessionSnap.data() };
    }
    return null;
  } catch (error) {
    return null;
  }
};






export const getProfessorActiveSessions = async (professorId) => {
  try {
    const q = query(collection(db, "active_sessions"), where("professorId", "==", professorId));
    const snapshot = await getDocs(q);
    const sessions = {};
    snapshot.forEach(doc => {
      sessions[doc.id] = doc.data();
    });
    return sessions;
  } catch (error) {
    return {};
  }
};







export const subscribeToProfessorSessions = (professorId, callback) => {
  const q = query(collection(db, "active_sessions"), where("professorId", "==", professorId));
  return onSnapshot(q, (snapshot) => {
    const sessions = {};
    snapshot.forEach(doc => {
      sessions[doc.id] = { id: doc.id, ...doc.data() };
    });
    callback(sessions);
  });
};













export const studentCheckIn = async (courseId, courseName, studentId, studentName, studentLatitude, studentLongitude) => {
  try {
    
    const sessionRef = doc(db, "active_sessions", courseId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists() || !sessionSnap.data().isActive) {
      throw new Error("No active attendance session for this course");
    }
    
    const sessionData = sessionSnap.data();
    
    
    const distance = calculateDistance(
      studentLatitude,
      studentLongitude,
      sessionData.latitude,
      sessionData.longitude
    );
    
    
    if (distance > ALLOWED_RADIUS) {
      throw new Error(`You are ${Math.round(distance)} meters away. Must be within ${ALLOWED_RADIUS} meters of the classroom.`);
    }
    
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId),
      where("timestamp", ">=", today)
    );
    const existingSnap = await getDocs(checkQuery);
    
    if (!existingSnap.empty) {
      throw new Error("You have already checked in for this course today");
    }
    
    
    let status = "Present";
    const currentHour = new Date().getHours();
    
    if (currentHour >= 9 && new Date().getMinutes() > 15) {
      status = "Late";
    }
    
    
    const attendanceRecord = {
      studentId,
      studentName,
      courseId,
      courseName,
      status,
      distanceFromClass: Math.round(distance),
      timestamp: serverTimestamp(),
      sessionCode: sessionData.attendanceCode
    };
    
    await addDoc(collection(db, "attendance"), attendanceRecord);
    
    
    await updateCourseAttendanceStats(courseId, sessionData.professorId, status);
    
    return { 
      success: true, 
      status, 
      distance: Math.round(distance),
      message: `Checked in successfully! Status: ${status}`
    };
  } catch (error) {
    console.error("Check-in error:", error);
    return { success: false, error: error.message };
  }
};







export const updateCourseAttendanceStats = async (courseId, professorId, status) => {
  try {
    const q = query(
      collection(db, "professorCourses"),
      where("professorId", "==", professorId),
      where("courseId", "==", courseId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const currentData = snapshot.docs[0].data();
      
      const updateData = {};
      if (status === 'Present') {
        updateData.todayPresent = (currentData.todayPresent || 0) + 1;
      } else if (status === 'Late') {
        updateData.todayLate = (currentData.todayLate || 0) + 1;
      } else if (status === 'Absent') {
        updateData.todayAbsent = (currentData.todayAbsent || 0) + 1;
      }
      
      
      const total = (currentData.todayPresent || 0) + (currentData.todayLate || 0) + (currentData.todayAbsent || 0) + 1;
      const presentCount = (currentData.todayPresent || 0) + (status === 'Present' ? 1 : 0);
      const avgAttendance = Math.round((presentCount / total) * 100);
      updateData.avgAttendance = avgAttendance;
      
      await updateDoc(docRef, updateData);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};








export const getCourseAttendance = async (courseId) => {
  try {
    const q = query(collection(db, "attendance"), where("courseId", "==", courseId), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    return [];
  }
};






export const getTodayAttendance = async (courseId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const q = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId),
      where("timestamp", ">=", today),
      where("timestamp", "<", tomorrow)
    );
    
    const snapshot = await getDocs(q);
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    return [];
  }
};







export const getStudentCourseAttendance = async (studentId, courseId) => {
  try {
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    const totalClasses = records.length;
    const presentClasses = records.filter(r => r.status === 'Present').length;
    const attendanceRate = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
    
    return {
      records,
      totalClasses,
      presentClasses,
      attendanceRate
    };
  } catch (error) {
    return { records: [], totalClasses: 0, presentClasses: 0, attendanceRate: 0 };
  }
};







export const subscribeToStudentAttendance = (studentId, callback) => {
  const q = query(
    collection(db, "attendance"),
    where("studentId", "==", studentId),
    orderBy("timestamp", "desc")
  );
  
  return onSnapshot(q, async (snapshot) => {
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    
    const coursesMap = new Map();
    records.forEach(record => {
      if (!coursesMap.has(record.courseId)) {
        coursesMap.set(record.courseId, {
          id: record.courseId,
          name: record.courseName,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          totalRecords: 0,
          records: []
        });
      }
      const course = coursesMap.get(record.courseId);
      if (record.status === 'Present') course.presentCount++;
      else if (record.status === 'Late') course.lateCount++;
      else if (record.status === 'Absent') course.absentCount++;
      course.totalRecords++;
      course.records.push(record);
      course.attendanceRate = Math.round((course.presentCount / course.totalRecords) * 100);
      course.absenceRate = 100 - course.attendanceRate;
    });
    
    const coursesArray = Array.from(coursesMap.values());
    callback(coursesArray);
  });
};






export const subscribeToAllCoursesAttendance = (callback) => {
  const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
  
  return onSnapshot(q, async (snapshot) => {
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    
    const coursesMap = new Map();
    records.forEach(record => {
      if (!coursesMap.has(record.courseId)) {
        coursesMap.set(record.courseId, {
          courseId: record.courseId,
          courseName: record.courseName,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          totalRecords: 0,
          records: []
        });
      }
      const course = coursesMap.get(record.courseId);
      if (record.status === 'Present') course.presentCount++;
      else if (record.status === 'Late') course.lateCount++;
      else if (record.status === 'Absent') course.absentCount++;
      course.totalRecords++;
      course.attendanceRate = Math.round((course.presentCount / course.totalRecords) * 100);
    });
    
    const coursesArray = Array.from(coursesMap.values());
    
    
    const totalCourses = coursesArray.length;
    const totalStudents = await getTotalStudentsCount();
    const totalPresent = coursesArray.reduce((sum, c) => sum + c.presentCount, 0);
    const totalRecords = coursesArray.reduce((sum, c) => sum + c.totalRecords, 0);
    const overallAttendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
    
    callback({
      courses: coursesArray,
      overallStats: {
        totalCourses,
        totalStudents,
        totalPresent,
        totalRecords,
        overallAttendanceRate
      }
    });
  });
};





const getTotalStudentsCount = async () => {
  try {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    return 0;
  }
};








export const getAttendanceReport = async (courseId, startDate, endDate) => {
  try {
    const q = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    const records = [];
    const studentStats = new Map();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      records.push({ id: doc.id, ...data });
      
      if (!studentStats.has(data.studentId)) {
        studentStats.set(data.studentId, {
          name: data.studentName,
          present: 0,
          late: 0,
          absent: 0
        });
      }
      const stats = studentStats.get(data.studentId);
      if (data.status === 'Present') stats.present++;
      else if (data.status === 'Late') stats.late++;
      else if (data.status === 'Absent') stats.absent++;
      studentStats.set(data.studentId, stats);
    });
    
    return {
      records,
      studentStats: Object.fromEntries(studentStats),
      totalRecords: records.length
    };
  } catch (error) {
    return { records: [], studentStats: {}, totalRecords: 0 };
  }
};

export default {
  calculateDistance,
  startLiveAttendanceSession,
  endLiveAttendanceSession,
  isSessionActive,
  getActiveSession,
  getProfessorActiveSessions,
  subscribeToProfessorSessions,
  studentCheckIn,
  updateCourseAttendanceStats,
  getCourseAttendance,
  getTodayAttendance,
  getStudentCourseAttendance,
  subscribeToStudentAttendance,
  subscribeToAllCoursesAttendance,
  getAttendanceReport
};