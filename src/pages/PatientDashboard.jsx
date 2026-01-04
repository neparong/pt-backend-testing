import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
// Removed: import CameraView from '../components/CameraView'; (Not needed here anymore)
import '../App.css'; 

export default function PatientDashboard() {
  const navigate = useNavigate();
  // We don't need activeExercise state anymore because the URL handles it
  
  const exercises = [
    { id: '1', title: 'Squats', reps: '8 Reps', type: 'squat', goal: { total: 8, perSide: false } },
    { id: '2', title: 'Lateral Leg Lifts', reps: '8/Side', type: 'lateral_leg_lift', goal: { total: 16, perSide: true, switchAt: 8 } },
    { id: '3', title: 'Band Pull-Aparts', reps: '10 Reps', type: 'band_stretch', goal: { total: 10, perSide: false } }
  ];

  const handleStart = (ex) => {
    // THIS IS THE FIX: Navigate to the new page
    navigate(`/exercise/${ex.type}`);
  };

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', width: '100%' }}>
      
      {/* Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Header */}
        <div className="header-row" style={{ gridColumn: '1 / -1' }}>
          <div>
            <ThemedText type="title">Physical Therapy</ThemedText>
            <ThemedText style={{ color: '#6b7280' }}>Welcome back, SJ</ThemedText>
          </div>
          <div className="row gap-2">
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0e7ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#3730a3' }}>
              SJ
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
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>12/15</div>
        </div>

        {/* Exercise List */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <ThemedText type="subtitle" style={{ marginBottom: '20px' }}>Today's Plan</ThemedText>
          
          <div className="col gap-4">
            {exercises.map(ex => (
              <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #f3f4f6', borderRadius: '12px' }}>
                <div>
                  <ThemedText type="defaultSemiBold">{ex.title}</ThemedText>
                  <div style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', marginTop: '6px', alignSelf: 'flex-start', display: 'inline-block' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>{ex.reps}</span>
                  </div>
                </div>
                
                <div className="row gap-2">
                  <button className="btn-black" onClick={() => handleStart(ex)}>
                    <IconSymbol name="paperplane.fill" size={14} color="white" />
                    Start
                  </button>
                  <button className="btn-white-outline">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}