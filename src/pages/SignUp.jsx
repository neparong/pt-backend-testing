import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// 👇 THIS IS THE FIX
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';

export default function SignUp() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('patient'); 
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
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

  return (
    <div className="auth-bg">
  <div className="auth-grid" />
  <div className="auth-noise" />
  <div className="auth-orbs">
    <span />
    <span />
    <span />
  </div>

    <div className="container auth-card" style={{ paddingTop: '40px', maxWidth: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <IconSymbol name="xmark" size={28} color="#000" />
        </button>
      </div>

      <ThemedText type="title" style={{ marginBottom: '8px' }}>Get Started</ThemedText>
      <ThemedText style={{ marginBottom: '32px', color: 'gray' }}>Create your account to begin</ThemedText>

      <ThemedText type="defaultSemiBold" style={{ marginBottom: '8px' }}>I am a...</ThemedText>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button 
          onClick={() => setUserType('patient')}
          style={{ flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', border: userType === 'patient' ? '1px solid #2563eb' : '1px solid #e5e7eb', background: userType === 'patient' ? '#eff6ff' : 'white', color: userType === 'patient' ? '#2563eb' : 'gray', fontWeight: '600' }}
        >
          Patient
        </button>
        <button 
          onClick={() => setUserType('doctor')} 
          style={{ flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', border: userType === 'doctor' ? '1px solid #2563eb' : '1px solid #e5e7eb', background: userType === 'doctor' ? '#eff6ff' : 'white', color: userType === 'doctor' ? '#2563eb' : 'gray', fontWeight: '600' }}
        >
          Doctor / PT
        </button>
      </div>

      <StyledInput icon="person.fill" placeholder="Full Name" value={fullName} onChangeText={setFullName} />
      <StyledInput icon="envelope" placeholder="Email" value={email} onChangeText={setEmail} />
      <StyledInput icon="lock" placeholder="Create Password" type="password" value={password} onChangeText={setPassword} />

      <button className="btn-primary" style={{ width: '100%', marginTop: '16px', opacity: loading ? 0.7 : 1 }} onClick={handleSignUp} disabled={loading}>
        {loading ? 'Creating...' : 'Create Account'}
      </button>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <span style={{ color: 'gray' }}>Already have an account? </span>
        <span onClick={() => navigate('/signin')} style={{ color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>Sign in</span>
      </div>
    </div>
    </div>
  );
}