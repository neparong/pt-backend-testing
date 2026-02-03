import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// 🔒 LOAD KEYS
const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = import.meta.env.VITE_AZURE_OPENAI_KEY;
const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION;

const AZURE_DEPLOYMENT_NAME = "gpt-4o"; 

export default function ChatInterface({ workoutLogId, exerciseName, onClose }) {
  const initialGreeting = `Great job completing your ${exerciseName || 'workout'}! How does your body feel right now?`;
  
  const [messages, setMessages] = useState([]); 
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // 🎙️ MIC STATES
  const [isListening, setIsListening] = useState(false); 
  const [isInitializing, setIsInitializing] = useState(false); 
  
  const messagesEndRef = useRef(null);
  const synthesizerRef = useRef(null); 
  const recognizerRef = useRef(null); 
  
  const accumulatedSpeechRef = useRef(""); 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // --- AUDIO OUTPUT ---
  const stopAudio = () => {
      if (synthesizerRef.current) {
          try { synthesizerRef.current.close(); } catch (e) { console.error(e); }
          synthesizerRef.current = null;
          setIsSpeaking(false);
      }
  };

  const speakText = (text) => {
      if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) return;
      stopAudio();
      setIsSpeaking(true);

      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
      speechConfig.speechSynthesisVoiceName = "en-US-AvaMultilingualNeural"; 
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
      
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
      synthesizerRef.current = synthesizer;

      synthesizer.speakTextAsync(text, 
          (result) => {
              setIsSpeaking(false);
              synthesizer.close();
              synthesizerRef.current = null;
          },
          (err) => {
              console.error(err);
              setIsSpeaking(false);
              synthesizer.close();
          }
      );
  };

  // --- AUDIO INPUT ---
  const stopListening = () => {
      if (recognizerRef.current) {
          try {
            recognizerRef.current.stopContinuousRecognitionAsync(() => {
                recognizerRef.current.close();
                recognizerRef.current = null;
                setIsListening(false);
                setIsInitializing(false);
                
                if (accumulatedSpeechRef.current.trim()) {
                    setInputText(prev => {
                        const spacer = prev.length > 0 ? " " : "";
                        return prev + spacer + accumulatedSpeechRef.current.trim();
                    });
                }
            });
          } catch(e) {
              console.error(e);
              setIsListening(false);
              setIsInitializing(false);
          }
      } else {
          setIsListening(false);
          setIsInitializing(false);
      }
  };

  const startListening = () => {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
        console.warn("Azure Speech keys missing.");
        return;
    }

    stopAudio(); 
    setIsInitializing(true); 
    accumulatedSpeechRef.current = ""; 

    try {
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        speechConfig.speechRecognitionLanguage = "en-US";
        
        speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "15000");
        speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "3000");

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        recognizerRef.current = recognizer;

        recognizer.recognized = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                 accumulatedSpeechRef.current += " " + e.result.text;
            }
        };

        recognizer.sessionStopped = (s, e) => {
            console.log("Session stopped.");
            stopListening();
        };

        recognizer.canceled = (s, e) => {
            console.log("Session canceled.");
            stopListening();
        };

        recognizer.startContinuousRecognitionAsync(
            () => {
                // 🛠️ FIX: Wait 800ms BEFORE letting the user speak.
                // This ensures the browser audio stream is actually open.
                setTimeout(() => {
                    setIsInitializing(false);
                    setIsListening(true); 
                }, 800);
            },
            (err) => {
                console.error("Start Error:", err);
                setIsInitializing(false);
                setIsListening(false);
            }
        );
        
    } catch (e) {
        console.error(e);
        setIsInitializing(false);
        setIsListening(false);
    }
  };

  const handleMicrophoneClick = () => {
      if (isListening || isInitializing) stopListening();
      else startListening();
  };

  // --- INIT SESSION ---
  useEffect(() => {
    let active = true;

    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('workout_log_id', workoutLogId)
        .maybeSingle();

      if (existingSession) {
          setSessionId(existingSession.id);
          const { data: history } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', existingSession.id)
            .order('created_at', { ascending: true });

          if (active && history && history.length > 0) {
              setMessages(history.map(msg => ({ 
                  sender: msg.sender === 'ai' ? 'ai' : 'user', 
                  text: msg.context 
              })));
          } else if (active) {
              setMessages([{ sender: 'ai', text: initialGreeting }]);
              speakText(initialGreeting);
          }
      } else {
          const { data: newSession } = await supabase
            .from('chat_sessions')
            .insert([{ patient_id: user.id, workout_log_id: workoutLogId }])
            .select()
            .single();

          if (active && newSession) {
              setSessionId(newSession.id);
              setMessages([{ sender: 'ai', text: initialGreeting }]);
              await supabase.from('chat_messages').insert([
                  { session_id: newSession.id, sender: 'ai', context: initialGreeting }
              ]);
              speakText(initialGreeting);
          }
      }
    };

    initData();
    return () => { 
        active = false; 
        stopAudio(); 
        if (recognizerRef.current) {
            try { recognizerRef.current.stopContinuousRecognitionAsync(); } catch(e){}
            try { recognizerRef.current.close(); } catch(e){}
        }
    };
  }, []); 

  const saveMessageToDB = async (sessId, sender, text) => {
    if (!sessId) return;
    await supabase.from('chat_messages').insert([{ session_id: sessId, sender: sender, context: text }]);
  };

  const handleSend = async () => {
    if (isListening) stopListening();
    
    setTimeout(async () => {
        if (!inputText.trim()) return;

        const userText = inputText;
        setMessages(prev => [...prev, { sender: 'user', text: userText }]);
        setInputText("");
        setIsTyping(true);

        if (sessionId) saveMessageToDB(sessionId, 'user', userText);

        try {
          if (!AZURE_OPENAI_KEY) throw new Error("Missing Azure Keys");

          const response = await fetch(
            `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "api-key": AZURE_OPENAI_KEY },
              body: JSON.stringify({
                messages: [
                  { role: "system", content: `You are a warm, reassuring Physical Therapy Assistant. The patient just finished ${exerciseName}.
                    YOUR GOAL: Analyze the patient's feedback to extract a Pain Score (0-10).
                    RULES:
                    1. IF the patient feels "good", "fine", "great", "no pain": 
                       -> "pain_score": 0
                       -> "message": Brief encouragement.
                    2. IF the patient mentions soreness/pain but NO number: 
                       -> "pain_score": -1 
                       -> "message": Ask them to rate the pain from 1-10.
                    3. IF the patient gives a number (e.g., "It's a 4"): 
                       -> "pain_score": 4
                       -> "message": Note it for the doctor. If > 3, suggest rest/ice.
                    CRITICAL: Output ONLY valid JSON in this format: 
                    { "pain_score": number, "message": "string" }` 
                  },
                  { role: "user", content: userText }
                ],
                response_format: { type: "json_object" } 
              }),
            }
          );

          const data = await response.json();
          if (data.error) throw new Error(data.error.message);

          const content = JSON.parse(data.choices[0].message.content);
          const aiText = content.message;
          const extractedScore = content.pain_score;

          setMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
          if (sessionId) saveMessageToDB(sessionId, 'ai', aiText);

          speakText(aiText);

          if (extractedScore >= 0 && workoutLogId) {
            await supabase.from('workout_logs').update({ pain_rating: extractedScore, seen_by_doctor: false }).eq('id', workoutLogId);
          }

        } catch (error) {
          console.error("Azure Error:", error);
          const fallback = "I've noted that for your doctor. Keep up the good work!";
          setMessages(prev => [...prev, { sender: 'ai', text: fallback }]);
          speakText(fallback); 
        } finally {
          setIsTyping(false);
        }
    }, 200); 
  };

  const getPlaceholder = () => {
      if (isInitializing) return "Connecting...";
      if (isListening) return "Listening... (Click Stop to Finish)";
      return "Type here...";
  };

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', 
      width: '420px', 
      height: '500px',
      backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e5e7eb', zIndex: 9999
    }}>
      <div style={{ padding: '16px', background: '#0078D4', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <span>{isSpeaking ? "🔊" : "💬"}</span>
            <span style={{ fontWeight: '600' }}>{isSpeaking ? "Speaking..." : "PT Assistant"}</span>
        </div>
        <button onClick={() => { stopAudio(); onClose(); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', padding: '12px 16px', borderRadius: '12px',
            backgroundColor: m.sender === 'user' ? '#0078D4' : 'white',
            color: m.sender === 'user' ? 'white' : '#1f2937',
            border: m.sender === 'ai' ? '1px solid #e5e7eb' : 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            {m.text}
          </div>
        ))}
        {isTyping && <div style={{ fontSize: '12px', color: 'gray', marginLeft: '10px', fontStyle:'italic' }}>AI is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', background: 'white', display: 'flex', gap: '8px' }}>
        <input 
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none', fontSize:'16px' }}
          placeholder={getPlaceholder()}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
          disabled={isListening || isInitializing}
        />
        
        <button 
            onClick={handleMicrophoneClick} 
            style={{ 
                background: isListening ? '#fee2e2' : (isInitializing ? '#fef3c7' : 'white'), 
                border: isListening ? '1px solid #ef4444' : (isInitializing ? '1px solid #f59e0b' : '1px solid #e5e7eb'), 
                color: isListening ? '#ef4444' : (isInitializing ? '#d97706' : '#6b7280'),
                borderRadius: '8px', 
                width: '44px', 
                cursor: isInitializing ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={isListening ? "Stop" : "Record"}
            disabled={isInitializing}
        >
            <span style={{ fontSize: '1.2rem' }}>
                {isInitializing ? '⏳' : (isListening ? '🛑' : '🎤')}
            </span>
        </button>

        <button onClick={handleSend} style={{ background: '#0078D4', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', fontWeight:'600' }}>Send</button>
      </div>
    </div>
  );
}