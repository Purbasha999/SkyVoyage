import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import FlightResults from './pages/FlightResults';
import SeatSelection from './pages/SeatSelection';
import RoundTripSeatSelection from './pages/RoundTripSeatSelection';
import BookingSummary from './pages/BookingSummary';
import RoundTripBookingSummary from './pages/RoundTripBookingSummary';
import PaymentPage from './pages/PaymentPage';
import BookingHistory from './pages/BookingHistory';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spin" style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%' }} /></div>;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flights" element={<FlightResults />} />
        <Route path="/flights/:id/seats" element={<ProtectedRoute><SeatSelection /></ProtectedRoute>} />
        <Route path="/round-trip/seats" element={<ProtectedRoute><RoundTripSeatSelection /></ProtectedRoute>} />
        <Route path="/booking-summary" element={<ProtectedRoute><BookingSummary /></ProtectedRoute>} />
        <Route path="/round-trip/summary" element={<ProtectedRoute><RoundTripBookingSummary /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <BookingProvider>
          <AppRoutes />
        </BookingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
