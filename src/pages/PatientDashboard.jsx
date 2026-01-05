import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import '../App.css'; 

export default function PatientDashboard() {
  const navigate = useNavigate();
  
  // State for Real Data
  const [userName, setUserName] = useState('Patient');
  const [userInitials, setUserInitials] = useState('P');
  const [assignments, setAssignments] = useState([]);
  const [completedSet, setCompletedSet] = useState(new Set()); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/signin');
        return;
      }

      // 2. Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
        setUserInitials(profile.full_name.charAt(0).toUpperCase());
      }

      // 3. Check "Done Today" Logs
      const today = new Date().toISOString().split('T')[0]; 
      const { data: logs } = await supabase
        .from('workout_logs')
        .select('assignment_id') 
        .eq('patient_id', user.id)
        .gte('created_at', today);

      const doneIds = new Set(logs?.map(l => l.assignment_id));
      setCompletedSet(doneIds);

      // 4. Fetch Assignments
      const { data: assignmentData, error } = await supabase
        .from('assignments')
        .select(`
          id,
          custom_instructions,
          custom_goal,
          exercise:exercises (
            slug,
            name,
            default_goal
          )
        `)
        .eq('patient_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      // 5. Format Data
      const formattedExercises = assignmentData.map((item) => ({
        id: item.id,
        title: item.exercise.name, 
        type: item.exercise.slug,  
        goalCount: item.custom_goal || item.exercise.default_goal, 
        repsDisplay: `${item.custom_goal || item.exercise.default_goal} Reps`
      }));

      setAssignments(formattedExercises);

    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = (ex) => {
    navigate(`/exercise/${ex.type}`, {
        state: { 
            assignmentId: ex.id, 
            exerciseName: ex.title 
        }
    });
  };

  // --- THE FIX: CALCULATE COMPLETED COUNT ---
  // Only count it as "Done" if it matches an ACTIVE assignment.
  // This ignores logs for exercises that were unassigned.
  const completedCount = assignments.filter(a => completedSet.has(a.id)).length;

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', width: '100%' }}>
      
      {/* Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Header */}
        <div className="header-row" style={{ gridColumn: '1 / -1' }}>
          <div>
            <ThemedText type="title">Physical Therapy</ThemedText>
            <ThemedText style={{ color: '#6b7280' }}>Welcome back, {userName}</ThemedText>
          </div>
          <div className="row gap-2">
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0e7ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#3730a3' }}>
              {userInitials}
            </div>
            <button onClick={() => navigate('/')} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#ef4444" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="card">
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Streak</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>5 Days 🔥</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Completed</div>
          {/* THE FIXED COUNT DISPLAY */}
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{completedCount}/{assignments.length}</div>
        </div>

        {/* Exercise List */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <ThemedText type="subtitle" style={{ marginBottom: '20px' }}>Today's Plan</ThemedText>
          
          {loading ? (
             <p style={{color: 'gray'}}>Loading plan...</p>
          ) : assignments.length === 0 ? (
             <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: '12px', color: '#6b7280' }}>
                No active assignments. <br/> Ask your PT to assign exercises.
             </div>
          ) : (
             <div className="col gap-4">
               {assignments.map(ex => {
                 const isDone = completedSet.has(ex.id); 

                 return (
                   <div key={ex.id} style={{ 
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                       padding: '16px', 
                       border: isDone ? '1px solid #86efac' : '1px solid #f3f4f6', 
                       backgroundColor: isDone ? '#f0fdf4' : 'white', 
                       borderRadius: '12px',
                       opacity: isDone ? 0.8 : 1
                   }}>
                     <div>
                       <ThemedText type="defaultSemiBold" style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#15803d' : 'inherit' }}>
                           {ex.title}
                       </ThemedText>
                       <div style={{ background: isDone ? '#dcfce7' : '#f3f4f6', padding: '4px 8px', borderRadius: '6px', marginTop: '6px', alignSelf: 'flex-start', display: 'inline-block' }}>
                         <span style={{ fontSize: '11px', fontWeight: '600', color: isDone ? '#166534' : '#374151' }}>
                             {isDone ? 'Completed Today' : ex.repsDisplay}
                         </span>
                       </div>
                     </div>
                     
                     <div className="row gap-2">
                       {isDone ? (
                           <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               ✓
                           </div>
                       ) : (
                           <button className="btn-black" onClick={() => handleStart(ex)}>
                             <IconSymbol name="paperplane.fill" size={14} color="white" />
                             Start
                           </button>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
          )}
        </div>

      </div>
    </div>
  );
}