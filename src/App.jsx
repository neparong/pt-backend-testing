import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import Pages
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ExercisePage from './pages/ExercisePage';
import { ErrorBoundary } from './ErrorBoundary';
import { lazy, Suspense } from 'react';


// Import Styles
import './index.css';
import './App.css'; // Ensure camera styles are loaded
export default function App() {
  const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
  const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<PatientDashboard />} />
          <Route path="/doctor"element={<Suspense fallback={<div>Loading…</div>}><DoctorDashboard /></Suspense>}/>
          <Route path="/exercise/:type" element={<ExercisePage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
