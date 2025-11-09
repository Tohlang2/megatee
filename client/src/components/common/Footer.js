import React from 'react';

function Footer() {
  return (
    <footer style={{
      backgroundColor: '#34495e',
      color: 'white',
      padding: '1rem',
      marginTop: 'auto',
      textAlign: 'center'
    }}>
      <div style={{
        borderTop: '1px solid #4a6572',
        paddingTop: '1rem'
      }}>
        <p style={{ margin: 0, color: '#bdc3c7' }}>
          &copy; 2025 Career Guidance. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;