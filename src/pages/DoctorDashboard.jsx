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
  
  // NOTIFICATIONS
  const [notifications, setNotifications] = useState(new Set()); 
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  // 1. INITIAL FETCH
  useEffect(() => {
    fetchInitialData();
  }, []);

  // 2. WHEN PATIENT SELECTED
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
      setPatients(patientData || []);

      const { data: exerciseData } = await supabase.from('exercises').select('*');
      setExercises(exerciseData || []);

      const { data: unseenLogs } = await supabase
        .from('workout_logs')
        .select('patient_id')
        .eq('seen_by_doctor', false);

      const newActivity = new Set();
      unseenLogs?.forEach(log => newActivity.add(log.patient_id));
      setNotifications(newActivity);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const markLogsAsSeen = async (patientId) => {
      const newNotes = new Set(notifications);
      newNotes.delete(patientId);
      setNotifications(newNotes);

      await supabase
        .from('workout_logs')
        .update({ seen_by_doctor: true })
        .eq('patient_id', patientId)
        .eq('seen_by_doctor', false);
  };

  const fetchPatientDetails = async (patientId) => {
    setLoadingLogs(true);
    try {
        // Fetch History
        const { data: logs } = await supabase
        .from('workout_logs')
        .select(`
            id, created_at, total_reps, clean_reps, pain_rating, assignment_id,
            assignments ( exercises ( slug ) ),
            chat_sessions ( 
                chat_messages ( sender, context, created_at ) 
            )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

        setPatientLogs(logs || []);

        // Fetch Active Plan
        const { data: plan } = await supabase
        .from('assignments')
        .select(`id, created_at, is_active, exercises ( slug, id )`)
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

        setActiveAssignments(plan || []);
    } catch (err) { console.error(err); } 
    finally { setLoadingLogs(false); }
  };

  const handleAssignExercise = async () => {
    if (!selectedExerciseId || !selectedPatientId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser(); 
      const { error } = await supabase.from('assignments').insert([{
            patient_id: selectedPatientId,
            exercise_id: selectedExerciseId,
            assigned_by: user.id,
            is_active: true
        }]);
      if (error) throw error;
      alert("Exercise Assigned!");
      setShowModal(false);
      fetchPatientDetails(selectedPatientId);
    } catch (error) { alert(error.message); }
  };

  const handleUnassign = async (assignmentId) => {
      if(!window.confirm("Remove this exercise?")) return;
      const { error } = await supabase.from('assignments').update({ is_active: false }).eq('id', assignmentId);
      if (!error) fetchPatientDetails(selectedPatientId);
  };

  const formatSlug = (slug) => {
      if (!slug) return "Exercise";
      return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Logic: 0-3 (Green), 4-6 (Yellow), 7+ (Red)
  const getPainStatus = (score) => {
    if (score === null || score === undefined) {
        return { 
            color: '#94a3b8', // Grey
            bg: '#f1f5f9', 
            label: 'Pain Level: N/A', 
            icon: '➖' 
        };
    }
    else if (score <= 3) return { color: '#22c55e', bg: '#dcfce7', label: `Pain Level: ${score}`, icon: '✅' };
    else if (score >= 4 && score <= 6) return { color: '#eab308', bg: '#fef9c3', label: `Pain Level: ${score}`, icon: '⚠️' };
    return { color: '#ef4444', bg: '#fee2e2', label: `Pain Level: ${score}`, icon: '🚨' };
  };

  const activePatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb' }}>
      
      {/* LEFT COLUMN */}
      <div style={{ width: '350px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <ThemedText type="title" style={{ fontSize: '24px' }}>My Patients</ThemedText>
          <div style={{ marginTop: '16px' }}>
             <StyledInput icon="person.fill" placeholder="Search patients..." />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? <div style={{padding: 20}}>Loading...</div> : patients.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatientId(p.id)}
              style={{ 
                padding: '16px 24px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                background: selectedPatientId === p.id ? '#eff6ff' : 'transparent',
                borderLeft: selectedPatientId === p.id ? '4px solid #0a7ea4' : '4px solid transparent',
              }}
            >
              <div className="row gap-2" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '20px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#6b7280' }}>
                    {p.full_name ? p.full_name.charAt(0) : '?'}
                </div>
                <div style={{flex: 1}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <ThemedText type="defaultSemiBold">{p.full_name || 'Unnamed'}</ThemedText>
                        {notifications.has(p.id) && (
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 0 2px white' }} title="New Activity"></div>
                        )}
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
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{activePatient.full_name}</h1>
                        <p style={{ color: '#6b7280', margin: 0 }}>Patient Dashboard</p>
                    </div>
                    <button className="btn-black" onClick={() => setShowModal(true)} style={{ background: '#11181C', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ Assign Exercise</button>
                </div>

                {/* ACTIVE ASSIGNMENTS */}
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px', color: '#374151' }}>Active Assignment</h3>
                    {activeAssignments.length === 0 ? (
                         <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>No active exercises.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                            {activeAssignments.map(assign => {
                                const today = new Date().toISOString().split('T')[0];
                                const isDoneToday = patientLogs.some(log => log.assignment_id === assign.id && log.created_at.startsWith(today));

                                return (
                                    <div key={assign.id} style={{ 
                                        background: isDoneToday ? '#ecfdf5' : '#11181C', 
                                        color: isDoneToday ? '#065f46' : 'white',
                                        padding: '16px', borderRadius: '12px',
                                        border: isDoneToday ? '1px solid #34d399' : 'none'
                                    }}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                            <h4 style={{ margin: '0 0 5px 0' }}>{formatSlug(assign.exercises?.slug)}</h4>
                                            <button onClick={() => handleUnassign(assign.id)} style={{ background: 'none', border: 'none', color: isDoneToday ? '#065f46' : 'gray', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }} title="Unassign">×</button>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px' }}>
                                            {isDoneToday ? '✅ Completed Today' : `Assigned: ${new Date(assign.created_at).toLocaleDateString()}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ACTIVITY FEED */}
                <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px', color: '#374151' }}>Activity Feed</h3>

                {loadingLogs ? (
                    <p>Loading activity...</p>
                ) : patientLogs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', background: 'white', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>No activity recorded yet.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {patientLogs.map(log => {
                            const pain = getPainStatus(log.pain_rating || 0);
                            const rawSlug = log.assignments?.exercises?.slug;
                            const exerciseTitle = formatSlug(rawSlug);
                            const date = new Date(log.created_at).toLocaleString();
                            
                            // --- FIX: GET ALL MESSAGES FROM ALL SESSIONS ---
                            // We use .flatMap to combine messages from multiple sessions into one list
                            const allMessages = log.chat_sessions?.flatMap(s => s.chat_messages) || [];
                            
                            // Sort by time (Oldest -> Newest)
                            allMessages.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                            const hasChat = allMessages.length > 0;

                            return (
                                <div key={log.id} style={{ 
                                    backgroundColor: 'white', borderRadius: '16px', padding: '24px', 
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb',
                                    borderLeft: `6px solid ${pain.color}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{exerciseTitle}</h3>
                                            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{date}</span>
                                        </div>
                                        <div style={{ backgroundColor: pain.bg, color: pain.color, padding: '4px 12px', borderRadius: '9999px', fontWeight: 'bold', fontSize: '0.875rem', height: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{pain.icon}</span>
                                            <span>{pain.label}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                                        <div style={{ background: '#f9fafb', padding: '8px 16px', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>REPS</span>
                                            <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{log.clean_reps} / {log.total_reps}</span>
                                        </div>
                                        <div style={{ background: '#f9fafb', padding: '8px 16px', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>STATUS</span>
                                            <span style={{ fontWeight: '600', fontSize: '1.1rem', color: log.total_reps >= 5 ? '#22c55e' : '#ef4444' }}>
                                                {log.total_reps >= 5 ? 'Completed' : 'Incomplete'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* FULL TRANSCRIPT (Fixed!) */}
                                    {hasChat ? (
                                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                <span>💬</span> <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>SESSION TRANSCRIPT</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {allMessages.map((msg, idx) => (
                                                    <div key={idx} style={{ fontSize: '0.9rem' }}>
                                                        <span style={{ fontWeight: 'bold', color: msg.sender === 'ai' ? '#2563eb' : '#11181C', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                                            {msg.sender === 'ai' ? 'AI Assistant' : 'Patient'}:
                                                        </span>
                                                        <span style={{ marginLeft: '8px', color: '#334155' }}>"{msg.context}"</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>No comments logged for this session.</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9ca3af' }}>
                <p>Select a patient from the left to view their dashboard.</p>
            </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '400px' }}>
                <h3>Assign New Exercise</h3>
                <select style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }} onChange={(e) => setSelectedExerciseId(e.target.value)}>
                    <option value="">-- Select Exercise --</option>
                    {exercises.map(ex => ( <option key={ex.id} value={ex.id}>{formatSlug(ex.slug)}</option> ))}
                </select>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleAssignExercise} style={{ padding: '10px 20px', background: '#11181C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Assign</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}