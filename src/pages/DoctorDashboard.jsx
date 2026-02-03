import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import { ThemedText } from '../components/ThemedText';
import { StyledInput } from '../components/StyledInput';
import { IconSymbol } from '../components/IconSymbol';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from "jspdf";
import '../App.css';



/* ============================
   BILLING CONSTANTS (837P)
============================ */

// CPT codes (Physical Therapy – common)
const CPT_CODES = {
  THERAPEUTIC_EXERCISE: {
    code: "97110",
    description: "Therapeutic exercises",
    rate: 35, // example $ per unit
  },
  THERAPEUTIC_ACTIVITY: {
    code: "97530",
    description: "Therapeutic activities",
    rate: 40,
  },
};

// ICD-10 mapping by pain severity / context
const ICD10_MAP = {
  LOW_PAIN: "M25.50",        // Joint pain, unspecified
  MODERATE_PAIN: "M25.59",   // Other joint disorder
  HIGH_PAIN: "G89.29",       // Chronic pain
  UNKNOWN: "Z00.00",         // General exam
};

// Provider (eventually comes from profiles table)
const PROVIDER_INFO = {
  name: "PhysioAI Physical Therapy",
  address: "123 Therapy Lane, Anytown, VA 22101",
  npi: "1234567890", // placeholder
};

const getICD10Code = (logs = []) => {
  if (!logs.length) return ICD10_MAP.UNKNOWN;

  const avgPain =
    logs.reduce((sum, l) => sum + (l.pain_rating ?? 0), 0) / logs.length;

  if (avgPain >= 6) return ICD10_MAP.HIGH_PAIN;
  if (avgPain >= 3) return ICD10_MAP.MODERATE_PAIN;
  return ICD10_MAP.LOW_PAIN;
};

const getCPTSummary = (logs = []) => {
  const units = Math.max(logs.length, 1);

  return {
    code: CPT_CODES.THERAPEUTIC_EXERCISE.code,
    description: CPT_CODES.THERAPEUTIC_EXERCISE.description,
    units,
    rate: CPT_CODES.THERAPEUTIC_EXERCISE.rate,
    total: units * CPT_CODES.THERAPEUTIC_EXERCISE.rate,
  };
};

const getServiceDateRange = (logs = []) => {
  if (!logs.length) return "";

  const dates = logs.map(l => new Date(l.created_at));
  const start = new Date(Math.min(...dates));
  const end = new Date(Math.max(...dates));

  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
};


const generatePatientPDF = async (patient) => {
  if (!patient?.id) return;

  try {
    const { data: logs } = await supabase
      .from("workout_logs")
      .select(`
        created_at,
        pain_rating,
        total_reps,
        clean_reps,
        assignments (
          exercises ( name )
        )
      `)
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: true });

    const doc = new jsPDF({ unit: "mm", format: "letter" });
    let y = 12;

    const line = () => {
      doc.line(10, y, 200, y);
      y += 4;
    };

    const field = (label, value = "") => {
      doc.setFontSize(9);
      doc.text(`${label}: ${value}`, 12, y);
      y += 5;
    };

    const icd10 = getICD10Code(logs);
    const cpt = getCPTSummary(logs);
    const serviceDates = getServiceDateRange(logs);

    /* HEADER */
    doc.setFontSize(14);
    doc.text("CMS-1500 / 837P CLAIM SUMMARY", 105, y, { align: "center" });
    y += 6;
    line();

    /* PROVIDER */
    doc.setFontSize(11);
    doc.text("PROVIDER INFORMATION", 12, y); y += 4; line();
    field("Provider Name", PROVIDER_INFO.name);
    field("Address", PROVIDER_INFO.address);
    field("NPI", PROVIDER_INFO.npi);

    /* PATIENT */
    y += 2;
    doc.text("PATIENT INFORMATION", 12, y); y += 4; line();
    field("Patient Name", patient.full_name);
    field("DOB", "MM/DD/YYYY");
    field("Insurance ID", "INS-XXXXXXX");

    /* CLAIM */
    y += 2;
    doc.text("CLAIM DETAILS", 12, y); y += 4; line();
    field("Dates of Service", serviceDates);
    field("Place of Service", "11 (Office)");
    field("Total Charges", `$${cpt.total.toFixed(2)}`);

    /* DIAGNOSIS / PROCEDURES */
    y += 2;
    doc.text("DIAGNOSIS & PROCEDURES", 12, y); y += 4; line();
    field("ICD-10 Diagnosis Code", icd10);
    field(
      "CPT Code",
      `${cpt.code} – ${cpt.description}`
    );
    field("Units", cpt.units);
    field("Charge per Unit", `$${cpt.rate.toFixed(2)}`);

    /* ATTACHMENT */
    y += 4;
    doc.text("ATTACHMENT: THERAPY ACTIVITY LOG", 12, y); y += 4; line();
    doc.setFontSize(9);

    if (!logs.length) {
      doc.text("No recorded therapy activity.", 12, y);
    } else {
      logs.forEach((log, i) => {
        if (y > 265) {
          doc.addPage();
          y = 15;
        }

        const ex = log.assignments?.exercises?.name || "Exercise";
        const reps = `${log.clean_reps ?? "-"}/${log.total_reps ?? "-"}`;
        const pain = log.pain_rating ?? "N/A";
        const date = log.created_at.split("T")[0];

        doc.text(
          `${i + 1}. ${date} | ${ex} | Reps: ${reps} | Pain: ${pain}`,
          12,
          y
        );
        y += 5;
      });
    }

    /* SIGNATURE */
    y += 6; line();
    doc.text("Provider Signature: ____________________________", 12, y);
    y += 6;
    doc.text("Date: ____________________", 140, y);

    doc.save(
      `${patient.full_name.replace(/\s+/g, "_")}_837P_Claim.pdf`
    );
  } catch (err) {
    console.error(err);
    alert("Failed to generate insurance-grade PDF");
  }
};


