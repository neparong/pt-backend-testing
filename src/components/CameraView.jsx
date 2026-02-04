import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { createPoseLandmarker } from '../services/poseService';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import { getSquatFeedback, getLateralLegLiftFeedback, getBandStretchFeedback } from '../services/exerciseLogic';
import '../App.css'; 

export default function CameraView({ exerciseType, goal, isRunning, hasCompleted, onComplete, onCleanRep }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  
  // UI State
  const [feedback, setFeedback] = useState("Press Start");
  const [uiColor, setUiColor] = useState("white"); 
  const [repCount, setRepCount] = useState(0);     
  const [showCheck, setShowCheck] = useState(false); 
  const [countdown, setCountdown] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Switch Side UI
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLeftDisplay, setIsLeftDisplay] = useState(false); // For UI Label only

  // LOGIC REFS (These fix the "Stale State" bug)
  const isLeftRef = useRef(false); // <--- TRUE SOURCE OF TRUTH FOR SIDE
  const isActiveRef = useRef(false);
  const stage = useRef("up");
  const internalCount = useRef(0);
  const requestRef = useRef(null);
  
  // Stats Refs
  const cleanRepsCount = useRef(0);
  const repTotalFrames = useRef(0);
  const repBadFrames = useRef(0);

  // 1. GAME CONTROL
  useEffect(() => {
    if (isRunning) {
        setCountdown(5);
        setRepCount(0);
        internalCount.current = 0;
        cleanRepsCount.current = 0; 
        
        // Reset Side
        isLeftRef.current = false;
        setIsLeftDisplay(false);
        setIsSwitching(false);
        
        repTotalFrames.current = 0;
        repBadFrames.current = 0;

        stage.current = "up";
        setIsFinished(false);
        setFeedback("Get Ready...");
        setUiColor("white");
        isActiveRef.current = false; 

        startCountdown();
    } else {
        setCountdown(0);
        isActiveRef.current = false;
        if (hasCompleted) {
            setFeedback("Complete!");
            setUiColor("#e0e7ff"); 
        } else {
            setFeedback("Press Start");
            setUiColor("white");
        }
    }
  }, [isRunning, exerciseType]);

  const startCountdown = () => {
      let count = 5;
      setCountdown(count);
      const timer = setInterval(() => {
          count -= 1;
          setCountdown(count);
          if (count === 0) {
              clearInterval(timer);
              isActiveRef.current = true;
              setFeedback("GO!");
          }
      }, 1000);
  };

  const handleResumeAfterSwitch = () => {
      setIsSwitching(false);
      startCountdown(); 
  };

  // 2. SETUP AI
  useEffect(() => {
    const setup = async () => {
      landmarkerRef.current = await createPoseLandmarker();
      // Start the loop ONCE. It will read the Ref, so we don't need to restart it.
      requestRef.current = requestAnimationFrame(predict);
    };
    setup();
    return () => cancelAnimationFrame(requestRef.current);
  }, []); 

  // 3. PREDICTION LOOP
  const predict = () => {
    if (webcamRef.current?.video?.readyState === 4 && landmarkerRef.current && canvasRef.current) {
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const drawingUtils = new DrawingUtils(ctx);
      const results = landmarkerRef.current.detectForVideo(video, performance.now());

      if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(canvas.width, 0); 
      ctx.scale(-1, 1); 

      if (results.landmarks && results.landmarks.length > 0) {
        const landmark = results.landmarks[0];
        let currentLineColor = "#00FF00"; 

        if (isActiveRef.current && !isFinished && !isSwitching) {
            let analysis;
            
            // USE THE REF, NOT THE STATE
            const checkingLeft = isLeftRef.current; 

            if (exerciseType === 'squat') analysis = getSquatFeedback(landmark);
            else if (exerciseType === 'lateral_leg_lift') analysis = getLateralLegLiftFeedback(landmark, checkingLeft);
            else if (exerciseType === 'band_stretch') analysis = getBandStretchFeedback(landmark);
            else analysis = { color: "#00FF00", message: "Neutral", isDeepEnough: false };

            setFeedback(analysis.message);
            setUiColor(analysis.color);
            currentLineColor = analysis.color;

            // Majority Rule
            if (stage.current === "down") {
                repTotalFrames.current += 1;
                if (analysis.color === "#FF0000") {
                    repBadFrames.current += 1;
                }
            }

            if (analysis.isDeepEnough) stage.current = "down";

            let repJustFinished = false;
            if (exerciseType === 'squat' && analysis.kneeAngle > 160 && stage.current === "down") repJustFinished = true;
            else if (exerciseType === 'lateral_leg_lift' && !analysis.isDeepEnough && stage.current === "down") repJustFinished = true;
            else if (exerciseType === 'band_stretch' && analysis.currentRatio < 1.8 && stage.current === "down") repJustFinished = true;

            if (repJustFinished) {
                stage.current = "up";
                internalCount.current += 1;
                setRepCount(internalCount.current);
                
                const badPercentage = repTotalFrames.current > 0 ? (repBadFrames.current / repTotalFrames.current) : 0;
                if (badPercentage < 0.30) cleanRepsCount.current += 1;

                repTotalFrames.current = 0;
                repBadFrames.current = 0;

                onCleanRep?.();          // 🔊 play sound (parent-controlled)
                setShowCheck(true);      // ✅ visual feedback
                setTimeout(() => setShowCheck(false), 800);

                
                // --- SWITCH SIDE LOGIC ---
                // Use the REF to check if we need to switch
                if (goal.perSide && internalCount.current === goal.switchAt && !isLeftRef.current) {
                    isActiveRef.current = false; 
                    setIsSwitching(true);        
                    
                    // UPDATE REF AND STATE
                    isLeftRef.current = true;    
                    setIsLeftDisplay(true);      
                }
                else if (internalCount.current >= goal.total) {
                    setIsFinished(true);
                    isActiveRef.current = false;
                    onComplete({ 
                        totalReps: internalCount.current, 
                        cleanReps: cleanRepsCount.current 
                    }); 
                }
            }
        }

        const bodyConnections = PoseLandmarker.POSE_CONNECTIONS.filter(c => c.start >= 11 && c.end >= 11);
        drawingUtils.drawConnectors(landmark, bodyConnections, { color: currentLineColor, lineWidth: 4 });
        drawingUtils.drawLandmarks(landmark, { color: "red", lineWidth: 2, radius: (data) => (data.index < 11 ? 0 : 4) });
      }
      ctx.restore();
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="camera-section">
      <div className="feedback-pill" style={{ 
          backgroundColor: uiColor === 'white' ? 'white' : uiColor,
          color: '#11181C', 
          border: uiColor === 'white' ? '3px solid #e5e7eb' : `3px solid ${uiColor}`
      }}>
          {feedback}
      </div>

      <div className="camera-container">
        
        {countdown > 0 && (
            <div className="countdown-overlay">
                <div className="countdown-number">{countdown}</div>
                <p style={{color: 'white', fontSize: '2rem', fontWeight: 'bold', margin: 0}}>
                    {isLeftDisplay ? "Left Side Next!" : "Get Ready!"}
                </p>
            </div>
        )}

        {isSwitching && (
            <div className="success-overlay" style={{background: 'rgba(37, 99, 235, 0.9)'}}>
                <h1 style={{ fontSize: '3rem', margin: 0 }}>HALFTIME! ⏱️</h1>
                <p style={{ fontSize: '1.5rem', marginBottom: '30px' }}>Great job. Now switch to your <strong>LEFT LEG</strong>.</p>
                <button 
                    onClick={handleResumeAfterSwitch}
                    style={{ padding: '15px 30px', fontSize: '1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'white', color: '#2563eb', fontWeight: 'bold' }}
                >
                    Ready for Left Side
                </button>
            </div>
        )}

        {isFinished && (
            <div className="success-overlay">
                <h1 style={{ fontSize: '4rem', margin: 0 }}>NICE WORK! 🎉</h1>
                <p style={{ fontSize: '2rem', marginBottom: '30px' }}>You hit {goal.total} reps.</p>
            </div>
        )}

        {(isActiveRef.current || countdown > 0) && !isFinished && !isSwitching && (
             <div className="rep-counter">
                {repCount} <span style={{fontSize: '1rem', color: '#666', fontWeight: '600'}}>/ {goal.total}</span>
                {goal.perSide && <div style={{fontSize: '0.8rem', color: '#2563eb', marginTop: 2}}>{isLeftDisplay ? 'Left Side' : 'Right Side'}</div>}
             </div>
        )}

        {showCheck && <div className="check-mark">✅</div>}

        <Webcam 
            ref={webcamRef} 
            className="webcam-feed" 
            mirrored={true} 
            videoConstraints={{ aspectRatio: 1.3333 }}
        />
        <canvas ref={canvasRef} className="drawing-canvas" />
      </div>
    </div>
  );
}