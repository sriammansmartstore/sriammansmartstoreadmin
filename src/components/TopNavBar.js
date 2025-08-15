import React from 'react';
import './TopNavBar.css';

function TopNavBar({ onLogout }) {
  return (
    <nav className="top-navbar">
      <div className="top-navbar__brand">Sri Amman Smart Stores</div>
      <button className="top-navbar__logout" onClick={onLogout}>Logout</button>
    </nav>
  );
}

export default TopNavBar;
