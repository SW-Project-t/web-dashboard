import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar-container">
      <div className="logo-section">
        <span className="logo-text">YallaClass</span>
      </div>
      <div className="nav-links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#about">About</a>
        <a href="#demo">Demo</a>
      </div>
        <div className="nav-buttons">
        <Link to="/Login" className="btn-signin">Sign In</Link>
      </div>
    </nav>
  );
};

export default Navbar;