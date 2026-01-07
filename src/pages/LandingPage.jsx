import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSymbol } from '../components/IconSymbol';
import '../App.css'; // Ensure CSS is imported

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      
      {/* Header Pill */}
      <div style={{ marginTop: '40px', background: 'rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '30px', display: 'flex', gap: '8px', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
        <IconSymbol name="waveform.path.ecg" size={20} color="#fff" />
        <span style={{ fontWeight: 600, fontSize: '14px' }}>AI-Powered Physical Therapy</span>
      </div>

      {/* Main Content */}
      <div className="landing-content">
        <h1 className="landing-title">
          Your Recovery Journey,<br />Powered by AI
        </h1>
        <p className="landing-subtitle">
          Professional physical therapy guidance, real-time form feedback, and personalized exercise plans—all in one platform.
        </p>

        {/* Buttons (Side by Side on Desktop) */}
        <div className="landing-buttons">
          <button 
            onClick={() => navigate('/signup')}
            style={{ flex: 1, background: 'white', color: '#1e40af', padding: '18px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
          >
            Get Started
          </button>
          
          <button 
            onClick={() => navigate('/signin')}
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white', padding: '18px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(5px)' }}
          >
            Sign In
          </button>
        </div>
      </div>

      <div style={{ paddingBottom: '20px', opacity: 0.6, fontSize: '0.9rem' }}>
        © 2026 PT Assistant. Microsoft Imagine Cup Entry.
      </div>
    </div>
  );
}