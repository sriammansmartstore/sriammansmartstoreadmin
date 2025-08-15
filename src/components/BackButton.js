import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BackButton.css';

function BackButton({ to = -1, label = 'Back' }) {
  const navigate = useNavigate();
  return (
    <button className="back-btn" onClick={() => navigate(to)}>
      <span className="back-arrow">&#8592;</span> {label}
    </button>
  );
}

export default BackButton;
