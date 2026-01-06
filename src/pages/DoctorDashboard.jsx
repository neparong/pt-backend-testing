import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  
  // STATE
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [patientLogs, setPatientLogs] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [notifications, setNotifications] = useState(new Set()); 
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // SEARCH & FILTER STATE
  const [patientSearch, setPatientSearch] = useState(""); 

  // MODAL & FORM STATE
  const [showModal, setShowModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(""); 
  
  // EDITING STATE
  const [editingAssignmentId, setEditingAssignmentId] = useState(null); 
  const [rxReps, setRxReps] = useState(10);
  const [rxFreq, setRxFreq] = useState('Daily');
  const [rxDuration, setRxDuration] = useState(1); 

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
      markLogsAsSeen(selectedPatientId); 
    } else {
      setPatientLogs([]);
      setActiveAssignments([]);
    }
  }, [selectedPatientId]);

  const fetchInitialData = async () => {
    try {
      const { data: patientData } = await supabase.from('profiles').select('*');
      const { data: exerciseData } = await supabase.from('exercises').select('*');
      setExercises(exerciseData || []);

      const { data: allLogs } = await supabase
        .from('workout_logs')
        .select('patient_id, created_at, seen_by_doctor')
        .order('created_at', { ascending: false });

      const lastActiveMap = {};
      const newActivity = new Set();

      allLogs?.forEach(log => {
        if (!lastActiveMap[log.patient_id]) {
            lastActiveMap[log.patient_id] = new Date(log.created_at);
        }
        if (!log.seen_by_doctor) {
            newActivity.add(log.patient_id);
        }
      });

      setNotifications(newActivity);

      if (patientData) {
          const sorted = patientData.sort((a, b) => {
              const dateA = lastActiveMap[a.id] || new Date(0); 
              const dateB = lastActiveMap[b.id] || new Date(0);
              return dateB - dateA; 
          });
          setPatients(sorted);
      }

    } catch (error) { console.error("Error loading dashboard:", error); } 
    finally { setLoading(false); }
  };

  const markLogsAsSeen = async (patientId) => {
      const newNotes = new Set(notifications);
      newNotes.delete(patientId);
      setNotifications(newNotes);
      await supabase.from('workout_logs').update({ seen_by_doctor: true }).eq('patient_id', patientId).eq('seen_by_doctor', false);
  };

  const fetchPatientDetails = async (patientId) => {
    setLoadingLogs(true);
    try {
        const { data: logs } = await supabase.from('workout_logs')
        .select(`
            id, created_at, total_reps, clean_reps, pain_rating, assignment_id,
            assignments ( 
                custom_goal,
                exercises ( slug, name, default_goal ) 
            ), 
            chat_sessions ( chat_messages ( sender, context, created_at ) )
        `)
        .eq('patient_id', patientId).order('created_at', { ascending: false });
        
        setPatientLogs(logs || []);

        const { data: plan } = await supabase.from('assignments')
        .select(`id, created_at, is_active, custom_goal, frequency, duration_weeks, exercises ( slug, id, name, default_goal, default_instructions, is_sided )`)
        .eq('patient_id', patientId).eq('is_active', true).order('created_at', { ascending: false });
        
        setActiveAssignments(plan || []);
    } catch (err) { console.error(err); } finally { setLoadingLogs(false); }
  };

  // --- MODAL HANDLERS ---

  const handleOpenAddModal = () => {
      setEditingAssignmentId(null);
      setSelectedExercise(null);
      setSearchQuery("");
      setShowModal(true);
  };

  const handleOpenEditModal = (assignment) => {
      setEditingAssignmentId(assignment.id);
      setSelectedExercise(assignment.exercises); 
      setRxReps(assignment.custom_goal || 8);
      setRxFreq(assignment.frequency || 'Daily');
      setRxDuration(assignment.duration_weeks || 4);
      setShowModal(true);
  };

  const handleSelectExercise = (ex) => {
      setSelectedExercise(ex);
      setRxReps(ex.default_goal || 8); 
  };

  const handleSaveProgram = async () => {
    if (!selectedExercise || !selectedPatientId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser(); 
      
      if (editingAssignmentId) {
          const { error } = await supabase.from('assignments')
            .update({ custom_goal: rxReps, frequency: rxFreq, duration_weeks: rxDuration })
            .eq('id', editingAssignmentId);
          if (error) throw error;
          alert("Program Updated!");
      } else {
          const { error } = await supabase.from('assignments').insert([{
                patient_id: selectedPatientId,
                exercise_id: selectedExercise.id,
                assigned_by: user.id,
                is_active: true,
                custom_goal: rxReps,
                frequency: rxFreq,
                duration_weeks: rxDuration
            }]);
          if (error) throw error;
          alert("Exercise Assigned Successfully!");
      }
      setShowModal(false);
      fetchPatientDetails(selectedPatientId);
    } catch (error) { alert(error.message); }
  };

  const handleUnassign = async (assignmentId) => {
      if(!window.confirm("End this exercise program?")) return;
      const { error } = await supabase.from('assignments').update({ is_active: false }).eq('id', assignmentId);
      if (!error) fetchPatientDetails(selectedPatientId);
  };

  const formatSlug = (slug) => {
      if (!slug) return "Exercise";
      return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getExerciseName = (exerciseObj) => {
      if (exerciseObj?.name) return exerciseObj.name;
      if (exerciseObj?.slug) return exerciseObj.slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return "Exercise";
  };

  const getPainStatus = (log) => {
    const hasChatted = log.chat_sessions && log.chat_sessions.length > 0;
    if (!hasChatted && log.pain_rating === null) return { color: '#94a3b8', bg: '#f8fafc', label: 'Pain Level: N/A', icon: '💬' };
    if (log.pain_rating === null) return { color: '#94a3b8', bg: '#f8fafc', label: 'Pain Level: N/A', icon: '💬' };
    
    const score = log.pain_rating;
    if (score <= 3) return { color: '#22c55e', bg: '#dcfce7', label: `Pain Level: ${score}`, icon: '✅' };
    if (score >= 4 && score <= 6) return { color: '#eab308', bg: '#fef9c3', label: `Pain Level: ${score}`, icon: '⚠️' };
    return { color: '#ef4444', bg: '#fee2e2', label: `Pain Level: ${score}`, icon: '🚨' };
  };

  const activePatient = patients.find(p => p.id === selectedPatientId);
  const filteredExercises = exercises.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPatients = patients.filter(p => (p.full_name || '').toLowerCase().includes(patientSearch.toLowerCase()));

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb' }}>
      
      {/* LEFT COLUMN */}
      <div style={{ width: '350px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <ThemedText type="title" style={{ fontSize: '24px' }}>My Patients</ThemedText>
          <div style={{ marginTop: '16px' }}>
             <StyledInput icon="person.fill" placeholder="Search patients..." value={patientSearch} onChangeText={setPatientSearch} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? <div style={{padding: 20}}>Loading...</div> : filteredPatients.map(p => (
            <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedPatientId === p.id ? '#eff6ff' : 'transparent', borderLeft: selectedPatientId === p.id ? '4px solid #0a7ea4' : '4px solid transparent' }}>
              <div className="row gap-2" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '20px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#6b7280' }}>
                    {p.full_name ? p.full_name.charAt(0) : '?'}
                </div>
                <div style={{flex: 1}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <ThemedText type="defaultSemiBold">{p.full_name || 'Unnamed'}</ThemedText>
                        {notifications.has(p.id) && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 0 2px white' }} title="New Activity"></div>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'gray' }}>ID: {p.id.slice(0, 4)}...</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 20, borderTop: '1px solid #eee' }}>
            <button onClick={() => { supabase.auth.signOut(); navigate('/'); }} style={{ width: '100%', padding: 10, cursor: 'pointer', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8 }}>Sign Out</button>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {activePatient ? (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Header (Button Removed) */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{activePatient.full_name}</h1>
                    <p style={{ color: '#6b7280', margin: 0 }}>Patient Dashboard</p>
                </div>

                {/* ACTIVE PROGRAM (Button Added Here) */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#374151' }}>Active Exercise Program</h3>
                        <button className="btn-black" onClick={handleOpenAddModal} style={{ background: '#11181C', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>+ Assign Exercise</button>
                    </div>

                    {activeAssignments.length === 0 ? (
                         <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>No active exercises.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {activeAssignments.map(assign => {
                                const today = new Date().toISOString().split('T')[0];
                                const isDoneToday = patientLogs.some(log => log.assignment_id === assign.id && log.created_at.startsWith(today));

                                return (
                                    <div key={assign.id} style={{ 
                                        // UPDATED: White background if not done
                                        background: isDoneToday ? '#ecfdf5' : 'white', 
                                        color: isDoneToday ? '#065f46' : '#11181C',
                                        padding: '16px', borderRadius: '12px',
                                        // UPDATED: Border logic
                                        border: isDoneToday ? '1px solid #34d399' : '1px solid #e5e7eb',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        position: 'relative' 
                                    }}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                            <h4 style={{ margin: '0 0 5px 0' }}>{getExerciseName(assign.exercises)}</h4>
                                            <div style={{display:'flex', gap: '8px'}}>
                                                {/* UPDATED: Buttons are now grey/dark so they show on white bg */}
                                                <button onClick={() => handleOpenEditModal(assign)} style={{ background: 'none', border: 'none', color: isDoneToday ? '#065f46' : '#9ca3af', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }} title="Edit">✏️</button>
                                                <button onClick={() => handleUnassign(assign.id)} style={{ background: 'none', border: 'none', color: isDoneToday ? '#065f46' : '#9ca3af', cursor: 'pointer', fontSize: '1.5rem', padding: 0 }} title="Unassign">×</button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px', display: 'flex', gap: '12px' }}>
                                            <span>🎯 {assign.custom_goal || 8} Reps {assign.exercises?.is_sided ? '(Per Side)' : ''}</span>
                                            <span>📅 {assign.frequency || 'Daily'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ACTIVITY FEED */}
                <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px', color: '#374151' }}>Activity Feed</h3>
                {loadingLogs ? <p>Loading activity...</p> : patientLogs.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', background: 'white', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>No activity recorded yet.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {patientLogs.map(log => {
                            const pain = getPainStatus(log);
                            const exerciseTitle = getExerciseName(log.assignments?.exercises);
                            const date = new Date(log.created_at).toLocaleString();
                            const allMessages = log.chat_sessions?.flatMap(s => s.chat_messages) || [];
                            allMessages.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                            const uniqueMessages = allMessages.filter((msg, index, self) => index === 0 || !(msg.sender === self[index-1].sender && msg.context === self[index-1].context));
                            const hasChat = uniqueMessages.length > 0;

                            const targetReps = log.assignments?.custom_goal || log.assignments?.exercises?.default_goal || 8;
                            const isComplete = log.total_reps >= targetReps;

                            return (
                                <div key={log.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', borderLeft: `6px solid ${pain.color}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div><h3 style={{ margin: 0, fontSize: '1.25rem' }}>{exerciseTitle}</h3><span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{date}</span></div>
                                        <div style={{ backgroundColor: pain.bg, color: pain.color, padding: '4px 12px', borderRadius: '9999px', fontWeight: 'bold', fontSize: '0.875rem', height: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}><span>{pain.icon}</span><span>{pain.label}</span></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                                        <div style={{ background: '#f9fafb', padding: '8px 16px', borderRadius: '8px' }}><span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>REPS</span><span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{log.clean_reps} / {log.total_reps}</span></div>
                                        <div style={{ background: '#f9fafb', padding: '8px 16px', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>STATUS</span>
                                            <span style={{ fontWeight: '600', fontSize: '1.1rem', color: isComplete ? '#22c55e' : '#ef4444' }}>
                                                {isComplete ? 'Completed' : 'Incomplete'}
                                            </span>
                                        </div>
                                    </div>
                                    {hasChat ? (
                                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><span>💬</span> <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>SESSION TRANSCRIPT</span></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {uniqueMessages.map((msg, idx) => (
                                                    <div key={idx} style={{ fontSize: '0.9rem' }}>
                                                        <span style={{ fontWeight: 'bold', color: msg.sender === 'ai' ? '#2563eb' : '#11181C', textTransform: 'uppercase', fontSize: '0.75rem' }}>{msg.sender === 'ai' ? 'AI Assistant' : 'Patient'}:</span>
                                                        <span style={{ marginLeft: '8px', color: '#334155' }}>"{msg.context}"</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>Patient has not started chat session.</div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        ) : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9ca3af' }}><p>Select a patient from the left to view their dashboard.</p></div>}
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
            <div style={{ background: 'white', borderRadius: '16px', width: '800px', height: '600px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                    <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
                        {selectedExercise && !editingAssignmentId && (
                            <button onClick={() => setSelectedExercise(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
                        )}
                        <h3 style={{ margin: 0 }}>{editingAssignmentId ? 'Edit Exercise Program' : (selectedExercise ? `Configure ${selectedExercise.name}` : 'Select Exercise')}</h3>
                    </div>
                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
                </div>
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {!selectedExercise && !editingAssignmentId ? (
                        <>
                            <div style={{ marginBottom: '20px' }}>
                                <input placeholder="🔍 Search exercises..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {filteredExercises.map(ex => (
                                    <div key={ex.id} onClick={() => handleSelectExercise(ex)} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏃</div>
                                        <div style={{ fontWeight: '600', color: '#1f2937' }}>{ex.name}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534' }}>
                                <strong>Instructions:</strong> {selectedExercise.default_instructions || "No instructions provided."}
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                                    Daily Rep Goal {selectedExercise.is_sided ? '(Per Side)' : ''}
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={rxReps} 
                                        onChange={(e) => setRxReps(Number(e.target.value))} 
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} 
                                    />
                                </div>
                                {selectedExercise.is_sided && (
                                    <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '6px', background: '#f3f4f6', padding: '8px', borderRadius: '6px'}}>
                                        ℹ️ Patient will do <strong>{rxReps * 2}</strong> total reps (Switching sides at {rxReps}).
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Frequency</label>
                                    <select value={rxFreq} onChange={(e) => setRxFreq(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}><option value="Daily">Daily</option><option value="2x Daily">2x Daily</option><option value="Every Other Day">Every Other Day</option></select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Duration</label>
                                    <select value={rxDuration} onChange={(e) => setRxDuration(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}><option value={1}>1 Week</option><option value={2}>2 Weeks</option><option value={4}>4 Weeks</option><option value={8}>8 Weeks</option><option value={12}>12 Weeks</option></select>
                                </div>
                            </div>
                            <button onClick={handleSaveProgram} style={{ width: '100%', padding: '16px', background: '#11181C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>{editingAssignmentId ? 'Update Program' : 'Confirm Program'}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}