import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';
import '../App.css'; // Ensure CSS is imported

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
    // WRAPPER: Centers content on the screen (from App.css)
    <div className="auth-page-wrapper">
      
      {/* CARD: The white box */}
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
           <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: '800' }}>Get Started</h2>
           <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
             <IconSymbol name="xmark" size={24} color="#9ca3af" />
           </button>
        </div>

        <ThemedText style={{ marginBottom: '24px', color: 'gray' }}>Create your account to begin.</ThemedText>

        <ThemedText type="defaultSemiBold" style={{ marginBottom: '12px', fontSize:'0.9rem' }}>I am a...</ThemedText>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <button 
            onClick={() => setUserType('patient')}
            style={{ 
                flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                border: userType === 'patient' ? '2px solid #2563eb' : '1px solid #e5e7eb', 
                background: userType === 'patient' ? '#eff6ff' : 'white', 
                color: userType === 'patient' ? '#2563eb' : 'gray', 
            }}
          >
            Patient
          </button>
          <button 
            onClick={() => setUserType('doctor')} 
            style={{ 
                flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                border: userType === 'doctor' ? '2px solid #2563eb' : '1px solid #e5e7eb', 
                background: userType === 'doctor' ? '#eff6ff' : 'white', 
                color: userType === 'doctor' ? '#2563eb' : 'gray', 
            }}
          >
            Doctor / PT
          </button>
        </div>

        <StyledInput icon="person.fill" placeholder="Full Name" value={fullName} onChangeText={setFullName} />
        <StyledInput icon="envelope" placeholder="Email" value={email} onChangeText={setEmail} />
        <StyledInput icon="lock" placeholder="Create Password" type="password" value={password} onChangeText={setPassword} />

        <button 
            className="btn-primary" 
            onClick={handleSignUp} 
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
          {loading ? 'Creating...' : 'Create Account'}
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
          <span style={{ color: 'gray' }}>Already have an account? </span>
          <span onClick={() => navigate('/signin')} style={{ color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>Sign in</span>
        </div>
      </div>
    </div>
  );
}