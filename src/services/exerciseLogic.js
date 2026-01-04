// src/services/exerciseLogic.js

// Helper: Calculates the angle between three points (p1 -> p2 -> p3)
export const calculateAngle = (p1, p2, p3) => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

// --- SQUAT LOGIC ---
export const getSquatFeedback = (landmarks) => {
    const shoulder = landmarks[12]; // Right Shoulder
    const hip = landmarks[24];      // Right Hip
    const knee = landmarks[26];     // Right Knee
    const ankle = landmarks[28];    // Right Ankle

    const kneeAngle = calculateAngle(hip, knee, ankle);
    const hipAngle = calculateAngle(shoulder, hip, knee);

    let color = "#00FF00"; // Green
    let message = "Perfect Form!";
    let isDeepEnough = false;

    // Rule 1: Neutral Spine (Don't lean forward)
    if (hipAngle < 60) {
        color = "#FF0000"; // Red
        message = "KEEP CHEST UP";
    } 
    // Rule 2: Depth (Thighs parallel)
    else if (kneeAngle > 110) {
        color = "#FFFF00"; // Yellow
        message = "GO LOWER";
    } else {
        isDeepEnough = true;
    }

    // We return kneeAngle to help the camera detect when you stand back up
    return { color, message, isDeepEnough, kneeAngle };
};

// --- LATERAL LEG LIFT LOGIC ---
export const getLateralLegLiftFeedback = (landmarks, isLeft = false) => {
    let shoulder, hip, ankle;

    if (isLeft) {
        // USE LEFT SIDE COORDINATES
        shoulder = landmarks[11]; 
        hip = landmarks[23];      
        ankle = landmarks[27];    
    } else {
        // USE RIGHT SIDE COORDINATES
        shoulder = landmarks[12]; 
        hip = landmarks[24];      
        ankle = landmarks[28];    
    }

    const liftAngle = calculateAngle(shoulder, hip, ankle);

    let color = "#00FF00";
    let message = "Good Control";
    let isDeepEnough = false;

    // Note: liftAngle is usually ~180 standing straight. 
    // Lifting leg makes the angle smaller (e.g., 140).
    if (liftAngle > 165) {
        color = "#FFFF00";
        message = isLeft ? "LIFT LEFT LEG" : "LIFT RIGHT LEG";
    } else if (liftAngle < 155) {
        isDeepEnough = true;
        message = "GREAT HEIGHT!";
    }

    return { color, message, isDeepEnough, liftAngle };
};

// --- NEW: BAND STRETCH LOGIC ---
// src/services/exerciseLogic.js
// ... keep calculateAngle, getSquatFeedback, getLateralLegLiftFeedback as they were ...

export const getBandStretchFeedback = (landmarks) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    // 1. CALCULATE EXPANSION
    const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
    const wristDist = Math.hypot(leftWrist.x - rightWrist.x, leftWrist.y - rightWrist.y);
    const expansionRatio = wristDist / shoulderWidth;

    // 2. CHECK FOR SYMMETRY
    const wristYDiff = Math.abs(leftWrist.y - rightWrist.y);
    const isImbalanced = wristYDiff > (shoulderWidth * 0.8); 

    // --- LOGIC FLOW ---

    // A. NOT WIDE ENOUGH YET (Yellow)
    // CHANGED: Increased from 2.5 to 2.8.
    // You must pull wider than this before the app checks your form.
    if (expansionRatio <= 2.8) {
        return { 
            color: "#FFFF00", // Yellow
            message: "KEEP STRETCHING",
            isDeepEnough: false,
            currentRatio: expansionRatio
        };
    }

    // B. WIDE ENOUGH (Now we check for Red/Green)
    
    if (isImbalanced) {
        return {
            color: "#FF0000", // Red
            message: "ARMS UNEVEN", 
            isDeepEnough: false, 
            currentRatio: expansionRatio
        };
    }

    // C. SUCCESS
    return { 
        color: "#00FF00", // Green
        message: "PERFECT STRETCH!",
        isDeepEnough: true, 
        currentRatio: expansionRatio 
    };
};