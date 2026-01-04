import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CameraView from '../components/CameraView'; 
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import '../App.css'; 

export default function ExercisePage() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  
  const config = {
    squat: { title: "Squats", goal: { total: 8, perSide: false }, instructions: "Keep your chest up and lower your hips until thighs are parallel." },
    lateral_leg_lift: { title: "Leg Lifts", goal: { total: 16, perSide: true, switchAt: 8 }, instructions: "Lift leg sideways keeping torso upright." },
    band_stretch: { title: "Band Pull-Aparts", goal: { total: 10, perSide: false }, instructions: "Pull band apart keeping arms straight." }
  }[type] || { title: "Exercise", goal: { total: 5 }, instructions: "Follow the prompts." };

  const handleComplete = () => {
    setIsRunning(false);
    setHasFinished(true);
  };

  const handleStart = () => {
    setHasFinished(false);
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    setHasFinished(false);
  };

  return (
    <div className="exercise-page-container">
      
      {/* LEFT: Camera */}
      <CameraView 
        exerciseType={type} 
        goal={config.goal} 
        isRunning={isRunning}
        hasCompleted={hasFinished}
        onComplete={handleComplete} 
      />

      {/* RIGHT: Info */}
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

        {/* LOGIC FOR BUTTON TEXT */}
        {!isRunning ? (
            <button className="btn-start" onClick={handleStart}>
                {hasFinished ? "Repeat Activity" : "Start Activity"}
            </button>
        ) : (
            <button className="btn-start" style={{ background: '#ef4444' }} onClick={handleStop}>
                Stop
            </button>
        )}
      </div>

    </div>
  );
}