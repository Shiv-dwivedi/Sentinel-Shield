// src/popup/Popup.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Popup.css';

const Popup = () => {
  const navigate = useNavigate();

  return (
    <div className="popup-container">
      <h2>Security Assistant</h2>
      <button onClick={() => navigate('/breach-check')}>Check Breaches</button>
      <button onClick={() => navigate('/fake-identity')}>Fake Identity</button>
      <button onClick={() => navigate('/risk-analysis')}>Risk Analysis</button>
      <button onClick={() => navigate('/scam-detection')}>Scam Message Detection</button>
      <button onClick={() => navigate('/qr-code-scanner')}>QR Code Scanner</button>
      <button onClick={() => navigate('/dashboard')}>Dashboard</button>
      <button onClick={() => navigate('/safety-advisor')}>Safety Advisor</button>
    </div>
  );
};

export default Popup;
