import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || `/${role}`;

  // Validation functions
  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name.trim()) return 'Name is required';
    if (!nameRegex.test(name)) return 'Name can only contain letters and spaces';
    if (name.length < 2) return 'Name must be at least 2 characters long';
    if (name.length > 50) return 'Name cannot exceed 50 characters';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email.trim()) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address (only letters, numbers, ., and @ allowed)';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (isSignUp && password.length < 6) return 'Password must be at least 6 characters long';
    return '';
  };

  const validateForm = () => {
    const errors = {};

    if (isSignUp) {
      const nameError = validateName(name);
      if (nameError) errors.name = nameError;
    }

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form before submission
    if (!validateForm()) {
      setError('Please fix the form errors below');
      return;
    }

    setLoading(true);

    let result;
    try {
      if (isSignUp) {
        // Sign up new user
        result = await signup(email, password, role, name.trim());
      } else {
        // Log in existing user
        result = await login(email, password);
      }
      
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (value) => {
    // Only allow letters and spaces
    const cleanedValue = value.replace(/[^A-Za-z\s]/g, '');
    setName(cleanedValue);
    
    // Clear error when user starts typing
    if (fieldErrors.name) {
      setFieldErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleEmailChange = (value) => {
    // Allow only letters, numbers, ., @, +, -, and _
    const cleanedValue = value.replace(/[^A-Za-z0-9.@_%+-]/g, '');
    setEmail(cleanedValue);
    
    // Clear error when user starts typing
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    
    // Clear error when user starts typing
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleRoleChange = (value) => {
    setRole(value);
  };

  const handleToggleSignUp = () => {
    setIsSignUp(!isSignUp);
    // Clear all errors and fields when toggling
    setError('');
    setFieldErrors({});
    if (!isSignUp) {
      // When switching to signup, clear name field
      setName('');
    }
  };

  // Helper function to render error message
  const renderError = (fieldName) => {
    return fieldErrors[fieldName] ? (
      <div style={{ 
        color: '#dc3545', 
        fontSize: '14px', 
        marginTop: '5px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        <span style={{ fontSize: '16px' }}>⚠</span>
        {fieldErrors[fieldName]}
      </div>
    ) : null;
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '10px',
    border: `1px solid ${hasError ? '#dc3545' : '#ddd'}`,
    borderRadius: '5px',
    fontSize: '16px',
    boxSizing: 'border-box',
    backgroundColor: hasError ? '#fff5f5' : 'white'
  });

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>
          {isSignUp ? ' Create Account' : ' Login to Career Guidance'}
        </h2>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required={isSignUp}
                style={inputStyle(fieldErrors.name)}
                placeholder="Enter your full name (letters only)"
                maxLength={50}
              />
              {renderError('name')}
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              style={inputStyle(false)}
            >
              <option value="student">Student</option>
              <option value="institution">Institution</option>
              <option value="company">Company</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              style={inputStyle(fieldErrors.email)}
              placeholder="Enter your email"
              maxLength={100}
            />
            {renderError('email')}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              style={inputStyle(fieldErrors.password)}
              placeholder="Enter your password"
              minLength={isSignUp ? 6 : 1}
            />
            {isSignUp && (
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                Password should be at least 6 characters
              </p>
            )}
            {renderError('password')}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease'
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Login')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleToggleSignUp}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px'
            }}
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;