export default function DoctorDashboard() {
  const navigate = useNavigate();
  
  // STATE
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [patients, setPatients] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [patientLogs, setPatientLogs] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [notifications, setNotifications] = useState(new Set()); 
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // DASHBOARD STATS
  const [highPainAlerts, setHighPainAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]); 
  const [inactivePatients, setInactivePatients] = useState([]); 

  // SEARCH & FILTER
  const [patientSearch, setPatientSearch] = useState(""); 

  // MODAL & FORM
  const [showModal, setShowModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(""); 
  
  // EDITING
  const [editingAssignmentId, setEditingAssignmentId] = useState(null); 
  const [rxReps, setRxReps] = useState(10);
  const [rxFreq, setRxFreq] = useState('Daily');
  const [rxDuration, setRxDuration] = useState(1); 

  // REPLACES THE FIRST useEffect
  useEffect(() => {
    fetchInitialData();

    // 🔴 REALTIME SUBSCRIPTION
    // Listen for ANY changes to workout_logs (New workouts, pain updates)
    const channel = supabase
      .channel('doctor-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_logs' },
        (payload) => {
          console.log('Realtime update received!', payload);
          fetchInitialData(); // Re-fetch data immediately
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
          if (profile) setDoctorName(profile.full_name);
      }

      const { data: patientData } = await supabase.from('profiles').select('*').neq('role', 'therapist'); 
      const { data: exerciseData } = await supabase.from('exercises').select('*');
      setExercises(exerciseData || []);

      const { data: allLogs } = await supabase
        .from('workout_logs')
        .select(`
            id, patient_id, created_at, seen_by_doctor, pain_rating, 
            profiles(full_name),
            assignments(exercises(name))
        `)
        .order('created_at', { ascending: false });

      // LOGIC PROCESSING
      const lastActiveMap = {}; 
      const newActivity = new Set();
      const alerts = [];
      const recent = [];

      allLogs?.forEach(log => {
        const logDate = new Date(log.created_at);
        if (!lastActiveMap[log.patient_id]) {
            lastActiveMap[log.patient_id] = logDate;
        }

        if (!log.seen_by_doctor) {
            newActivity.add(log.patient_id);
        }

        const isRecent = logDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (isRecent && log.pain_rating > 3 && !log.seen_by_doctor) {
            if (!alerts.find(a => a.patient_id === log.patient_id)) {
                alerts.push({
                    log_id: log.id,
                    patient_id: log.patient_id,
                    name: log.profiles?.full_name || 'Patient',
                    score: log.pain_rating,
                    exercise: log.assignments?.exercises?.name || 'Exercise',
                    date: log.created_at
                });
            }
        }

        if (log.pain_rating <= 3) {
            recent.push({
                patient_id: log.patient_id,
                name: log.profiles?.full_name || 'Patient',
                exercise: log.assignments?.exercises?.name || 'Exercise',
                date: log.created_at,
                pain: log.pain_rating
            });
        }
      });

      const inactive = [];
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      
      if (patientData) {
          patientData.forEach(p => {
              const lastSeen = lastActiveMap[p.id];
              if (!lastSeen || lastSeen < fourDaysAgo) {
                  inactive.push({
                      id: p.id,
                      name: p.full_name,
                      lastSeen: lastSeen ? lastSeen.toLocaleDateString() : 'Never'
                  });
              }
          });
      }

      setNotifications(newActivity);
      setHighPainAlerts(alerts.slice(0, 4));
      setRecentActivity(recent.slice(0, 4));
      setInactivePatients(inactive.slice(0, 3)); 

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

  const handleDismissAlert = async (e, logId) => {
      e.stopPropagation();
      setHighPainAlerts(prev => prev.filter(alert => alert.log_id !== logId));
      await supabase.from('workout_logs').update({ seen_by_doctor: true }).eq('id', logId);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', height: '100vh', background: '#f9fafb', padding: 0 }}>
      
      {/* LEFT COLUMN */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{ width: '350px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '24px 24px 0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <IconSymbol name="waveform.path.ecg" size={20} color="#fff" />
           </div>
           <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>PhysioAI</span>
        </div>

        {/* 1. DOCTOR PROFILE & SIGNOUT */}
        <div style={{ padding: '24px 24px 10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1e40af', color:'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize:'1.1rem' }}>
                    {doctorName.charAt(0)}
                </div>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontWeight:'700', fontSize:'1rem', color: '#0f172a'}}>{doctorName}</span>
                    <span style={{fontSize:'0.75rem', color:'#64748b', fontWeight:'500'}}>Licensed Therapist</span>
                </div>
            </div>
            <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { supabase.auth.signOut(); navigate('/'); }} 
                style={{ background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', padding: '10px', borderRadius:'10px', color: '#ef4444' }}
                title="Sign Out"
            >
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#ef4444" />
            </motion.button>
        </div>

        {/* 2. NAVIGATION */}
        <div style={{ padding: '0 16px 24px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div 
                onClick={() => setSelectedPatientId(null)}
                className={`patient-list-item ${selectedPatientId === null ? 'selected' : ''}`}
                style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: selectedPatientId === null ? '#1d4ed8' : '#64748b' }}
            >
                <span>📊</span>
                <span style={{ fontWeight: '600' }}>Overview Dashboard</span>
            </div>
        </div>

        {/* 3. PATIENT LIST */}
        <div style={{ padding: '20px 24px 10px 24px' }}>
          <ThemedText type="defaultSemiBold" style={{color: '#334155'}}>My Patients</ThemedText>
          <div style={{ marginTop: '12px' }}>
             <StyledInput icon="person.fill" placeholder="Search patients..." value={patientSearch} onChangeText={setPatientSearch} />
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
          {loading ? <div style={{padding: 20}}>Loading...</div> : filteredPatients.map(p => (
            <div 
  key={p.id} 
  onClick={() => setSelectedPatientId(p.id)} 
  className={`patient-list-item ${selectedPatientId === p.id ? 'selected' : ''}`}
  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
>
  {/* LEFT: patient info */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{
      width: 36,
      height: 36,
      borderRadius: '18px',
      background: '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      color: '#64748b',
      fontSize: '0.9rem'
    }}>
      {p.full_name ? p.full_name.charAt(0) : '?'}
    </div>

    <div>
      <div style={{ fontWeight: 600, color: '#334155' }}>
        {p.full_name || 'Unnamed'}
      </div>
    </div>
  </div>

  {/* RIGHT: PDF button */}
  <button
    onClick={(e) => {
      e.stopPropagation(); // 🔴 critical
      generatePatientPDF(p);
    }}
    title="Download PDF Report"
    style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '6px 8px',
      cursor: 'pointer',
      fontSize: '0.85rem',
      color: '#2563eb'
    }}
  >
    📄
  </button>
</div>

          ))}
        </div>
      </motion.div>

      {/* RIGHT COLUMN */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <AnimatePresence mode="wait"> 
            {activePatient ? (
                <motion.div 
                    key={activePatient.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{ maxWidth: '800px', margin: '0 auto' }}
                >
                    <div style={{ marginBottom: '30px' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{activePatient.full_name}</h1>
                        <p style={{ color: '#6b7280', margin: 0 }}>Patient Profile</p> 
                    </div>

                    {/* EXERCISE ASSIGNMENTS */}
                    <div className="modern-card" style={{ padding: '24px', marginBottom: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#374151' }}>Active Exercise Program</h3>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {/* 👇 THIS IS THE SCRIPT-MATCHING BUTTON */}
                                <button 
                                    style={{ background: 'white', color: '#0f172a', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    title="Download report for insurance reimbursement"
                                    onClick={(e) => {
                                    e.stopPropagation(); // 🔴 critical
                                    if (!activePatient) return;
                                    generatePatientPDF(activePatient);
                                }}
                                >
                                    📄 Export RTM Data
                                </button>

                                <button className="btn-black" onClick={handleOpenAddModal} style={{ background: '#11181C', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    + Assign Exercise
                                </button>
                            </div>
                        </div>

                        {activeAssignments.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No active exercises.</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                                {activeAssignments.map(assign => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const isDoneToday = patientLogs.some(log => log.assignment_id === assign.id && log.created_at.startsWith(today));

                                    return (
                                        <div 
                                            key={assign.id} 
                                            style={{ 
                                                background: isDoneToday ? '#ecfdf5' : 'white', 
                                                color: isDoneToday ? '#065f46' : '#11181C',
                                                padding: '16px', 
                                                borderRadius: '12px',
                                                border: isDoneToday ? '1px solid #34d399' : '1px solid #e5e7eb',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                                <h4 style={{ margin: '0 0 5px 0' }}>{getExerciseName(assign.exercises)}</h4>
                                                <div style={{display:'flex', gap: '8px'}}>
                                                    <button onClick={() => handleOpenEditModal(assign)} style={{ background: 'none', border: 'none', color: isDoneToday ? '#065f46' : '#9ca3af', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }} title="Edit">✏️</button>
                                                    <button onClick={() => handleUnassign(assign.id)} style={{ background: 'none', border: 'none', color: isDoneToday ? '#065f46' : '#9ca3af', cursor: 'pointer', fontSize: '1.5rem', padding: 0 }} title="Unassign">×</button>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px', display: 'flex', gap: '12px' }}>
                                                <span>🎯 {assign.custom_goal || 8} Reps</span>
                                                <span>📅 {assign.frequency || 'Daily'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px', color: '#374151' }}>Activity Feed</h3>
                    {loadingLogs ? <p>Loading activity...</p> : patientLogs.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', background: 'white', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>No activity recorded yet.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {patientLogs.map(log => {
                                const pain = getPainStatus(log);
                                const exerciseTitle = getExerciseName(log.assignments?.exercises);
                                const date = new Date(log.created_at).toLocaleString();
                                const allMessages = log.chat_sessions?.flatMap(s => s.chat_messages) || [];
                                const uniqueMessages = allMessages.filter((msg, index, self) => index === 0 || !(msg.sender === self[index-1].sender && msg.context === self[index-1].context));
                                const hasChat = uniqueMessages.length > 0;
                                const targetReps = log.assignments?.custom_goal || log.assignments?.exercises?.default_goal || 8;
                                const isComplete = log.total_reps >= targetReps;

                                return (
                                    <motion.div 
                                        key={log.id} 
                                        className="modern-card"
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        style={{ padding: '24px', borderLeft: `6px solid ${pain.color}` }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div><h3 style={{ margin: 0, fontSize: '1.25rem' }}>{exerciseTitle}</h3><span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{date}</span></div>
                                            <div style={{ backgroundColor: pain.bg, color: pain.color, padding: '4px 12px', borderRadius: '9999px', fontWeight: 'bold', fontSize: '0.875rem', height: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}><span>{pain.icon}</span><span>{pain.label}</span></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                                            <div style={{ background: '#f9fafb', padding: '8px 16px', borderRadius: '8px' }}><span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>REPS</span><span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{log.clean_reps} / {log.total_reps}</span></div>
                                            <div style={{ background: '#f9fafb', padding: '8px 16px', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>STATUS</span>
                                                <span style={{ fontWeight: '600', fontSize: '1.1rem', color: isComplete ? '#22c55e' : '#ef4444' }}>{isComplete ? 'Completed' : 'Incomplete'}</span>
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
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key="overview-dashboard"
                    initial="hidden" 
                    animate="visible" 
                    exit={{ opacity: 0, y: -10 }}
                    variants={containerVariants}
                    style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '40px' }}
                >
                    <motion.div variants={itemVariants}>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Welcome, {doctorName}</h1>
                        <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '40px' }}>Here is what's happening with your patients today.</p>
                    </motion.div>

                    <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                        <div className="modern-card" style={{ padding: '24px' }}>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600' }}>TOTAL PATIENTS</div>
                            <div style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a' }}>{patients.length}</div>
                        </div>
                        <div className="modern-card" style={{ padding: '24px' }}>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600' }}>HIGH PAIN ALERTS</div>
                            <div style={{ fontSize: '3rem', fontWeight: '800', color: highPainAlerts.length > 0 ? '#ef4444' : '#22c55e' }}>{highPainAlerts.length}</div>
                        </div>
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <motion.div variants={itemVariants}>
                            <h3 style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px', display:'flex', alignItems:'center', gap:'8px' }}>
                                <span>✅</span> Recent Activity
                            </h3>
                            {recentActivity.length === 0 ? (
                                <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
                                    No recent activity logged.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {recentActivity.map((log, idx) => (
                                        <div key={idx} onClick={() => setSelectedPatientId(log.patient_id)} className="modern-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', cursor: 'pointer' }}>
                                            <div style={{width: 32, height: 32, background: '#dcfce7', color:'#166534', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem'}}>✓</div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{log.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Completed {log.exercise}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <h3 style={{ color: '#ef4444', borderBottom: '1px solid #fecaca', paddingBottom: '12px', marginBottom: '20px', display:'flex', alignItems:'center', gap:'8px' }}>
                                <span>⚠️</span> Attention Needed
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {highPainAlerts.length === 0 && inactivePatients.length === 0 ? (
                                    <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
                                        No alerts. Everyone is doing great!
                                    </div>
                                ) : (
                                    <>
                                        {highPainAlerts.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Reported Pain</div>
                                                {highPainAlerts.map((alert, idx) => {
                                                    const isSevere = alert.score >= 7;
                                                    const badgeColor = isSevere ? '#ef4444' : '#f59e0b';
                                                    
                                                    return (
                                                        <div key={idx} onClick={() => setSelectedPatientId(alert.patient_id)} className="modern-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{width: 32, height: 32, background: badgeColor, color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:'bold'}}>
                                                                    {alert.score}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{alert.name}</div>
                                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Reported pain in {alert.exercise}</div>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => handleDismissAlert(e, alert.log_id)}
                                                                style={{ background: 'white', border: '1px solid #e5e7eb', color: '#94a3b8', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}
                                                                title="Mark as Handled"
                                                                onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                                                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {inactivePatients.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginTop: '10px' }}>Inactive (4+ Days)</div>
                                                {inactivePatients.map((p, idx) => (
                                                    <div key={idx} onClick={() => setSelectedPatientId(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '12px', cursor: 'pointer' }}>
                                                        <div style={{width: 32, height: 32, background: '#cbd5e1', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem'}}>?</div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', color: '#475569' }}>{p.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Last active: {p.lastSeen}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: 'white', borderRadius: '16px', width: '800px', height: '600px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}
            >
                {/* MODAL CONTENT (UNCHANGED BUT ANIMATED) */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                    <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
                        {selectedExercise && !editingAssignmentId && (
                            <button onClick={() => setSelectedExercise(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
                        )}
                        <h3 style={{ margin: 0 }}>{editingAssignmentId ? 'Edit Exercise Program' : (selectedExercise ? `Configure ${selectedExercise.name}` : 'Select Exercise')}</h3>
                    </div>
                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
                </div>
                {/* ... (rest of modal logic remains the same) ... */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {!selectedExercise && !editingAssignmentId ? (
                        <>
                            <div style={{ marginBottom: '20px' }}>
                                <input placeholder="🔍 Search exercises..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {filteredExercises.map(ex => (
                                    <div key={ex.id} onClick={() => handleSelectExercise(ex)} className="modern-card" style={{ padding: '20px', cursor: 'pointer', textAlign: 'center' }}>
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
                                    <input type="number" min="1" value={rxReps} onChange={(e) => setRxReps(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }} />
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
            </motion.div>
        </div>
      )}
    </div>
  );
}