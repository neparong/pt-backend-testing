import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import CameraView from '../components/CameraView'; 
import ChatInterface from '../components/ChatInterface'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import '../App.css'; 

export default function ExercisePage() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  
  // STATE
  const [exerciseConfig, setExerciseConfig] = useState(null); 
  const [assignmentId, setAssignmentId] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [workoutLogId, setWorkoutLogId] = useState(null);

  // 1. FETCH CONFIG & PRESCRIPTION
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        // A. Fetch Standard Exercise Details
        const { data: exData, error: exError } = await supabase
          .from('exercises')
          .select('id, name, default_instructions, default_goal, is_sided')
          .eq('slug', type)
          .single();

        if (exError) throw exError;

        // B. Fetch Doctor's Custom Assignment
        const { data: assignData } = await supabase
          .from('assignments')
          .select('id, custom_goal')
          .eq('patient_id', user.id)
          .eq('exercise_id', exData.id)
          .eq('is_active', true)
          .maybeSingle();

        // C. LOGIC FIX: Handle "Per Side" Math
        // If doctor says "8", and it's sided, they mean 8 PER LEG (16 total).
        const baseGoal = assignData?.custom_goal || exData.default_goal;
        
        // If sided, Total = 8 * 2 = 16. Switch at 8.
        // If not sided, Total = 8.
        const calculatedTotal = exData.is_sided ? (baseGoal * 2) : baseGoal;
        const switchPoint = exData.is_sided ? baseGoal : null;

        setAssignmentId(assignData?.id);
        
        setExerciseConfig({
            id: exData.id,
            title: exData.name,
            instructions: exData.default_instructions,
            isSided: exData.is_sided,
            baseGoal: baseGoal, // The number the human thinks of (e.g. 8)
            goal: { 
                total: calculatedTotal, // The number the computer counts (e.g. 16)
                perSide: exData.is_sided, 
                switchAt: switchPoint 
            }
        });

      } catch (err) {
        console.error("Error loading exercise:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [type]);

  const handleComplete = async (stats) => {
    setIsRunning(false);
    setHasFinished(true);
    setSaving(true);
    
    const { totalReps = exerciseConfig.goal.total, cleanReps = exerciseConfig.goal.total } = stats || {};

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ensure we have an assignment to link to
      if (assignmentId) {
        const { data: logData } = await supabase
          .from('workout_logs')
          .insert([{
              assignment_id: assignmentId, 
              patient_id: user.id,
              total_reps: totalReps,
              clean_reps: cleanReps,
              pain_rating: null // Wait for chat
          }])
          .select()
          .single();

        if (logData) {
            setWorkoutLogId(logData.id);
            console.log("Workout saved:", logData.id);
        }
      }
    } catch (err) {
      console.error("Error saving workout:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = () => {
    setHasFinished(false);
    setIsRunning(true);
    setShowChat(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setHasFinished(false); // Treat stop as "finished for now" so they can access chat
  };

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Loading Prescription...</div>;
  if (!exerciseConfig) return <div style={{padding: 40, textAlign: 'center'}}>Exercise not found.</div>;

  return (
    <div className="exercise-page-container">
      
      <CameraView 
        exerciseType={type} 
        goal={exerciseConfig.goal} 
        isRunning={isRunning}
        hasCompleted={hasFinished}
        onComplete={handleComplete} 
      />

      <div className="info-panel">
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#6b7280' }}>
            <IconSymbol name="chevron.left" size={20} color="#6b7280" /> Back
        </button>

        <ThemedText type="title" style={{ fontSize: '2.5rem' }}>{exerciseConfig.title}</ThemedText>
        
        <div className="instruction-card">
            <h3 style={{ margin: '0 0 10px 0' }}>Instructions</h3>
            <p style={{ color: '#4b5563', lineHeight: '1.5' }}>{exerciseConfig.instructions}</p>
            
            {/* DYNAMIC GOAL DISPLAY */}
            <div style={{ marginTop: '16px', fontWeight: 'bold', color: '#3730a3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Goal: {exerciseConfig.baseGoal} Reps {exerciseConfig.isSided ? '(Per Side)' : ''}</span>
                {assignmentId && <span style={{fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px'}}>PRESCRIBED</span>}
            </div>
        </div>

        {/* --- CONTROLS AREA --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            
            {!isRunning && !hasFinished && (
                <button className="btn-start" onClick={handleStart}>
                    Start Activity
                </button>
            )}

            {isRunning && (
                <button className="btn-start" style={{ background: '#ef4444' }} onClick={handleStop}>
                    Stop / Finish Early
                </button>
            )}

            {/* POST-WORKOUT MENU */}
            {hasFinished && (
                <>
                    <button 
                        className="btn-start" 
                        style={{ background: '#2563eb', color: 'white', border: 'none' }} 
                        onClick={() => setShowChat(true)}
                    >
                        💬 Chat with AI Assistant
                    </button>

                    <button 
                        className="btn-start" 
                        style={{ background: 'white', border: '2px solid #e5e7eb', color: '#374151' }} 
                        onClick={handleStart}
                    >
                        ↻ Redo Exercise
                    </button>
                </>
            )}
        </div>
        
        {saving && <div style={{marginTop: 10, color: 'gray', fontStyle: 'italic'}}>Saving progress...</div>}
      </div>

      {showChat && (
        <ChatInterface 
            workoutLogId={workoutLogId} 
            exerciseName={exerciseConfig.title}
            onClose={() => setShowChat(false)} 
        />
      )}

    </div>
  );
}