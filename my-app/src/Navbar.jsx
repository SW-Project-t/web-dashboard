import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();


  const isDashboard = location.pathname.startsWith('/AdminDashboard') || 
                      location.pathname.startsWith('/ProfessorDashboard') || 
                      location.pathname.startsWith('/StudentDashboard');

  return (
    <nav className="navbar-container">
      <div className="logo-text">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>YallaClass</Link>
      </div>

      <div className="nav-links">
        <a href="#features">Home</a>
        <a href="#how-it-works">Student Dashboard</a>
        <a href="#about">Admin Dashboard</a>
        <a href="#demo">Contact</a>
      </div>
      
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