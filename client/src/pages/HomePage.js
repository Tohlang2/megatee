import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const { currentUser, userRole } = useAuth();

  const features = [
    {
      title: "Students",
      description: "Apply to courses, track applications, and find job opportunities that match your qualifications.",
      link: "/student",
      color: "student"
    },
    {
      title: "Institutions",
      description: "Manage academic programs, review applications, and publish admissions efficiently.",
      link: "/institution",
      color: "institution"
    },
    {
      title: "Companies",
      description: "Find qualified candidates based on academic performance and relevant experience.",
      link: "/company",
      color: "company"
    },
    {
      title: "Administrators",
      description: "Oversee the entire platform and ensure smooth operations across all modules.",
      link: "/admin",
      color: "admin"
    }
  ];

  const stats = [
    
  ];

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Connect Your Future with EduConnect</h1>
            <p>
              A smart platform connecting students, educational institutions, and employers. 
              Streamline applications, admissions, and career opportunities through intelligent matching.
            </p>
            <div className="hero-buttons">
              {!currentUser ? (
                <>
                 
                  <Link to="/login" className="btn btn-secondary">
                    Sign In
                  </Link>
                </>
              ) : (
                <Link to={`/${userRole}`} className="btn btn-primary">
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
        
        <div className="hero-stats">
          {stats.map((stat, index) => (
            <div key={index} className="stat">
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Designed for Everyone</h2>
            <p>Tailored solutions for each user in the education ecosystem</p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className={`feature-card ${feature.color}`}>
                <div className="feature-content">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <Link to={feature.link} className="feature-link">
                    Get Started →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Simple steps from application to career</p>
          </div>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Complete Profile</h3>
                <p>Students provide academic information and upload required documents</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Apply Smartly</h3>
                <p>Apply to courses you qualify for, with limits to ensure fair access</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Admitted</h3>
                <p>Institutions review applications and make admission decisions</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Start Career</h3>
                <p>Find job opportunities that match your qualifications and skills</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      
    </div>
  );
};

export default HomePage;