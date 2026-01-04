import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      background: 'linear-gradient(to bottom, #2563eb, #1e40af)', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px',
      color: 'white'
    }}>
      
      {/* Header Pill */}
      <div style={{ marginTop: '60px', background: 'rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '30px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <IconSymbol name="waveform.path.ecg" size={20} color="#fff" />
        <span style={{ fontWeight: 600, fontSize: '14px' }}>AI-Powered Physical Therapy</span>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
          Your Recovery Journey, Powered by AI
        </h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          Professional physical therapy guidance, real-time form feedback, and personalized exercise plans—all in one platform.
        </p>
      </div>

      {/* Footer Buttons */}
      <div style={{ marginBottom: '60px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '350px' }}>
        <button 
          onClick={() => navigate('/signup')}
          className="btn-primary"
          style={{ background: 'white', color: '#1e40af', padding: '16px', borderRadius: '50px', fontSize: '1.1rem' }}
        >
          Get Started
        </button>
        
        <button 
          onClick={() => navigate('/signin')}
          style={{ background: 'transparent', border: '2px solid rgba(255,255,255,0.3)', color: 'white', padding: '16px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}