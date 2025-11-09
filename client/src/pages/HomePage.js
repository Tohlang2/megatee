import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const { currentUser, userRole } = useAuth();

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Career Guidance & Employment Integration Platform</h1>
          {!currentUser ? (
            <div className="hero-actions">
              <Link to="/login" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          ) : (
            <div className="hero-actions">
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;