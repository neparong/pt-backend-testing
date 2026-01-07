import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import '../App.css'; 

export default function PatientDashboard() {
  const navigate = useNavigate();
  
  // State
  const [userName, setUserName] = useState('Patient');
  const [userInitials, setUserInitials] = useState('P');
  const [assignments, setAssignments] = useState([]);
  const [completedSet, setCompletedSet] = useState(new Set()); 
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
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
      const today = new Date().toISOString().split('T')[0]; 
      const { data: todayLogs } = await supabase
        .from('workout_logs')
        .select('assignment_id') 
        .eq('patient_id', user.id)
        .gte('created_at', today);

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
      const now = new Date();
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      
      const { data: weekLogs } = await supabase
        .from('workout_logs')
        .select('created_at, total_reps')
        .eq('patient_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayName = days[d.getDay()];
          
          const daysReps = weekLogs
            ?.filter(l => l.created_at.startsWith(dateStr))
            .reduce((sum, current) => sum + (current.total_reps || 0), 0) || 0;

          stats.push({ day: dayName, reps: daysReps, isToday: i === 0 });
      }
      setWeeklyStats(stats);

    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = (ex) => {
    navigate(`/exercise/${ex.type}`, { state: { assignmentId: ex.id, exerciseName: ex.title } });
  };

  const completedCount = assignments.filter(a => completedSet.has(a.id)).length;
  const maxReps = Math.max(...weeklyStats.map(s => s.reps), 10); 

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', padding: '40px' }}>
      
      {/* WIDE CONTAINER (Max 1200px for neatness, but feels full screen) */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER ROW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 8px 0', color: '#11181C' }}>
                Hello, {userName.split(' ')[0]}
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>
                Ready to crush your recovery goals today?
            </p>
          </div>
          
          {/* Profile & Signout */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1e40af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
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
        </div>

        {/* MAIN GRID LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            
            {/* LEFT COLUMN: STATS & CHART */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* 1. Stat Cards Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>DAILY GOAL</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a' }}>
                            {completedCount} <span style={{fontSize:'1.2rem', color:'#94a3b8', fontWeight:'500'}}>/ {assignments.length}</span>
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>CURRENT STREAK</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ea580c' }}>
                            5 <span style={{fontSize:'1.5rem'}}>🔥</span>
                        </div>
                    </div>
                </div>

                {/* 2. Weekly Chart (Clean, No Numbers) */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', flex: 1 }}>
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Weekly Activity</h3>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Reps completed over the last 7 days</p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px' }}>
                        {weeklyStats.map((stat, idx) => {
                            const heightPercent = (stat.reps / maxReps) * 100;
                            return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                                    {/* Bar - Clean, no text */}
                                    <div 
                                        title={`${stat.reps} Reps`} // Hover tooltip for data
                                        style={{ 
                                            width: '24px', 
                                            height: `${Math.max(heightPercent, 2)}%`, // Min height 2% so empty days show a dot
                                            background: stat.isToday ? '#2563eb' : '#e2e8f0', 
                                            borderRadius: '12px', 
                                            transition: 'height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                        }}
                                    ></div>
                                    {/* Day Label */}
                                    <span style={{ fontSize: '0.8rem', color: stat.isToday ? '#2563eb' : '#94a3b8', fontWeight: stat.isToday ? '700' : '500' }}>
                                        {stat.day.charAt(0)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: EXERCISE LIST */}
            <div>
                <div style={{ background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', height: '100%' }}>
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
                                    <div key={ex.id} style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                        padding: '20px', 
                                        border: isDone ? '1px solid #bbf7d0' : '1px solid #e2e8f0', 
                                        backgroundColor: isDone ? '#f0fdf4' : 'white', 
                                        borderRadius: '16px',
                                        transition: 'all 0.2s',
                                        opacity: isDone ? 0.9 : 1
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: isDone ? '#15803d' : '#0f172a', textDecoration: isDone ? 'none' : 'none' }}>
                                                {ex.title}
                                            </div>
                                            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px' }}>
                                                {isDone ? (
                                                    <span style={{fontSize: '0.8rem', color: '#16a34a', fontWeight: '700'}}>✓ Completed</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontWeight:'500' }}>
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
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}