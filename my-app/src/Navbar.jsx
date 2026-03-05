import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();

  // التحقق لو إحنا في أي صفحة داشبورد (أدمن، دكتور، طالب)
  const isDashboard = location.pathname.startsWith('/AdminDashboard') || 
                      location.pathname.startsWith('/professorDashboard') || 
                      location.pathname.startsWith('/studentDashboard');

  return (
    <nav className="navbar-container">
      <div className="logo-text">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>YallaClass</Link>
      </div>

      <div className="nav-links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#about">About</a>
        <a href="#demo">Demo</a>
      </div>

      {/* الأزرار بتظهر فقط لو مش في صفحات الداشبورد */}
      {!isDashboard && (
        <div className="nav-buttons">
          <Link to="/login">
            <button className="btn-signin">Sign In</button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;