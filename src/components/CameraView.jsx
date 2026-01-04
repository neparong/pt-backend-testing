import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { createPoseLandmarker } from '../services/poseService';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import { getSquatFeedback, getLateralLegLiftFeedback, getBandStretchFeedback } from '../services/exerciseLogic';
import '../App.css'; 

export default function CameraView({ exerciseType, goal, isRunning, hasCompleted, onComplete }) {
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

  // Logic Refs
  const isActiveRef = useRef(false);
  const stage = useRef("up");
  const internalCount = useRef(0);
  const requestRef = useRef(null);

  // 1. GAME CONTROL
  useEffect(() => {
    if (isRunning) {
        setCountdown(5);
        setRepCount(0);
        internalCount.current = 0;
        stage.current = "up";
        setIsFinished(false);
        setFeedback("Get Ready...");
        setUiColor("white");
        isActiveRef.current = false; 

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev === 1) {
                    clearInterval(timer);
                    isActiveRef.current = true;
                    setFeedback("GO!");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
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
  }, [isRunning, exerciseType, hasCompleted]);

  // 2. SETUP AI
  useEffect(() => {
    const setup = async () => {
      landmarkerRef.current = await createPoseLandmarker();
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

      // Match Dimensions
      if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // --- MANUAL JS FLIP ---
      // This is necessary because we removed the CSS flip from the canvas to avoid confusion.
      ctx.save();
      ctx.translate(canvas.width, 0); 
      ctx.scale(-1, 1); 

      if (results.landmarks && results.landmarks.length > 0) {
        const landmark = results.landmarks[0];
        let currentLineColor = "#00FF00"; 

        // --- ANALYSIS LOGIC ---
        if (isActiveRef.current && !isFinished) {
            let analysis;
            
            if (exerciseType === 'squat') analysis = getSquatFeedback(landmark);
            else if (exerciseType === 'lateral_leg_lift') analysis = getLateralLegLiftFeedback(landmark, false);
            else if (exerciseType === 'band_stretch') analysis = getBandStretchFeedback(landmark);
            else analysis = { color: "#00FF00", message: "Neutral", isDeepEnough: false };

            setFeedback(analysis.message);
            setUiColor(analysis.color);
            currentLineColor = analysis.color;

            if (analysis.isDeepEnough) stage.current = "down";

            let repJustFinished = false;
            if (exerciseType === 'squat' && analysis.kneeAngle > 160 && stage.current === "down") repJustFinished = true;
            else if (exerciseType === 'lateral_leg_lift' && !analysis.isDeepEnough && stage.current === "down") repJustFinished = true;
            else if (exerciseType === 'band_stretch' && analysis.currentRatio < 1.8 && stage.current === "down") repJustFinished = true;

            if (repJustFinished) {
                stage.current = "up";
                internalCount.current += 1;
                setRepCount(internalCount.current);
                new Audio('/success.mp3').play().catch(() => {});
                setShowCheck(true);
                setTimeout(() => setShowCheck(false), 800);
                
                if (internalCount.current >= goal.total) {
                    setIsFinished(true);
                    isActiveRef.current = false;
                    onComplete(); 
                }
            }
        }

        // --- DRAWING ---
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
      
      {/* 1. PILL (Solid BG, Black Text) */}
      <div className="feedback-pill" style={{ 
          backgroundColor: uiColor === 'white' ? 'white' : uiColor,
          // Border is only needed if white, to separate from background
          border: uiColor === 'white' ? '3px solid #e5e7eb' : `3px solid ${uiColor}`
      }}>
          {feedback}
      </div>

      {/* 2. CAMERA BOX */}
      <div className="camera-container">
        
        {countdown > 0 && (
            <div className="countdown-overlay">
                <div className="countdown-number">{countdown}</div>
                <p style={{color: 'white', fontSize: '2rem', fontWeight: 'bold', margin: 0}}>Get Ready!</p>
            </div>
        )}

        {isFinished && (
            <div className="success-overlay">
                <h1 style={{ fontSize: '4rem', margin: 0 }}>NICE WORK! 🎉</h1>
                <p style={{ fontSize: '2rem', marginBottom: '30px' }}>You hit {goal.total} reps.</p>
            </div>
        )}

        {(isActiveRef.current || countdown > 0) && !isFinished && (
             <div className="rep-counter">
                {repCount} <span style={{fontSize: '1rem', color: '#666', fontWeight: '600'}}>/ {goal.total}</span>
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