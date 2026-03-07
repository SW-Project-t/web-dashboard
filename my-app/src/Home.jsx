import React from 'react';
import './Home.css';
import { useNavigate } from 'react-router-dom';

// Icons as SVG components
const Icons = {
  MapPin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  QrCode: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1"/>
      <rect width="5" height="5" x="16" y="3" rx="1"/>
      <rect width="5" height="5" x="3" y="16" rx="1"/>
      <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
      <path d="M21 21v.01"/>
      <path d="M12 7v3a1 1 0 0 1-1 1h-2"/>
      <path d="M12 12h.01"/>
      <path d="M12 17v4"/>
      <path d="M16 12h5"/>
    </svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  BarChart3: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M18 17V9"/>
      <path d="M13 17V5"/>
      <path d="M8 17v-3"/>
    </svg>
  ),
  BookOpen: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Smartphone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
      <path d="M12 18h.01"/>
    </svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  University: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  ),
  GraduationCap: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
};

const IconComponent = ({ name, className = '' }) => {
  const Icon = Icons[name];
  return Icon ? <span className={className}><Icon /></span> : null;
};

function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: 'MapPin',
      title: 'GPS-Based Check-In',
      description: 'Students can only mark attendance when physically present in the classroom using precise location verification.',
      gradient: 'yc-from-blue-500-to-cyan-500',
    },
    {
      icon: 'QrCode',
      title: 'Digital Student ID',
      description: 'Each student gets a unique QR code for quick identification and secure attendance marking.',
      gradient: 'yc-from-cyan-500-to-teal-500',
    },
    {
      icon: 'Clock',
      title: 'Time Window Control',
      description: 'Professors activate a 10-minute attendance window, ensuring timely arrival and accurate records.',
      gradient: 'yc-from-purple-500-to-blue-500',
    },
    {
      icon: 'BarChart3',
      title: 'Real-Time Analytics',
      description: 'Track attendance patterns, view statistics, and generate reports with beautiful visualizations.',
      gradient: 'yc-from-pink-500-to-purple-500',
    },
    {
      icon: 'BookOpen',
      title: 'Course Management',
      description: 'Easy course registration and management with real-time student lists and attendance tracking.',
      gradient: 'yc-from-orange-500-to-pink-500',
    },
    {
      icon: 'Smartphone',
      title: 'Mobile App',
      description: 'Access everything on-the-go with our mobile-friendly interface and dedicated apps.',
      gradient: 'yc-from-teal-500-to-green-500',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Professor Activates',
      description: 'Professor opens attendance for the class with a 10-minute window',
    },
    {
      number: '02',
      title: 'Location Verified',
      description: 'Students check in only when physically present in the classroom',
    },
    {
      number: '03',
      title: 'Recorded Instantly',
      description: 'Attendance is logged in real-time with complete accuracy',
    },
  ];

  const stats = [
    { icon: 'Users', value: '10,000+', label: 'Active Students', color: 'yc-from-cyan-400-to-blue-400' },
    { icon: 'Users', value: '500+', label: 'Professors', color: 'yc-from-blue-400-to-purple-400' },
    { icon: 'University', value: '50+', label: 'Universities', color: 'yc-from-purple-400-to-pink-400' },
  ];

  return (
    <div className="yc-home">
      {/* Hero Section */}
      <section className="yc-hero">
        <div className="yc-hero-bg">
          <div className="yc-gradient-orb yc-orb-1"></div>
          <div className="yc-gradient-orb yc-orb-2"></div>
          <div className="yc-gradient-orb yc-orb-3"></div>
          <div className="yc-grid-pattern"></div>
        </div>

        <div className="yc-hero-content">
          <div className="yc-hero-badge yc-fade-in-up">
            <IconComponent name="Sparkles" className="yc-badge-icon" />
            <span>Revolutionizing University Attendance</span>
          </div>

          <h1 className="yc-hero-title yc-fade-in-up yc-delay-1">
            Smart Attendance
            <br />
            <span className="yc-gradient-text">Made Simple</span>
          </h1>

          <p className="yc-hero-subtitle yc-fade-in-up yc-delay-2">
            GPS-powered check-ins, QR code student IDs, and real-time analytics.
            The modern attendance solution trusted by universities worldwide.
          </p>

          <div className="yc-hero-buttons yc-fade-in-up yc-delay-3">
            <button className="yc-btn-primary-hero" onClick={() => navigate('/Login')}>
              <IconComponent name="GraduationCap" />
              Student Portal
              <IconComponent name="ChevronRight" />
            </button>
            <button className="yc-btn-secondary-hero" onClick={() => navigate('/Login')}>
              <IconComponent name="Users" />
              Professor Portal
              <IconComponent name="ChevronRight" />
            </button>
          </div>

          <div className="yc-hero-stats yc-fade-in-up yc-delay-4">
            {stats.map((stat, index) => (
              <div key={index} className="yc-stat-card">
                <div className={`yc-stat-icon yc-gradient-bg ${stat.color}`}>
                  <IconComponent name={stat.icon} />
                </div>
                <div className="yc-stat-value">{stat.value}</div>
                <div className="yc-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="yc-hero-fade"></div>
      </section>

      {/* Features Section */}
      <section id="yc-features" className="yc-features">
        <div className="yc-section-container">
          <div className="yc-section-header">
            <span className="yc-section-badge yc-blue">Features</span>
            <h2 className="yc-section-title">
              Everything You Need for
              <br />
              <span className="yc-gradient-text-blue">Modern Attendance</span>
            </h2>
            <p className="yc-section-subtitle">
              A comprehensive suite of tools designed to streamline attendance management
              for students, professors, and administrators.
            </p>
          </div>

          <div className="yc-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="yc-feature-card">
                <div className={`yc-feature-icon yc-gradient-bg ${feature.gradient}`}>
                  <IconComponent name={feature.icon} />
                </div>
                <h3 className="yc-feature-title">{feature.title}</h3>
                <p className="yc-feature-description">{feature.description}</p>
                <div className={`yc-feature-indicator yc-gradient-bg ${feature.gradient}`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="yc-how-it-works" className="yc-how-it-works">
        <div className="yc-section-container">
          <div className="yc-section-header">
            <span className="yc-section-badge yc-cyan">How It Works</span>
            <h2 className="yc-section-title">
              Three Simple Steps to
              <br />
              <span className="yc-gradient-text-cyan">Perfect Attendance</span>
            </h2>
            <p className="yc-section-subtitle">
              Our streamlined process makes attendance tracking effortless for everyone involved.
            </p>
          </div>

          <div className="yc-steps-container">
            <div className="yc-steps-line"></div>
            <div className="yc-steps-grid">
              {steps.map((step, index) => (
                <div key={index} className="yc-step-card">
                  <div className="yc-step-number yc-gradient-bg yc-from-blue-600-to-cyan-500">
                    <span>{step.number}</span>
                  </div>
                  <div className="yc-step-icon-wrapper">
                    <IconComponent name={index === 0 ? 'Users' : index === 1 ? 'MapPin' : 'Check'} />
                  </div>
                  <h3 className="yc-step-title">{step.title}</h3>
                  <p className="yc-step-description">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="yc-about" className="yc-cta">
        <div className="yc-cta-bg">
          <div className="yc-cta-circle yc-circle-1"></div>
          <div className="yc-cta-circle yc-circle-2"></div>
          <div className="yc-cta-circle yc-circle-3"></div>
          <div className="yc-cta-glow yc-glow-1"></div>
          <div className="yc-cta-glow yc-glow-2"></div>
        </div>

        <div className="yc-cta-content">
          <div className="yc-cta-badge">
            <IconComponent name="Sparkles" className="yc-badge-icon-cyan" />
            <span>Join 50+ Universities Today</span>
          </div>

          <h2 className="yc-cta-title">
            Ready to Transform Your
            <br />
            <span className="yc-cta-highlight">Attendance System?</span>
          </h2>

          <p className="yc-cta-subtitle">
            Join thousands of universities already using YallaClass to modernize
            their attendance tracking. Get started in minutes.
          </p>

          <div className="yc-cta-buttons">
            <button className="yc-btn-cta-primary" onClick={() => navigate('/Login')}>
              Get Started Free
              <IconComponent name="ChevronRight" />
            </button>
            <button className="yc-btn-cta-secondary">
              Schedule Demo
            </button>
          </div>

          <div className="yc-trust-section">
            <p className="yc-trust-text">Trusted by leading universities</p>
            <div className="yc-trust-logos">
              {['MIT', 'Stanford', 'Harvard', 'Berkeley', 'Oxford'].map((uni, index) => (
                <span key={index} className="yc-trust-name">{uni}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="yc-footer">
        <div className="yc-footer-container">
          <div className="yc-footer-main">
            <div className="yc-footer-brand">
              <div className="yc-footer-logo">
                <div className="yc-footer-logo-icon yc-gradient-bg yc-from-blue-600-to-cyan-500">
                  <IconComponent name="GraduationCap" />
                </div>
                <span className="yc-footer-logo-text">
                  Yalla<span className="yc-logo-highlight">Class</span>
                </span>
              </div>
              <p className="yc-footer-description">
                The modern attendance management system trusted by universities worldwide.
                Making attendance tracking simple, accurate, and efficient.
              </p>
            </div>

            <div className="yc-footer-links">
              <div className="yc-footer-column">
                <h4>Product</h4>
                <ul>
                  <li><a href="#yc-features">Features</a></li>
                  <li><a href="#yc-how-it-works">How It Works</a></li>
                  <li><a href="#">Pricing</a></li>
                  <li><a href="#">API Docs</a></li>
                </ul>
              </div>

              <div className="yc-footer-column">
                <h4>Company</h4>
                <ul>
                  <li><a href="#">About</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="yc-footer-bottom">
            <p className="yc-copyright">© 2024 YallaClass. All rights reserved.</p>
            <div className="yc-footer-legal">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
