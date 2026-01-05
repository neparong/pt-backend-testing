import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import CameraView from '../components/CameraView'; 
import ChatInterface from '../components/ChatInterface'; // <--- IMPORT THE CHATBOT
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import '../App.css'; 

export default function ExercisePage() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // NEW: CHAT STATE
  const [showChat, setShowChat] = useState(false);
  const [workoutLogId, setWorkoutLogId] = useState(null);
  
  const config = {
    squat: { title: "Squats", goal: { total: 8, perSide: false }, instructions: "Keep your chest up and lower your hips until thighs are parallel." },
    lateral_leg_lift: { title: "Leg Lifts", goal: { total: 16, perSide: true, switchAt: 8 }, instructions: "Lift leg sideways keeping torso upright." },
    band_stretch: { title: "Band Pull-Aparts", goal: { total: 10, perSide: false }, instructions: "Pull band apart keeping arms straight." }
  }[type] || { title: "Exercise", goal: { total: 5 }, instructions: "Follow the prompts." };

  const handleComplete = async (stats) => {
    setIsRunning(false);
    setHasFinished(true);
    setSaving(true);
    
    const { totalReps = config.goal.total, cleanReps = config.goal.total } = stats || {};

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('id')
        .eq('slug', type)
        .single();
        
      if (!exerciseData) throw new Error("Exercise not found in DB");

      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('id')
        .eq('patient_id', user.id)
        .eq('exercise_id', exerciseData.id)
        .eq('is_active', true)
        .maybeSingle();

      if (assignmentData) {
        // SAVE AND CAPTURE THE ID
        const { data: logData, error } = await supabase
          .from('workout_logs')
          .insert([
            {
              assignment_id: assignmentData.id,
              patient_id: user.id,
              total_reps: totalReps,
              clean_reps: cleanReps,
              pain_rating: 0
            }
          ])
          .select() // <--- Forces return of the new row
          .single();

        if (logData) {
            setWorkoutLogId(logData.id); // Save ID for the Chatbot
            console.log("Workout saved with ID:", logData.id);
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
    setShowChat(false); // Hide chat on restart
  };

  const handleStop = () => {
    setIsRunning(false);
    setHasFinished(false);
  };

  return (
    <div className="exercise-page-container">
      
      <CameraView 
        exerciseType={type} 
        goal={config.goal} 
        isRunning={isRunning}
        hasCompleted={hasFinished}
        onComplete={handleComplete} 
      />

      <div className="info-panel">
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#6b7280' }}>
            <IconSymbol name="chevron.left" size={20} color="#6b7280" /> Back
        </button>

        <ThemedText type="title" style={{ fontSize: '2.5rem' }}>{config.title}</ThemedText>
        
        <div className="instruction-card">
            <h3 style={{ margin: '0 0 10px 0' }}>Instructions</h3>
            <p style={{ color: '#4b5563', lineHeight: '1.5' }}>{config.instructions}</p>
            <div style={{ marginTop: '16px', fontWeight: 'bold', color: '#3730a3' }}>
                Goal: {config.goal.total} Reps
            </div>
        </div>

        {!isRunning ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <button className="btn-start" onClick={handleStart}>
                    {hasFinished ? "Repeat Activity" : "Start Activity"}
                </button>
                
                {/* --- THIS IS THE MISSING BUTTON --- */}
                {hasFinished && (
                    <button 
                        className="btn-start" 
                        style={{ background: 'white', border: '2px solid #11181C', color: '#11181C' }} 
                        onClick={() => setShowChat(true)}
                    >
                        💬 Chat with AI Assistant
                    </button>
                )}
            </div>
        ) : (
            <button className="btn-start" style={{ background: '#ef4444' }} onClick={handleStop}>
                Stop
            </button>
        )}
        
        {saving && <div style={{marginTop: 10, color: 'gray', fontStyle: 'italic'}}>Saving progress...</div>}
      </div>

      {/* CHAT POPUP */}
      {showChat && (
        <ChatInterface 
            workoutLogId={workoutLogId} 
            exerciseName={config.title}
            onClose={() => setShowChat(false)} 
        />
      )}

    </div>
  );
}