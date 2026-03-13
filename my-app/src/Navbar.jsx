import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDigitalIDOpen, setIsDigitalIDOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for digital ID events
  useEffect(() => {
    const handleOpenDigitalID = () => setIsDigitalIDOpen(true);
    const handleCloseDigitalID = () => setIsDigitalIDOpen(false);

    window.addEventListener('openDigitalID', handleOpenDigitalID);
    window.addEventListener('closeDigitalID', handleCloseDigitalID);

    return () => {
      window.removeEventListener('openDigitalID', handleOpenDigitalID);
      window.removeEventListener('closeDigitalID', handleCloseDigitalID);
    };
  }, []);

  const isDashboard = location.pathname.startsWith('/AdminDashboard') || 
                      location.pathname.startsWith('/ProfessorDashboard') || 
                      location.pathname.startsWith('/StudentDashboard') ||
                      location.pathname.startsWith('/login');

  return (
    <nav className={`navbar-container ${isScrolled ? 'scrolled' : ''} ${isDigitalIDOpen ? 'hidden' : ''}`}>
      {/* 1. اللوجو على اليسار */}
      <div className="logo-section">
        <Link to="/" className="logo-link">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="logo-text">
            <span className="text-yalla">Yalla</span><span className="text-class">Class</span>
          </div>
        </Link>
      </div>

      {/* 2. الروابط في المنتصف */}
      <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <NavLink to="/" end onClick={() => setIsMobileMenuOpen(false)}>Home</NavLink>
        <NavLink to="/about" onClick={() => setIsMobileMenuOpen(false)}>About</NavLink>
        <NavLink to="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</NavLink>
      
      </div>
      <div className="nav-actions">
        {!isDashboard && (
          <Link to="/login" className="desktop-only-btn">
            <button className="btn-signin">Sign In</button>
          </Link>
        )}
        
        <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span></span><span></span><span></span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;