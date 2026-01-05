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

  // 1. INIT SESSION
  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('chat_sessions')
        .insert([{ 
            patient_id: user.id,
            workout_log_id: workoutLogId
        }])
        .select()
        .single();

      if (data) {
        setSessionId(data.id);
        //probably dont need to save the intial message?
        //saveMessageToDB(data.id, 'ai', `Great job completing your ${exerciseName}! How does your body feel?`);
      }
    };
    initSession();
  }, []);

  const saveMessageToDB = async (sessId, sender, text) => {
    if (!sessId) return;
    await supabase.from('chat_messages').insert([
      { session_id: sessId, sender: sender, context: text }
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText;
    const userMsg = { sender: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    if (sessionId) saveMessageToDB(sessionId, 'user', userText);

    try {
      if (!GEMINI_API_KEY) throw new Error("Missing API Key");

      // 2. CALL GEMINI 2.5 FLASH (As requested)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // SAFETY: Ensure medical/pain context isn't blocked
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            contents: [{
              parts: [{
                text: `You are a warm, reassuring Physical Therapy Assistant.
                The patient just finished ${exerciseName}.
                Patient said: "${userText}".

                YOUR LOGIC TASK:
                1. IF the patient says they feel "good", "fine", "great", or "no pain":
                   - Assign "pain_score": 0
                   - Message: Be encouraging and keep it brief (max 1 sentence).
                
                2. IF the patient mentions pain/soreness BUT does NOT give a number (0-10):
                   - Assign "pain_score": -1 (This means "Waiting for confirmation")
                   - Message: Empathetically ask them to rate the pain on a scale of 1-10.
                
                3. IF the patient gives a number (1-10) or answers your previous follow-up:
                   - Assign "pain_score": The number they gave.
                   - Message: Confirm you've noted it for the doctor. Suggest rest if > 3.

                Output JSON ONLY:
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
      
      // If 2.5 fails (403/404), throw to trigger the Safety Net below
      if (data.error) throw new Error(data.error.message);

      let aiText = "I've noted that for your doctor.";
      let extractedScore = -1; 

      if (data.candidates && data.candidates[0].content) {
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json|```/g, '').trim();
        try {
            const parsedData = JSON.parse(cleanJson);
            aiText = parsedData.message;       
            extractedScore = parsedData.pain_score;
        } catch (e) {
            aiText = rawText; 
        }
      }

      // 4. UPDATE DB (Only if score is confirmed 0-10)
      if (extractedScore >= 0 && workoutLogId) {
        await supabase
          .from('workout_logs')
          .update({ 
              pain_rating: extractedScore,
              seen_by_doctor: false 
          }) 
          .eq('id', workoutLogId);
      }

      setMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
      if (sessionId) saveMessageToDB(sessionId, 'ai', aiText);

    } catch (error) {
      console.error("Using Offline Backup:", error);
      
      // --- SAFETY NET (Runs if 2.5 fails so video works) ---
      let fallbackScore = -1;
      let fallbackResponse = "Could you rate that pain on a scale of 1-10?";
      const lower = userText.toLowerCase();

      // Check for numbers first
      const numberMatch = userText.match(/\b([0-9]|10)\b/);
      if (numberMatch) {
          fallbackScore = parseInt(numberMatch[0]);
          fallbackResponse = `I've noted your pain level of ${fallbackScore} for the doctor.`;
      } 
      else if (lower.includes('good') || lower.includes('great') || lower.includes('fine')) {
          fallbackScore = 0;
          fallbackResponse = "That's great! Keep up the good work.";
      }
      else if (lower.includes('pain') || lower.includes('hurt')) {
          fallbackScore = -1; // Ask for number
          fallbackResponse = "I'm sorry to hear that. On a scale of 1-10, how bad is it?";
      }

      if (fallbackScore >= 0 && workoutLogId) {
          await supabase.from('workout_logs')
            .update({ pain_rating: fallbackScore, seen_by_doctor: false })
            .eq('id', workoutLogId);
      }

      setMessages(prev => [...prev, { sender: 'ai', text: fallbackResponse }]);
      if (sessionId) saveMessageToDB(sessionId, 'ai', fallbackResponse);
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