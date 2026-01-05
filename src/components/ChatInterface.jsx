import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

// 🔒 LOAD KEY FROM .ENV
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function ChatInterface({ workoutLogId, exerciseName, onClose }) {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: `Great job completing your ${exerciseName || 'workout'}! How does your body feel right now?` }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // 1. INIT SESSION (MATCHING YOUR DB SCHEMA)
  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // FIX: Use 'patient_id' and 'workout_log_id' to match your table
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ 
            patient_id: user.id,        // <--- Was user_id
            workout_log_id: workoutLogId // <--- Now connecting the specific workout!
        }])
        .select()
        .single();

      if (error) {
          console.error("Error creating session:", error);
      } else if (data) {
        setSessionId(data.id);
        // Save initial greeting
        saveMessageToDB(data.id, 'ai', `Great job completing your ${exerciseName}! How does your body feel?`);
      }
    };
    initSession();
  }, []); // Run once on mount

  // 2. SAVE MESSAGES (MATCHING YOUR DB SCHEMA)
  const saveMessageToDB = async (sessId, sender, text) => {
    if (!sessId) return;
    
    // FIX: Use 'context' column for the message text
    await supabase.from('chat_messages').insert([
      { 
          session_id: sessId, 
          sender: sender, 
          context: text // <--- Mapping text to your 'context' column
      }
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText;
    const userMsg = { sender: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Save to DB immediately
    if (sessionId) saveMessageToDB(sessionId, 'user', userText);

    try {
      if (!GEMINI_API_KEY) throw new Error("Missing API Key");

      // 3. CALL GEMINI (Smart JSON Mode)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a warm, reassuring Physical Therapy Assistant for an elderly patient.
                The patient just finished ${exerciseName}.
                Patient said: "${userText}".

                Your task:
                1. Infer a pain score from 0–10 based on the patient’s words.
                   - 0 = no pain
                   - 1–3 = mild discomfort or soreness
                   - 4–6 = moderate pain that limits movement
                   - 7–8 = severe pain, hard to continue
                   - 9–10 = extreme or unbearable pain
                2. If the patient is vague, estimate conservatively using their language.
                3. Always note that you are recording this for their therapist or doctor.
                4. Be polite, clear, and encouraging. Avoid slang.
                5. If pain is 4 or higher, gently suggest rest.
                6. Keep the spoken response to a maximum of 2 sentences.

                Output format (JSON only):
                {
                  "pain_score": number,
                  "message": string
                }`
              }]
            }]
          }),
        }
      );

      const data = await response.json();
      
      let aiText = "I've noted that for your doctor.";
      let extractedScore = 0;

      if (data.candidates && data.candidates[0].content) {
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json|```/g, '').trim();
        
        try {
            const parsedData = JSON.parse(cleanJson);
            aiText = parsedData.message;       
            extractedScore = parsedData.pain_score;
        } catch (e) {
            console.error("Failed to parse AI JSON:", e);
            aiText = rawText; 
        }
      }

      // 4. UPDATE WORKOUT LOG IF PAIN DETECTED
      if (extractedScore > 0 && workoutLogId) {
        await supabase
          .from('workout_logs')
          .update({ pain_rating: extractedScore })
          .eq('id', workoutLogId);
        console.log(`AI Calculated Pain Score: ${extractedScore}/10`);
      }

      // 5. SAVE AI RESPONSE TO DB
      setMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
      if (sessionId) saveMessageToDB(sessionId, 'ai', aiText);

    } catch (error) {
      console.error("Chat Error:", error);
      const errText = "I've logged your status for the therapist.";
      setMessages(prev => [...prev, { sender: 'ai', text: errText }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', width: '350px', height: '500px',
      backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e5e7eb', zIndex: 9999
    }}>
      <div style={{ padding: '16px', background: '#11181C', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '600' }}>Gemini PT Assistant</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', padding: '12px 16px', borderRadius: '12px',
            backgroundColor: m.sender === 'user' ? '#11181C' : 'white',
            color: m.sender === 'user' ? 'white' : '#1f2937',
            border: m.sender === 'ai' ? '1px solid #e5e7eb' : 'none'
          }}>
            {m.text}
          </div>
        ))}
        {isTyping && <div style={{ fontSize: '12px', color: 'gray', marginLeft: '10px' }}>AI is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', background: 'white', display: 'flex', gap: '8px' }}>
        <input 
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}
          placeholder="How did it feel?"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
        />
        <button onClick={handleSend} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  );
}