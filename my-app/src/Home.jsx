import React from 'react';
import './Home.css';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">YallaClass</div>
          <div className="nav-menu">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#about">About</a>
            <a href="#demo">Demo</a>
          </div>
          <div className="nav-buttons">
            <button className="btn-signin" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn-getstarted" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Smart Attendance Made Simple</h1>
          <p className="hero-subtitle">Streamline your university attendance with GPS-based check-ins, QR code student IDs, and real-time tracking.</p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate('/student')}>Student Portal</button>
            <button className="btn-secondary" onClick={() => navigate('/professor')}>Professor Portal</button>
            <button className="btn-outline">Mobile App</button>
          </div>
          
          {/* Stats */}
          <div className="stats">
            <div className="stat-item">
              <h2>10k+</h2>
              <p>Active Students</p>
            </div>
            <div className="stat-item">
              <h2>500+</h2>
              <p>Professors</p>
            </div>
            <div className="stat-item">
              <h2>50+</h2>
              <p>Universities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 className="section-title">Powerful Features</h2>
        <p className="section-subtitle">Everything you need for modern, efficient attendance management</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <h3>GPS-Based Check-In</h3>
            <p>Students can only mark attendance when physically present in the classroom using precise location verification.</p>
          </div>
          
          <div className="feature-card">
            <h3>Digital Student ID</h3>
            <p>Each student gets a unique QR code for quick identification and secure attendance marking.</p>
          </div>
          
          <div className="feature-card">
            <h3>Time Window</h3>
            <p>Professors activate a 10-minute attendance window, ensuring timely arrival and accurate records.</p>
          </div>
          
          <div className="feature-card">
            <h3>Real-Time Analytics</h3>
            <p>Track attendance patterns, view statistics, and generate reports with beautiful visualizations.</p>
          </div>
          
          <div className="feature-card">
            <h3>Course Management</h3>
            <p>Easy course registration and management with real-time student lists and attendance tracking.</p>
          </div>
          
          <div className="feature-card">
            <h3>Mobile App</h3>
            <p>Access everything on-the-go with our mobile-friendly interface and dedicated apps.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Simple, fast, and secure</p>
        
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Professor Activates</h3>
            <p>Professor opens attendance for the class with a 10-minute window</p>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <h3>Location Verified</h3>
            <p>Students check in only when physically present in the classroom</p>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <h3>Recorded Instantly</h3>
            <p>Attendance is logged in real-time with complete accuracy</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>Ready to Get Started?</h2>
        <p>Join thousands of students and professors already using YallaClass</p>
        <button className="btn-primary btn-large" onClick={() => navigate('/signup')}>Student Sign Up</button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>YallaClass</h3>
            <p>Smart attendance system for modern universities</p>
          </div>
          
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#privacy">Privacy</a></li>
              <li><a href="#terms">Terms</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2026 YallaClass. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;