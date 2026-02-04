import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import CameraView from '../components/CameraView'; 
import ChatInterface from '../components/ChatInterface'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import { motion } from 'framer-motion'; 
import microSuccessSound from "../assets/microSuccessSound.mp3";
import '../App.css'; 

export default function ExercisePage() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  //sound load
  const successAudioRef = React.useRef(null);
  const unlockAudio = () => {
  if (!successAudioRef.current) return;

  successAudioRef.current.muted = true;

  successAudioRef.current
    .play()
    .then(() => {
      successAudioRef.current.pause();
      successAudioRef.current.currentTime = 0;
      successAudioRef.current.muted = false;
      console.log("✅ Audio unlocked");
    })
    .catch(err => {
      console.warn("Audio unlock failed:", err);
    });
};

  useEffect(() => {
    successAudioRef.current = new Audio(microSuccessSound);
    successAudioRef.current.volume = .8; // subtle, not arcade
  }, []);

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

        const { data: exData, error: exError } = await supabase
          .from('exercises')
          .select('id, name, default_instructions, default_goal, is_sided')
          .eq('slug', type)
          .single();

        if (exError) throw exError;

        const { data: assignData } = await supabase
          .from('assignments')
          .select('id, custom_goal')
          .eq('patient_id', user.id)
          .eq('exercise_id', exData.id)
          .eq('is_active', true)
          .maybeSingle();

        const baseGoal = assignData?.custom_goal || exData.default_goal;
        const calculatedTotal = exData.is_sided ? (baseGoal * 2) : baseGoal;
        const switchPoint = exData.is_sided ? baseGoal : null;

        setAssignmentId(assignData?.id);
        
        setExerciseConfig({
            id: exData.id,
            title: exData.name,
            instructions: exData.default_instructions,
            isSided: exData.is_sided,
            baseGoal: baseGoal, 
            goal: { 
                total: calculatedTotal, 
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
        }
      }
    } catch (err) {
      console.error("Error saving workout:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = () => {
    unlockAudio();
    setHasFinished(false);
    setIsRunning(true);
    setShowChat(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setHasFinished(false); 
  };



  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Loading Prescription...</div>;
  if (!exerciseConfig) return <div style={{padding: 40, textAlign: 'center'}}>Exercise not found.</div>;

  return (
    <motion.div 
      className="exercise-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      
      <CameraView
      exerciseType={type}
      goal={exerciseConfig.goal}
      isRunning={isRunning}
      hasCompleted={hasFinished}
      onComplete={handleComplete}
      onCleanRep={() => {
        if (!successAudioRef.current) return;
          successAudioRef.current.currentTime = 0;
          successAudioRef.current.play().catch(() => {});
      }}
      />


      <div className="info-panel">
        <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#6b7280' }}
        >
            <IconSymbol name="chevron.left" size={20} color="#6b7280" /> Back
        </motion.button>

        <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
        >
            <ThemedText type="title" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>{exerciseConfig.title}</ThemedText>
        </motion.div>
        
        <motion.div 
            className="modern-card instruction-card"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ padding: '24px' }} 
        >
            <h3 style={{ margin: '0 0 10px 0' }}>Instructions</h3>
            <p style={{ color: '#4b5563', lineHeight: '1.5' }}>{exerciseConfig.instructions}</p>
            
            <div style={{ marginTop: '16px', fontWeight: 'bold', color: '#3730a3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Goal: {exerciseConfig.baseGoal} Reps {exerciseConfig.isSided ? '(Per Side)' : ''}</span>
                {assignmentId && <span style={{fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px'}}>PRESCRIBED</span>}
            </div>
        </motion.div>

        {/* --- CONTROLS AREA --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            
            {!isRunning && !hasFinished && (
                <motion.button 
                    className="btn-start" 
                    onClick={handleStart}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Start Activity
                </motion.button>
            )}

            {isRunning && (
                <motion.button 
                    className="btn-start" 
                    style={{ background: '#ef4444' }} 
                    onClick={handleStop}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Stop / Finish Early
                </motion.button>
            )}

            {/* POST-WORKOUT MENU */}
            {hasFinished && (
                <>
                    {/* 👇 THIS IS THE SCRIPT-MATCHING BUTTON */}
                    <motion.button 
                        className="btn-start" 
                        style={{ background: '#2563eb', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} 
                        onClick={() => setShowChat(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🎙️</span> 
                        <span>Speak to Assistant (Hands-Free)</span>
                    </motion.button>

                    <motion.button 
                        className="btn-start" 
                        style={{ background: 'white', border: '2px solid #e5e7eb', color: '#374151' }} 
                        onClick={handleStart}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        ↻ Redo Exercise
                    </motion.button>
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

    </motion.div>
  );
}