import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// This function "wakes up" the AI
export const createPoseLandmarker = async () => {
  // 1. Locate the AI engine files on the internet
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  // 2. Set up the AI's "Eyes"
  const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU" // Uses your computer's graphics card for speed
    },
    runningMode: "VIDEO",
    numPoses: 1 // We only need to track one patient at a time
  });

  return poseLandmarker;
};