import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { motion } from 'framer-motion'; // 👈 Animation
import '../App.css'; 

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault(); // Prevent form reload
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error("Profile check failed:", profileError);
        navigate('/dashboard'); 
      } else if (profile?.role === 'therapist') {
        navigate('/doctor');
      } else {
        navigate('/dashboard');
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
    <div className="dashboard-container" style={{ padding: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* BACKGROUND ORBS (Visual Polish) */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(220, 252, 231, 0.2) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={variants}
        className="modern-card"
        style={{ width: '100%', maxWidth: '420px', padding: '40px', position: 'relative', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}
      >
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)' }}>
                <IconSymbol name="waveform.path.ecg" size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>Welcome Back</h2>
            <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.95rem' }}>Sign in to continue your recovery.</p>
        </div>
        
        {/* FORM */}
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
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
                {loading ? 'Signing In...' : 'Sign In'}
            </motion.button>

        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
          Don't have an account? 
          <span onClick={() => navigate('/signup')} style={{ color: '#2563eb', fontWeight: '700', cursor: 'pointer', marginLeft: '6px' }}>Sign up</span>
        </div>

        {/* CLOSE BUTTON */}
        <button onClick={() => navigate('/')} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>✕</button>

      </motion.div>
    </div>
  );
}