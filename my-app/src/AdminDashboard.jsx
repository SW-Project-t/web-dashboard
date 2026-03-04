import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const navigate = useNavigate();
  // بيانات التنبيهات
  const alerts = [
    {
      id: 1,
      message: "Server maintenance scheduled for tonight at 11 PM",
      time: "2 hours ago",
      type: "warning"
    },
    {
      id: 2,
      message: "New semester registration opens tomorrow",
      time: "5 hours ago",
      type: "info"
    },
    {
      id: 3,
      message: "Database backup completed successfully!",
      time: "1 day ago",
      type: "success"
    }
  ];

  
  const departments = [
    { name: 'Engineering', count: 2156, color: '#4caf50' },
    { name: 'Business', count: 1987, color: '#2196f3' },
    { name: 'Medicine', count: 1654, color: '#f44336' },
    { name: 'Arts', count: 1234, color: '#9c27b0' },
    { name: 'Others', count: 858, color: '#ff9800' }
  ];

  
  const users = [
    { id: '202201234', name: 'Ahmed Hassan', role: 'Student', department: 'Computer Science', status: 'active' },
    { id: '202201235', name: 'Fatima Ali', role: 'Student', department: 'Engineering', status: 'active' },
    { id: 'PROF001', name: 'Dr. Sarah Ahmed', role: 'Professor', department: 'Computer Science', status: 'active' },
    { id: '202201236', name: 'Omar Khan', role: 'Student', department: 'Business', status: 'active' },
    { id: 'PROF002', name: 'Dr. Mohammed Ali', role: 'Professor', department: 'Engineering', status: 'active' }
  ];

  
  const courses = [
    { code: 'CS401', name: 'Data Structures', professor: 'Dr. Sarah Ahmed', students: 45, status: 'active' },
    { code: 'CS402', name: 'Algorithms', professor: 'Dr. Mohammed Ali', students: 38, status: 'active' },
    { code: 'CS403', name: 'Database Systems', professor: 'Dr. Fatima Khan', students: 42, status: 'active' },
    { code: 'ENG201', name: 'Thermodynamics', professor: 'Dr. Omar Hassan', students: 52, status: 'active' }
  ];

  
  const quickActions = [
    { name: 'Export All Data', icon: '📤', color: '#28a745' },
    { name: 'Manage Permissions', icon: '🔐', color: '#17a228' },
    { name: 'View Departments', icon: '🏢', color: '#ffc107' },
    { name: 'Course Catalog', icon: '📚', color: '#dc3545' }
  ];

   
  const systemMetrics = [
    { name: 'Server Load', value: 32, color: '#4caf50' },
    { name: 'Database Usage', value: 68, color: '#2196f3' },
    { name: 'Memory Usage', value: 85, color: '#ff9800' }
  ];

  const totalStudents = departments.reduce((sum, dept) => sum + dept.count, 0);

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>
            Yalla<span>Class</span>
          </h2>
          <p className="sidebar-subtitle">Admin Panel</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className="active">
              <span className="icon">📊</span>
              <span>Dashboard</span>
            </li>
            <li>
              <span className="icon">👥</span>
              <span>All Users</span>
            </li>
            <li>
              <span className="icon">📚</span>
              <span>Courses</span>
            </li>
            <li>
              <span className="icon">📈</span>
              <span>Analytics</span>
            </li>
            <li>
              <span className="icon">⚙️</span>
              <span>Settings</span>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn">Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <button 
            className="menu-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <div className="header-left">
             <p className="header-subtitle">Admin Dashboard & System Management</p>
          </div>
          <div className="header-right">
            <div className="search-box">
              <input type="text" placeholder="Search users..." />
              <span className="search-icon">🔍</span>
            </div>
            <div className="user-avatar">👤</div>
          </div>
        </header>
        <div className="grid-2col">
          <div className="card">
            <h3 className="card-title">System Alerts</h3>
            <div className="alerts-list">
              {alerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.type}`}>
                  <div className="alert-content">
                    <p className="alert-message">{alert.message}</p>
                    <span className="alert-time">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="card-title">Students by Department</h3>
            <div className="stats-list">
              {departments.map(dept => (
                <div key={dept.name} className="stat-item">
                  <div className="stat-label">
                    <span className="dept-name">{dept.name}</span>
                    <span className="dept-count">{dept.count.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${(dept.count / totalStudents) * 100}%`,
                        backgroundColor: dept.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid-2col">
          <div className="card span-2">
            <div className="card-header">
              <h3 className="card-title">Recent Users</h3>
              <button 
              className="btn-primary"
              onClick={()=>navigate('/Admin')}
              >Add User</button>
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
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.role}</td>
                      <td>{user.department}</td>
                      <td>
                        <span className={`status-badge ${user.status}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-btn">👁️</button>
                          <button className="icon-btn">✏️</button>
                          <button className="icon-btn">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="card-footer">
              <button className="btn-success">Export All Data</button>
              <button className="btn-info">Manage Permissions</button>
              <button className="btn-warning">View Departments</button>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title">Quick Actions</h3>
            <div className="actions-grid">
              {quickActions.map(action => (
                <button 
                  key={action.name} 
                  className="action-card"
                  style={{ backgroundColor: action.color }}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-name">{action.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid-2col">
          <div className="card span-2">
            <div className="card-header">
              <h3 className="card-title">Recent Courses</h3>
              <button className="btn-primary">Add Course</button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Professor</th>
                    <th>Students</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course.code}>
                      <td>{course.code}</td>
                      <td>{course.name}</td>
                      <td>{course.professor}</td>
                      <td>{course.students}</td>
                      <td>
                        <span className={`status-badge ${course.status}`}>
                          {course.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-btn">👁️</button>
                          <button className="icon-btn">✏️</button>
                          <button className="icon-btn">📊</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">System Status</h3>
            <div className="metrics-list">
              {systemMetrics.map(metric => (
                <div key={metric.name} className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">{metric.name}</span>
                    <span className="metric-value">{metric.value}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${metric.value}%`,
                        backgroundColor: metric.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="dashboard-footer">
          <p>© 2026 Yalla Class. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;