import React from 'react';
import './Footer.css';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="custom-footer">
      
      <div className="footer-copyright">
        © 2026 <Link to="/">YallaClass™</Link>. All Rights Reserved.
      </div>
      <ul className="footer-links">
        <li><Link to="/about">About</Link></li>
        <li><Link to="/privacy">Privacy Policy</Link></li>
        <li><Link to="/licensing">Licensing</Link></li>
        <li><Link to="/contact">Contact</Link></li>
      </ul>
    </footer>
  );
};

export default Footer;