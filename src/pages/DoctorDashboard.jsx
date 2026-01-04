import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSymbol } from '../components/IconSymbol';
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [selectedPatientId, setSelectedPatientId] = useState('1');

  const patients = [
    { id: '1', name: 'John Smith', email: 'smithjohn23@gmail.com', exercises: ['Shoulder Flexion (3x10)', 'Knee Extension (2x15)'] },
    { id: '2', name: 'Michael Scott', email: 'theoffice@email.com', exercises: ['Hip Abduction (3x12)'] },
    { id: '3', name: 'Taylor Johnson', email: 'taylor@email.com', exercises: [] },
  ];

  const activePatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb' }}>
      
      {/* LEFT COLUMN */}
      <div style={{ width: '350px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <ThemedText type="title" style={{ fontSize: '24px' }}>My Patients</ThemedText>
          <div style={{ marginTop: '16px' }}>
             <StyledInput icon="person.fill" placeholder="Add new patient..." />
          </div>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {patients.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatientId(p.id)}
              style={{ 
                padding: '16px 24px', 
                borderBottom: '1px solid #f3f4f6', 
                cursor: 'pointer',
                background: selectedPatientId === p.id ? '#eff6ff' : 'transparent',
                borderLeft: selectedPatientId === p.id ? '4px solid #0a7ea4' : '4px solid transparent'
              }}
            >
              <div className="row gap-2">
                <div style={{ width: 40, height: 40, borderRadius: '20px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#6b7280' }}>
                    {p.name.charAt(0)}
                </div>
                <div>
                    <ThemedText type="defaultSemiBold">{p.name}</ThemedText>
                    <div style={{ fontSize: '12px', color: 'gray' }}>{p.exercises.length} Active Plans</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {activePatient ? (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                        <ThemedText type="title">{activePatient.name}</ThemedText>
                        <ThemedText style={{ color: 'gray' }}>{activePatient.email}</ThemedText>
                    </div>
                    <button className="btn-white-outline">View History</button>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
                        <ThemedText type="subtitle">Assigned Plan</ThemedText>
                        <button className="btn-black" style={{ fontSize: '12px' }}>+ Add Exercise</button>
                    </div>
                    
                    {activePatient.exercises.length > 0 ? (
                        <div className="col gap-2">
                            {activePatient.exercises.map((ex, idx) => (
                                <div key={idx} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                    {ex}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'gray', border: '2px dashed #e5e7eb', borderRadius: '12px' }}>
                            No exercises assigned yet.
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="center" style={{ height: '100%', color: 'gray' }}>Select a patient to view details</div>
        )}
      </div>
    </div>
  );
}