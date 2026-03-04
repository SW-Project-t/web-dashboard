import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import axios from 'axios';

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

 
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);

  const [newUserData, setNewUserData] = useState({
    fullName: '', email: '', password: '', role: '',
    academicYear: '', code: '', department: '', phoneNumber: ''
  });

  const [newCourseData, setNewCourseData] = useState({
    courseId: '', courseName: '', instructorName: '',
    days: '', time: '', roomNumber: '', capacity: ''
  });

  const [alerts, setAlerts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]); 
  
  const quickActions = [
    { name: 'Add Course', color: '#673ab7', action: () => setIsAddCourseModalOpen(true) },
    { name: 'Export All Data', color: '#28a745', action: () => {} },
    { name: 'Manage Permissions', color: '#17a228', action: () => {} },
    { name: 'View Departments', color: '#ffc107', action: () => {} }
  ];

  const totalStudents = departments.length > 0 
    ? departments.reduce((sum, dept) => sum + dept.count, 0) 
    : 1; 

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const userDataToSend = {
        email: newUserData.email,
        password: newUserData.password,
        fullName: newUserData.fullName,
        role: newUserData.role,
        academicYear: newUserData.academicYear,
        department: newUserData.department,
        phoneNumber: newUserData.phoneNumber,
        code: newUserData.code
      };
    const hasEmptyField = Object.values(userDataToSend).some(value => value.trim() === "");
    if (hasEmptyField) {
      alert("Please fill in all fields.");
      return;
    }
    try {
      const response = await axios.post('http://localhost:3001/admin/add-user', userDataToSend);
      if (response.data.success) {
        alert("User added successfully!");
        setIsAddUserModalOpen(false);
        setNewUserData({
          fullName: '', email: '', password: '', role: '',
          academicYear: '',department: '', phoneNumber: '', code: '' });
      }
    } catch (error) {
      console.error("Error adding user:", error);
      alert(error.response?.data?.error || "Something went wrong");
   }
  };
  const handleCourseInputChange = (e) => {
    const { name, value } = e.target;
    setNewCourseData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCourseSubmit = (e) => {
    e.preventDefault();
    console.log("New Course Data:", newCourseData);
    setIsAddCourseModalOpen(false);
    setNewCourseData({
      courseId: '', courseName: '', instructorName: '',
      days: '', time: '', roomNumber: '', capacity: ''
    });
  };

  return (
    <div className="dashboard-container">
    
      {isAddUserModalOpen && (
        <div className="modal-overlay">
          <div className="modern-modal-content" dir="rtl">
            <div className="modern-modal-header">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7e57c2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              <h2>Add User</h2>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="modern-form">
              <input type="text" name="fullName" className="modern-input" value={newUserData.fullName} onChange={handleUserInputChange} placeholder="Full Name" required />

              <div className="modern-form-row">
                <input type="email" name="email" className="modern-input" value={newUserData.email} onChange={handleUserInputChange} placeholder="Email" required />
                <input type="password" name="password" className="modern-input" value={newUserData.password} onChange={handleUserInputChange} placeholder="Password" required />
              </div>

              <div className="modern-form-row">
                <select name="role" className={`modern-input ${newUserData.role === "" ? "placeholder-select" : ""}`} value={newUserData.role} onChange={handleUserInputChange} required>
                  <option value="" disabled hidden>Choose Role</option>
                  <option value="Student">Student</option>
                  <option value="Instructor">Instructor</option>
                  <option value="Assistant">Admin</option>
                </select>
                <input type="text" name="department" className="modern-input" value={newUserData.department} onChange={handleUserInputChange} placeholder="Department" />
              </div>

              <div className="modern-form-row">
                <input type="text" name="academicYear" className="modern-input" value={newUserData.academicYear} onChange={handleUserInputChange} placeholder="Academic Year (e.g., 2024)" />
                <input type="text" name="code" className="modern-input" value={newUserData.code} onChange={handleUserInputChange} placeholder="Code" />
              </div>

              <input type="tel" name="phoneNumber" className="modern-input" value={newUserData.phoneNumber} onChange={handleUserInputChange} placeholder="Phone Number" required />

              <div className="modern-modal-actions">
                <button type="submit" className="modern-btn-primary">Add User</button>
                <button type="button" className="modern-btn-secondary" onClick={() => setIsAddUserModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddCourseModalOpen && (
        <div className="modal-overlay">
          <div className="modern-modal-content">
            <div className="modern-modal-header">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7e57c2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <h2>Add New Course</h2>
            </div>
            
            <form onSubmit={handleAddCourseSubmit} className="modern-form">
              <input type="text" name="courseId" className="modern-input" value={newCourseData.courseId} onChange={handleCourseInputChange} placeholder="Course ID (e.g., CS404)" required />
              <input type="text" name="courseName" className="modern-input" value={newCourseData.courseName} onChange={handleCourseInputChange} placeholder="Course Name (e.g., Web Development)" required />
              <input type="text" name="instructorName" className="modern-input" value={newCourseData.instructorName} onChange={handleCourseInputChange} placeholder="Instructor Name" required />
              
              <select name="days" className={`modern-input ${newCourseData.days === "" ? "placeholder-select" : ""}`} value={newCourseData.days} onChange={handleCourseInputChange} required>
                <option value="" disabled hidden>Select Days</option>
                <option value="Sunday">Sunday</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
              </select>

              <input type="text" name="time" className="modern-input" value={newCourseData.time} onChange={handleCourseInputChange} placeholder="Time (e.g., 1:00 PM)" required />
              <input type="text" name="roomNumber" className="modern-input" value={newCourseData.roomNumber} onChange={handleCourseInputChange} placeholder="Room Number (e.g., 201)" required />
              <input type="number" name="capacity" className="modern-input" value={newCourseData.capacity} onChange={handleCourseInputChange} placeholder="Capacity (e.g., 50)" required />

              <div className="modern-modal-actions" style={{ marginTop: '10px' }}>
                <button type="submit" className="modern-btn-primary">Add</button>
                <button type="button" className="modern-btn-secondary" onClick={() => setIsAddCourseModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Yalla<span>Class</span></h2>
          <p className="sidebar-subtitle">Admin Panel</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className="active"><span>Dashboard</span></li>
            <li><span>All Users</span></li>
            <li><span>Courses</span></li>
            <li><span>Analytics</span></li>
            <li><span>Settings</span></li>
          </ul>
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <button className="logout-btn" style={{ display: 'block', width: '100%', padding: '10px', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '6px', color: '#d32f2f', cursor: 'pointer', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} style={{fontSize: '24px', lineHeight: '1', padding: '0 10px'}}>
            ☰
          </button>
          <div className="header-left">
             <p className="header-subtitle" style={{ margin: 0, color: '#666', fontWeight: 500 }}>Admin Dashboard & System Management</p>
          </div>
          <div className="header-right">
            <div className="search-box">
              <input type="text" placeholder="Search users..." />
            </div>
            <div className="user-avatar" style={{ cursor: 'pointer', color: '#fff', background: '#2196f3', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              AD
            </div>
          </div>
        </header>

        <div className="grid-2col">
          <div className="card">
            <h3 className="card-title">System Alerts</h3>
            <div className="alerts-list">
              {alerts.length === 0 ? (
                <p className="empty-state">No active alerts at this time.</p>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className={`alert-item ${alert.type}`}>
                    <div className="alert-content">
                      <p className="alert-message">{alert.message}</p>
                      <span className="alert-time">{alert.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="card">
            <h3 className="card-title">Students by Department</h3>
            <div className="stats-list">
              {departments.length === 0 ? (
                <p className="empty-state">No department statistics available.</p>
              ) : (
                departments.map(dept => (
                  <div key={dept.name} className="stat-item">
                    <div className="stat-label">
                      <span className="dept-name">{dept.name}</span>
                      <span className="dept-count">{dept.count.toLocaleString()}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(dept.count / totalStudents) * 100}%`, backgroundColor: dept.color }}/>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid-2col">
          
          <div className="card span-2 custom-card-border">
            <div className="card-header">
              <h3 className="card-title">Recent Users</h3>
              <button 
                className="btn-primary"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                Add User
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">No users found. Data will appear here once loaded.</td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.role}</td>
                        <td>{user.department}</td>
                        <td><span className={`status-badge ${user.status}`}>{user.status}</span></td>
                        <td>
                          <div className="action-buttons">
                            <button className="icon-btn text-action" style={{fontSize: '13px', color: '#2196f3'}}>عرض</button>
                            <button className="icon-btn text-action" style={{fontSize: '13px', color: '#4caf50'}}>تعديل</button>
                            <button className="icon-btn text-action" style={{fontSize: '13px', color: '#f44336'}}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card span-2 custom-card-border">
            <div className="card-header">
              <h3 className="card-title">Recent Courses</h3>
              <button 
                className="btn-primary"
                onClick={() => setIsAddCourseModalOpen(true)}>
                Add Course
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course ID</th>
                    <th>Course Name</th>
                    <th>Instructor</th>
                    <th>Days</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">No courses found. Data will appear here once loaded.</td>
                    </tr>
                  ) : (
                    courses.map(course => (
                      <tr key={course.id}>
                        <td>{course.courseId}</td>
                        <td>{course.courseName}</td>
                        <td>{course.instructorName}</td>
                        <td>{course.days}</td>
                        <td>{course.time}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="icon-btn text-action" style={{fontSize: '13px', color: '#2196f3'}}>عرض</button>
                            <button className="icon-btn text-action" style={{fontSize: '13px', color: '#4caf50'}}>تعديل</button>
                            <button className="icon-btn text-action" style={{fontSize: '13px', color: '#f44336'}}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card span-2">
            <h3 className="card-title">Quick Actions</h3>
            <div className="actions-grid">
              {quickActions.map(action => (
                <button 
                  key={action.name} 
                  className="action-card" 
                  style={{ backgroundColor: action.color, textAlign: 'center', justifyContent: 'center' }}
                  onClick={action.action}
                >
                  <span className="action-name">{action.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;