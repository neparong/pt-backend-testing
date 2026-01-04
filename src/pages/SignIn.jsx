import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// 👇 THIS IS THE FIX
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';

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
    <div className="container" style={{ paddingTop: '40px', maxWidth: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <IconSymbol name="xmark" size={28} color="#000" />
        </button>
      </div>

      <ThemedText type="title" style={{ marginBottom: '8px' }}>Welcome Back</ThemedText>
      <ThemedText style={{ marginBottom: '32px', color: 'gray' }}>Sign in to continue</ThemedText>

      <StyledInput icon="envelope" placeholder="Email" value={email} onChangeText={setEmail} />
      <StyledInput icon="lock" placeholder="Password" value={password} onChangeText={setPassword} type="password" />

      <button className="btn-primary" onClick={handleSignIn} disabled={loading} style={{ opacity: loading ? 0.7 : 1, width: '100%', marginTop: '16px' }}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <span style={{ color: 'gray' }}>Don't have an account? </span>
        <span onClick={() => navigate('/signup')} style={{ color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>Sign up</span>
      </div>
    </div>
  );
}