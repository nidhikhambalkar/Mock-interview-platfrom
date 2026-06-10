import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SetupInterview } from './pages/SetupInterview';
import { InterviewRoom } from './pages/InterviewRoom';
import { SessionSummary } from './pages/SessionSummary';
import { Profile } from './pages/Profile';
import { CursorTrail } from './components/CursorTrail';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <>
      <CursorTrail />
      <Router>
      <Routes>
        {/* Authentication View (Unprotected, standalone layout) */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard/App Views wrapping Layout */}
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/setup" element={<SetupInterview />} />
          <Route path="/interview" element={<InterviewRoom />} />
          <Route path="/summary/:id" element={<SessionSummary />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch-all Redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </>
  );
};
export default App;
