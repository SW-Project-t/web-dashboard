import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();


  const isDashboard = location.pathname.startsWith('/AdminDashboard') || 
                      location.pathname.startsWith('/ProfessorDashboard') || 
                      location.pathname.startsWith('/StudentDashboard') ||
                      location.pathname.startsWith('/login') ;


  return (
    <nav className="navbar-container">
      <div className="logo-text">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>YallaClass</Link>
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
       <Link to="/contact">Contact</Link>
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