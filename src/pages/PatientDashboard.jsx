import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import ActivityRing from '../components/ActivityRing'; 
import { loadAndApplyUserSettings } from "../services/settings";
import { motion } from 'framer-motion'; // 👈 Animation Library
import '../App.css'; 

export default function PatientDashboard() {
  const navigate = useNavigate();
  
  // State
  const [userName, setUserName] = useState('Patient');
  const [userInitials, setUserInitials] = useState('P');
  const [assignments, setAssignments] = useState([]);
  const [completedSet, setCompletedSet] = useState(new Set()); 
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // REPLACES THE MAIN useEffect
  useEffect(() => {
    let channel;

    const setupRealtime = async () => {
        // 1. Load initial data
        await fetchDashboardData();
        //loadAndApplyUserSettings()
        // 2. Get current user ID for the subscription filter
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // 🔴 REALTIME SUBSCRIPTION
            channel = supabase
              .channel('patient-dashboard-changes')
              .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'assignments',
                    filter: `patient_id=eq.${user.id}` // Only listen for MY assignments
                },
                () => {
                  console.log('New assignment received!');
                  fetchDashboardData();
                }
              )
              .subscribe();
        }
    };

    setupRealtime();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/signin'); return; }

      // 2. Profile
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (profile) {
        setUserName(profile.full_name);
        setUserInitials(profile.full_name.charAt(0).toUpperCase());
      }

      // 3. "Done Today" Logs
      const todayObj = new Date();
      const todayStr = todayObj.toISOString().split('T')[0];
      
      const { data: todayLogs } = await supabase
        .from('workout_logs')
        .select('assignment_id') 
        .eq('patient_id', user.id)
        .gte('created_at', todayStr);

      const doneIds = new Set(todayLogs?.map(l => l.assignment_id));
      setCompletedSet(doneIds);

      // 4. Assignments
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select(`id, custom_goal, frequency, exercise:exercises (slug, name, default_goal)`)
        .eq('patient_id', user.id)
        .eq('is_active', true);

      const formattedExercises = assignmentData?.map((item) => {
        const targetReps = item.custom_goal || item.exercise.default_goal;
        return {
            id: item.id,
            title: item.exercise.name, 
            type: item.exercise.slug,  
            goalCount: targetReps, 
            repsDisplay: `${targetReps} Reps`
        };
      }) || [];
      setAssignments(formattedExercises);

      // 5. WEEKLY STATS
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const stats = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(todayObj.getDate() - 6);
      
      const { data: allRecentLogs } = await supabase
        .from('workout_logs')
        .select('created_at, total_reps')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(todayObj.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayName = days[d.getDay()];
          
          const daysReps = allRecentLogs
            ?.filter(l => l.created_at.startsWith(dateStr))
            .reduce((sum, current) => sum + (current.total_reps || 0), 0) || 0;

          stats.push({ day: dayName, reps: daysReps, isToday: i === 0 });
      }
      setWeeklyStats(stats);

      // 6. Streak Logic
      calculateStreak(allRecentLogs || []);

    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (logs) => {
      const uniqueDates = new Set(logs.map(l => l.created_at.split('T')[0]));
      let streak = 0;
      let checkDate = new Date(); 

      for (let i = 0; i < 365; i++) { 
          const dateString = checkDate.toISOString().split('T')[0];
          if (uniqueDates.has(dateString)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else if (i === 0) {
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }
      setCurrentStreak(streak);
  };

  const handleStart = (ex) => {
    navigate(`/exercise/${ex.type}`, { state: { assignmentId: ex.id, exerciseName: ex.title } });
  };

  const completedCount = assignments.filter(a => completedSet.has(a.id)).length;
  const totalCount = assignments.length > 0 ? assignments.length : 1; 
  const maxReps = Math.max(...weeklyStats.map(s => s.reps), 10); 

  // --- ANIMATION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
  };

  return (
    <motion.div 
      className="dashboard-container"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
      }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* BRANDING HEADER */}
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', opacity: 0.8 }}>
            <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="waveform.path.ecg" size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: '800', fontSize: '1rem', color: '#11181C' }}>PhysioAI</span>
        </motion.div>

        {/* HEADER ROW */}
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 8px 0', color: '#11181C' }}>
                Hello, {userName.split(' ')[0]}
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>
                Ready to crush your recovery goals today?
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1e40af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }} onClick={() => navigate('/shop')}>
              {userInitials}
            </div>
            <button 
                onClick={() => { supabase.auth.signOut(); navigate('/'); }} 
                style={{ border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', padding: '12px', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Sign Out"
            >
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#ef4444" />
            </button>
          </div>
        </motion.div>

        {/* MAIN GRID LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            
            {/* LEFT COLUMN: STATS & CHART */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* 1. Stat Cards Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    
                    {/* RING CARD */}
                    <motion.div variants={itemVariants} className="modern-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityRing 
                            radius={65} 
                            stroke={12} 
                            progress={completedCount} 
                            total={totalCount} 
                            color="#2563eb"
                        />
                    </motion.div>

                    {/* STREAK CARD */}
                    <motion.div variants={itemVariants} className="modern-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>CURRENT STREAK</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: currentStreak > 0 ? '#ea580c' : '#94a3b8' }}>
                            {currentStreak} <span style={{fontSize:'1.5rem'}}>{currentStreak > 0 ? '🔥' : '❄️'}</span>
                        </div>
                    </motion.div>
                </div>

                {/* 2. Weekly Chart */}
                <motion.div variants={itemVariants} className="modern-card" style={{ padding: '30px', flex: 1 }}>
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Weekly Activity</h3>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Reps completed over the last 7 days</p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px' }}>
                        {weeklyStats.map((stat, idx) => {
                            const heightPercent = (stat.reps / (maxReps || 1)) * 100;
                            return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                                    <div 
                                        title={`${stat.reps} Reps`} 
                                        style={{ 
                                            width: '24px', 
                                            height: `${Math.max(heightPercent, 2)}%`, 
                                            background: stat.isToday ? '#2563eb' : '#e2e8f0', 
                                            borderRadius: '12px', 
                                            transition: 'height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                        }}
                                    ></div>
                                    <span style={{ fontSize: '0.8rem', color: stat.isToday ? '#2563eb' : '#94a3b8', fontWeight: stat.isToday ? '700' : '500' }}>
                                        {stat.day.charAt(0)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            </div>

            {/* RIGHT COLUMN: EXERCISE LIST */}
            <motion.div variants={itemVariants}>
                <div className="modern-card" style={{ padding: '30px', height: '100%' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#0f172a' }}>Today's Plan</h3>
                    
                    {loading ? (
                        <p style={{color: 'gray', textAlign:'center', marginTop: 40}}>Loading plan...</p>
                    ) : assignments.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: '12px', color: '#94a3b8' }}>
                            No exercises assigned yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {assignments.map(ex => {
                                const isDone = completedSet.has(ex.id); 

                                return (
                                    <motion.div 
                                        key={ex.id} 
                                        whileHover={{ y: -2 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                            padding: '20px', 
                                            border: isDone ? '1px solid #bbf7d0' : '1px solid #f1f5f9', 
                                            backgroundColor: isDone ? '#f0fdf4' : '#f8fafc', /* Subtle contrast for items */
                                            borderRadius: '16px',
                                            transition: 'all 0.2s',
                                            opacity: isDone ? 0.9 : 1
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: isDone ? '#15803d' : '#0f172a' }}>
                                                {ex.title}
                                            </div>
                                            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px' }}>
                                                {isDone ? (
                                                    <span style={{fontSize: '0.8rem', color: '#16a34a', fontWeight: '700'}}>✓ Completed</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', background: 'white', padding: '4px 10px', borderRadius: '20px', fontWeight:'500', border:'1px solid #e2e8f0' }}>
                                                        {ex.repsDisplay}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleStart(ex)}
                                            style={{ 
                                                background: isDone ? 'white' : '#2563eb', 
                                                color: isDone ? '#2563eb' : 'white', 
                                                border: isDone ? '1px solid #bfdbfe' : 'none',
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                boxShadow: isDone ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)'
                                            }}
                                        >
                                            {isDone ? 'Review' : 'Start'}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>

        </div>
      </div>
    </motion.div>
  );
}