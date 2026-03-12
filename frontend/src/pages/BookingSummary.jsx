import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bookSeats } from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = (date) => new Date(date).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true
});

const BookingSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { flight, seats, priceBreakdowns } = location.state || {};

  const breakdownBySeat = Object.fromEntries(
    (priceBreakdowns || []).map(p => [p.seatNumber, p])
  );
  const totalPrice = (priceBreakdowns || []).reduce((s, p) => s + (p.finalPrice || 0), 0);

  const [passengers, setPassengers] = useState(
    seats?.map((_, i) => ({
      passengerName: i === 0 ? (user?.name || '') : '',
      passengerPhone: ''
    })) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!flight || !seats?.length || !priceBreakdowns?.length) {
    return (
      <div className="container" style={{ padding: 60, textAlign: 'center' }}>
        <h2>Session Expired</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Please start your search again.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">Search Flights</button>
      </div>
    );
  }

const updatePassenger = (idx, field, value) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleConfirm = async () => {
    const missing = passengers.findIndex(p => !p.passengerName.trim());
    if (missing !== -1) {
      setError(`Passenger name is required for seat ${seats[missing].seatNumber}.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const seatBookings = seats.map((seat, i) => ({
        seatNumber: seat.seatNumber,
        passengerName: passengers[i].passengerName.trim(),
        passengerPhone: passengers[i].passengerPhone.trim()
      }));

      const res = await bookSeats({ flightId: flight._id, seats: seatBookings });
      navigate('/bookings', { state: { newBookings: res.data.bookings } });
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Booking Summary</h1>
      <p style={{ color: '#64748b', marginBottom: 28 }}>Review your details and confirm your booking.</p>

      {/* Flight Details */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <SectionLabel>Flight Details</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Airline" value={flight.airline} />
          <Field label="Flight No." value={flight.flightNumber} />
          <Field label="From" value={flight.source} />
          <Field label="To" value={flight.destination} />
          <Field label="Departure" value={fmt(flight.departureTime)} />
          <Field label="Arrival" value={fmt(flight.arrivalTime)} />
        </div>
      </div>

      {/* Seats Summary */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <SectionLabel>Selected Seats ({seats.length})</SectionLabel>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {seats.map(seat => (
            <div key={seat.seatNumber} style={{
              padding: '10px 18px', background: '#dbeafe', borderRadius: 12,
              textAlign: 'center', minWidth: 72
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#1d4ed8' }}>{seat.seatNumber}</div>
              <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>{seat.seatType}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <SectionLabel>Price Breakdown</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {seats.map((seat, idx) => {
            const bd = breakdownBySeat[seat.seatNumber];
            if (!bd) return null;
            const isLast = idx === seats.length - 1;
            return (
              <div key={seat.seatNumber} style={{ paddingBottom: isLast ? 0 : 12, marginBottom: isLast ? 0 : 4, borderBottom: isLast ? 'none' : '1px dashed #e2e8f0' }}>
                {seats.length > 1 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                    Seat {seat.seatNumber} — {seat.seatType}{seat.seatClass === 'BUSINESS' ? ' · Business' : ''}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <PriceRow label="Base Price" value={`₹${bd.basePrice.toLocaleString('en-IN')}`} />
                  {bd.demandCharge > 0 && <PriceRow label="Demand Charge" value={`+₹${bd.demandCharge.toLocaleString('en-IN')}`} accent="#f59e0b" />}
                  {bd.lateBookingCharge > 0 && <PriceRow label="Late Booking" value={`+₹${bd.lateBookingCharge.toLocaleString('en-IN')}`} accent="#ef4444" />}
                  {bd.seatTypeCharge > 0 && <PriceRow label="Window Seat" value={`+₹${bd.seatTypeCharge.toLocaleString('en-IN')}`} accent="#8b5cf6" />}
                  {bd.seatClassCharge > 0 && <PriceRow label="Business Class" value={`+₹${bd.seatClassCharge.toLocaleString('en-IN')}`} accent="#f59e0b" />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#0f172a', paddingTop: 4 }}>
                    <span>Seat total</span>
                    <span>₹{bd.finalPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: '2px solid #0f172a', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 20, fontFamily: 'Syne, sans-serif' }}>
            <span>Total Payable</span>
            <span style={{ color: '#0ea5e9' }}>₹{totalPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Per-passenger details */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <SectionLabel>Passenger Details</SectionLabel>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Email (account)</label>
          <input value={user?.email} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }} />
        </div>

        {seats.map((seat, idx) => (
          <div key={seat.seatNumber} style={{
            marginBottom: idx < seats.length - 1 ? 24 : 0,
            paddingBottom: idx < seats.length - 1 ? 24 : 0,
            borderBottom: idx < seats.length - 1 ? '1px solid #f1f5f9' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{
                background: '#dbeafe', color: '#1d4ed8',
                fontWeight: 800, fontSize: 14, borderRadius: 8,
                padding: '4px 12px', fontFamily: 'Syne, sans-serif'
              }}>
                Seat {seat.seatNumber}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{seat.seatType}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  value={passengers[idx].passengerName}
                  onChange={e => updatePassenger(idx, 'passengerName', e.target.value)}
                  placeholder={`Passenger ${idx + 1} name`}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone (optional)</label>
                <input
                  value={passengers[idx].passengerPhone}
                  onChange={e => updatePassenger(idx, 'passengerPhone', e.target.value)}
                  placeholder="+91 98765 43210"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: 14 }}>
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="btn btn-primary"
          style={{ flex: 2, justifyContent: 'center', padding: 14, fontSize: 16, borderRadius: 12 }}
        >
          {loading
            ? <><span className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} /> Confirming...</>
            : `Confirm ${seats.length} Booking${seats.length > 1 ? 's' : ''}`
          }
        </button>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <h3 style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>{children}</h3>
);

const Field = ({ label, value }) => (
  <div>
    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{value}</div>
  </div>
);

const PriceRow = ({ label, value, accent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: accent || '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, outline: 'none', color: '#0f172a', boxSizing: 'border-box' };

export default BookingSummary;