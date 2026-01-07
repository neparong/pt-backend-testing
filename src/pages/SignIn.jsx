import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';
import '../App.css'; // Make sure CSS is imported

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
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

  return (
    // WRAPPER: Centers content on the screen
    <div className="auth-page-wrapper">
      
      {/* CARD: The white box */}
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
           <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: '800' }}>Welcome Back</h2>
           <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
             <IconSymbol name="xmark" size={24} color="#9ca3af" />
           </button>
        </div>
        
        <ThemedText style={{ marginBottom: '32px', color: 'gray' }}>Sign in to continue your recovery.</ThemedText>

        <StyledInput icon="envelope" placeholder="Email" value={email} onChangeText={setEmail} />
        <StyledInput icon="lock" placeholder="Password" value={password} onChangeText={setPassword} type="password" />

        <button 
            className="btn-primary" 
            onClick={handleSignIn} 
            disabled={loading} 
            style={{ 
                opacity: loading ? 0.7 : 1, 
                width: '100%', 
                marginTop: '20px',
                background: '#11181C',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
            }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
          <span style={{ color: 'gray' }}>Don't have an account? </span>
          <span onClick={() => navigate('/signup')} style={{ color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>Sign up</span>
        </div>
      </div>
    </div>
  );
}