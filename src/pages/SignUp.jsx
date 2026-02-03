import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { motion } from 'framer-motion';
import '../App.css'; 

export default function SignUp() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('patient'); 
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: userType === 'doctor' ? 'therapist' : 'patient',
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Insert into profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: data.user.id, 
              full_name: fullName, 
              role: userType === 'doctor' ? 'therapist' : 'patient', 
              email: email 
            }
          ]);
        
        if (profileError) throw profileError;
        
        alert('Account created! Please Sign In.');
        navigate('/signin');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Animation Config
  const variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <div className="auth-bg">
  <div className="auth-grid" />
  <div className="auth-noise" />
  <div className="auth-orbs">
    <span />
    <span />
    <span />
  </div>

    <div className="container" style={{ paddingTop: '40px', maxWidth: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <IconSymbol name="xmark" size={28} color="#000" />
        </button>
      </div>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={variants}
        className="modern-card"
        style={{ width: '100%', maxWidth: '420px', padding: '40px', position: 'relative', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)' }}>
                <IconSymbol name="waveform.path.ecg" size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>Get Started</h2>
            <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.95rem' }}>Create your account to begin.</p>
        </div>

        {/* ROLE TOGGLE */}
        <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', marginBottom: '24px' }}>
            {['patient', 'doctor'].map((role) => (
                <button
                    key={role}
                    onClick={() => setUserType(role)}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize',
                        background: userType === role ? 'white' : 'transparent',
                        color: userType === role ? '#0f172a' : '#64748b',
                        boxShadow: userType === role ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    {role === 'doctor' ? 'Doctor / PT' : 'Patient'}
                </button>
            ))}
        </div>

        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>Full Name</label>
                <input 
                    type="text" 
                    placeholder="Jane Doe"
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'border 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>Email</label>
                <input 
                    type="email" 
                    placeholder="name@example.com"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'border 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>Password</label>
                <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'border 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
            </div>

            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading} 
                style={{ 
                    marginTop: '10px',
                    background: '#0f172a', color: 'white', padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', border: 'none', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' 
                }}
            >
                {loading ? 'Creating...' : 'Create Account'}
            </motion.button>

        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
          Already have an account? 
          <span onClick={() => navigate('/signin')} style={{ color: '#2563eb', fontWeight: '700', cursor: 'pointer', marginLeft: '6px' }}>Sign in</span>
        </div>

        <button onClick={() => navigate('/')} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>✕</button>

      </motion.div>
    </div>
    </div>
  );
}