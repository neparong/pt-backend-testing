import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconSymbol } from '../components/IconSymbol';
import ActivityRing from '../components/ActivityRing'; // We use the real component!
import '../App.css'; 

export default function LandingPage() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 50 } }
  };

  return (
    <div className="dashboard-container" style={{ padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      
      {/* 0. BACKGROUND GRID */}
      <div className="hero-bg" />

      {/* 1. GLASS NAVBAR */}
      <nav style={{ 
            position: 'sticky', top: 0, zIndex: 100,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 40px',
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.5)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}>
                <IconSymbol name="waveform.path.ecg" size={20} color="#fff" />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>PhysioAI</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => navigate('/signin')} style={{ background: 'none', border: 'none', fontWeight: '600', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>Log In</button>
            <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/signup')}
                style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '30px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }}
            >
                Get Started
            </motion.button>
        </div>
      </nav>

      {/* 2. SPLIT HERO SECTION */}
      <div style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'center', padding: '40px 20px', gap: '40px', position: 'relative', zIndex: 1 }}>
        
        {/* LEFT: TEXT */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
            
            <motion.div variants={itemVariants} style={{ background: 'white', color: '#2563eb', padding: '6px 16px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '24px', border: '1px solid #dbeafe', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span>✨</span> 2026 Imagine Cup MVP
            </motion.div>

            <motion.h1 variants={itemVariants} style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: '800', color: '#0f172a', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.03em' }}>
                Recovery that <br/> doesn't stop <br/>
                <span style={{ background: 'linear-gradient(to right, #2563eb, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>at the clinic door.</span>
            </motion.h1>

            <motion.p variants={itemVariants} style={{ fontSize: '1.25rem', color: '#64748b', maxWidth: '550px', lineHeight: 1.6, marginBottom: '40px' }}>
                The AI-powered companion that corrects your form in real-time, reducing recovery time and keeping you connected to your doctor.
            </motion.p>

            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/signin')}
                    style={{ padding: '16px 36px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '16px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)' }}
                >
                    Start Recovery →
                </motion.button>
                
                <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: 'white' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.open('https://microsoft.com', '_blank')} 
                    style={{ padding: '16px 32px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '16px', background: 'rgba(255,255,255,0.6)', color: '#0f172a', border: '1px solid #e2e8f0', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                >
                    View Demo Video
                </motion.button>
            </motion.div>

            <motion.div variants={itemVariants} style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
                <span style={{fontSize: '0.9rem', fontWeight: '600', color: '#64748b'}}>POWERED BY</span>
                <div style={{ display: 'flex', gap: '4px', fontWeight: '800', color: '#0f172a' }}>Microsoft Azure AI</div>
            </motion.div>
        </motion.div>

        {/* RIGHT: FLOATING UI COMPOSITION (The "Hero Graphic") */}
        <motion.div 
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
            style={{ position: 'relative', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            {/* 1. Main Card: The Activity Ring */}
            <div className="modern-card float-slow" style={{ background: 'white', padding: '40px', borderRadius: '32px', position: 'relative', zIndex: 2, width: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{fontSize: '1.2rem', fontWeight: '800', color: '#0f172a'}}>Daily Progress</div>
                    <div style={{color: '#64748b', fontSize: '0.9rem'}}>Keep it up, Patient!</div>
                </div>
                <ActivityRing radius={100} stroke={18} progress={75} total={100} color="#2563eb" />
                <div style={{ marginTop: '30px', width: '100%', display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{fontSize: '1.5rem'}}>🔥</div>
                        <div style={{fontWeight: '700', fontSize: '0.9rem'}}>5 Day Streak</div>
                    </div>
                </div>
            </div>

            {/* 2. Floating Card: Feedback Pill */}
            <div className="modern-card float-medium" style={{ position: 'absolute', top: '10%', right: '0%', padding: '16px 24px', borderRadius: '50px', background: 'white', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 3, boxShadow: '0 15px 35px rgba(37, 99, 235, 0.15)' }}>
                <div style={{ width: 12, height: 12, background: '#22c55e', borderRadius: '50%' }}></div>
                <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>Great Depth!</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Knee Angle: 92°</div>
                </div>
            </div>

            {/* 3. Floating Card: AI Chat */}
            <div className="modern-card float-fast" style={{ position: 'absolute', bottom: '15%', left: '-5%', padding: '20px', borderRadius: '20px', background: 'white', width: '240px', zIndex: 1, boxShadow: '0 15px 35px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: 32, height: 32, background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>PhysioAI</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Just now</div>
                    </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
                    "I noticed your left knee is wobbling. Try planting your heel firmly."
                </div>
            </div>

        </motion.div>

      </div>

      {/* 3. FEATURE STRIP */}
      <div style={{ background: 'white', padding: '80px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
            {/* Card 1 */}
            <div style={{ padding: '20px' }}>
                <div style={{ width: 50, height: 50, background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>🎯</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px' }}>Real-time Correction</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6 }}>Computer vision tracks 33 skeletal points to ensure your form is safe and effective, without recording video.</p>
            </div>
            {/* Card 2 */}
            <div style={{ padding: '20px' }}>
                <div style={{ width: 50, height: 50, background: '#e0e7ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>🧠</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px' }}>Azure Reasoning</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6 }}>Powered by GPT-4o, the AI adapts to your pain levels and answers your recovery questions instantly.</p>
            </div>
            {/* Card 3 */}
            <div style={{ padding: '20px' }}>
                <div style={{ width: 50, height: 50, background: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>🏥</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px' }}>Clinical Dashboard</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6 }}>Doctors receive adherence data to optimize care plans and bill for Remote Therapeutic Monitoring (RTM).</p>
            </div>
        </div>
      </div>

    </div>
  );
}