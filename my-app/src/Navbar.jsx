import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

// Icons as SVG components
const Icons = {
  GraduationCap: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  Menu: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
};

const IconComponent = ({ name, className = '' }) => {
  const Icon = Icons[name];
  return Icon ? <span className={className}><Icon /></span> : null;
};

const Navbar = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDashboard = location.pathname.startsWith('/AdminDashboard') || 
                      location.pathname.startsWith('/ProfessorDashboard') || 
                      location.pathname.startsWith('/StudentDashboard') ||
                      location.pathname.startsWith('/login');

  // Check if we're on home page
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const isActiveLink = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <nav className={`yc-navbar ${isScrolled || !isHomePage ? 'yc-scrolled' : ''} ${isDashboard ? 'yc-dashboard-nav' : ''}`}>
      <div className="yc-nav-container">
        {/* Logo */}
        <Link to="/" className="yc-nav-logo">
          <div className={`yc-logo-icon ${isScrolled || !isHomePage ? 'yc-scrolled' : ''}`}>
            <IconComponent name="GraduationCap" />
          </div>
          <span className={`yc-logo-text ${isScrolled || !isHomePage ? 'yc-scrolled' : ''}`}>
            Yalla<span className="yc-logo-highlight">Class</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="yc-nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={`yc-nav-link ${isScrolled || !isHomePage ? 'yc-scrolled' : ''} ${isActiveLink(link.href) ? 'yc-active' : ''}`}
            >
              {link.name}
              {isActiveLink(link.href) && <span className="yc-link-indicator" />}
            </Link>
          ))}
        </div>

        {/* Desktop Buttons */}
        {!isDashboard && (
          <div className="yc-nav-buttons">
            <Link to="/login">
              <button className={`yc-btn-signin ${isScrolled || !isHomePage ? 'yc-scrolled' : ''}`}>
                Sign In
              </button>
            </Link>
            <Link to="/login">
              <button className="yc-btn-getstarted">
                Get Started
                <IconComponent name="ChevronRight" />
              </button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button 
          className={`yc-mobile-menu-btn ${isScrolled || !isHomePage ? 'yc-scrolled' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <IconComponent name={isMobileMenuOpen ? 'X' : 'Menu'} />
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`yc-mobile-menu ${isMobileMenuOpen ? 'yc-open' : ''}`}>
        <div className="yc-mobile-menu-content">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={`yc-mobile-link ${isActiveLink(link.href) ? 'yc-active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
          
          {!isDashboard && (
            <div className="yc-mobile-buttons">
              <Link to="/login">
                <button className="yc-btn-signin-mobile">
                  Sign In
                </button>
              </Link>
              <Link to="/login">
                <button className="yc-btn-getstarted-mobile">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
