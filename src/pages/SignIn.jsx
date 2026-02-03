import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';
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
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) throw authError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      navigate(profile?.role === 'therapist' ? '/doctor' : '/dashboard');
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

      <div className="container auth-card" style={{ maxWidth: '500px' }}>
        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <IconSymbol name="xmark" size={28} color="#0f172a" />
          </button>
        </div>

        <ThemedText type="title" style={{ marginBottom: 8 }}>
          Welcome Back
        </ThemedText>
        <ThemedText style={{ marginBottom: 32, color: '#64748b' }}>
          Sign in to continue
        </ThemedText>

        <StyledInput
          icon="envelope"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />

        <StyledInput
          icon="lock"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          type="password"
        />

        <button
          className="btn-primary"
          onClick={handleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 16,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing In…' : 'Sign In'}
        </button>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span style={{ color: '#64748b' }}>Don’t have an account? </span>
          <span
            onClick={() => navigate('/signup')}
            style={{
              color: '#2563eb',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign up
          </span>
        </div>
      </div>
    </div>
  );
}
