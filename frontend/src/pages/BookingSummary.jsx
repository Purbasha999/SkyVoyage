import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddOnsSection from '../components/AddOnsSection';

const fmt = (date) => new Date(date).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true
});

const BookingSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { flight, seats, priceBreakdown, lockExpiry } = location.state || {};

  const [passengers, setPassengers] = useState(
    seats?.map((_, i) => ({
      passengerName: i === 0 ? (user?.name || '') : '',
      passengerAge: '',
      passengerGender: 'MALE',
      passengerPhone: ''
    })) || []
  );
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [error, setError] = useState('');

  // Countdown for the lock window so the user knows they're on the clock.
  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!lockExpiry) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((new Date(lockExpiry) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockExpiry]);

  if (!flight || !seats?.length || !priceBreakdown) {
    return (
      <div className="container" style={{ padding: 60, textAlign: 'center' }}>
        <h2>Session Expired</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Please start your search again.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">Search Flights</button>
      </div>
    );
  }

  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const mealTotal = selectedAddOns.filter(a => a.type === 'meal').reduce((s, a) => s + a.price, 0);
  const baggageTotal = selectedAddOns.filter(a => a.type === 'baggage').reduce((s, a) => s + a.price, 0);
  const grandTotal = priceBreakdown.finalPrice + addOnTotal;

  const updatePassenger = (idx, field, value) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleConfirm = () => {
    const missing = passengers.findIndex(p => !p.passengerName.trim() || !p.passengerAge);
    if (missing !== -1) {
      setError(`Full name and age are required for seat ${seats[missing].seatNumber}.`);
      return;
    }
    setError('');
    navigate('/payment', {
      state: {
        bookingData: {
          type: 'oneway',
          flight, seats, priceBreakdown, passengers,
          addOns: selectedAddOns,
          totalPrice: grandTotal
        }
      }
    });
  };

  return (
    <div className="container" style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Booking Summary</h1>
      <p style={{ color: '#64748b', marginBottom: 20 }}>Review your details, add extras, and proceed to payment.</p>

      {secondsLeft != null && (
        <div style={{
          background: secondsLeft < 60 ? '#fee2e2' : '#fef3c7',
          border: `1px solid ${secondsLeft < 60 ? '#fca5a5' : '#fcd34d'}`,
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          color: secondsLeft < 60 ? '#991b1b' : '#92400e', fontSize: 13, fontWeight: 600
        }}>
          🔒 Seats locked — complete checkout within {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} or they'll be released.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Passenger Details */}
          <div className="card" style={{ padding: 24 }}>
            <SectionLabel>Passenger Details</SectionLabel>
            {seats.map((seat, idx) => (
              <div key={seat.seatNumber} style={{
                marginBottom: idx < seats.length - 1 ? 20 : 0,
                paddingBottom: idx < seats.length - 1 ? 20 : 0,
                borderBottom: idx < seats.length - 1 ? '1px solid #f1f5f9' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: 13, borderRadius: 8, padding: '4px 10px', fontFamily: 'Syne, sans-serif' }}>
                    Seat {seat.seatNumber}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{seat.seatType}{seat.seatClass === 'BUSINESS' ? ' · Business' : ''}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input style={inputStyle} value={passengers[idx].passengerName} placeholder={`Passenger ${idx + 1}`} onChange={e => updatePassenger(idx, 'passengerName', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Age *</label>
                    <input style={inputStyle} type="number" min="1" max="120" value={passengers[idx].passengerAge} onChange={e => updatePassenger(idx, 'passengerAge', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select style={inputStyle} value={passengers[idx].passengerGender} onChange={e => updatePassenger(idx, 'passengerGender', e.target.value)}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input style={inputStyle} value={passengers[idx].passengerPhone} placeholder="+91 98765 43210" onChange={e => updatePassenger(idx, 'passengerPhone', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <AddOnsSection selected={selectedAddOns} setSelected={setSelectedAddOns} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Flight summary */}
          <div className="card" style={{ padding: 20 }}>
            <SectionLabel>Flight Details</SectionLabel>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{flight.airline} · {flight.flightNumber}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{flight.source} → {flight.destination}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{fmt(flight.departureTime)}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {seats.map(s => <span key={s.seatNumber} className="badge badge-info">{s.seatNumber}</span>)}
            </div>
          </div>

          {/* Price */}
          <div className="card" style={{ padding: 20 }}>
            <SectionLabel>Price Breakdown</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <PriceRow label={`Base fare (${seats.length} pax)`} value={`₹${priceBreakdown.basePrice.toLocaleString('en-IN')}`} />
              {priceBreakdown.demandCharge > 0 && <PriceRow label="High demand" value={`+₹${priceBreakdown.demandCharge.toLocaleString('en-IN')}`} accent="#f59e0b" />}
              {priceBreakdown.lateBookingCharge > 0 && <PriceRow label="Last-minute" value={`+₹${priceBreakdown.lateBookingCharge.toLocaleString('en-IN')}`} accent="#ef4444" />}
              {priceBreakdown.seatTypeCharge > 0 && <PriceRow label="Seat charges" value={`+₹${priceBreakdown.seatTypeCharge.toLocaleString('en-IN')}`} accent="#8b5cf6" />}
              {priceBreakdown.seatClassCharge > 0 && <PriceRow label="Business class" value={`+₹${priceBreakdown.seatClassCharge.toLocaleString('en-IN')}`} accent="#f59e0b" />}
              <PriceRow label="Taxes & GST (18%)" value={`₹${priceBreakdown.taxes.toLocaleString('en-IN')}`} />
              {mealTotal > 0 && <PriceRow label="Meals" value={`+₹${mealTotal.toLocaleString('en-IN')}`} />}
              {baggageTotal > 0 && <PriceRow label="Excess baggage" value={`+₹${baggageTotal.toLocaleString('en-IN')}`} />}
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, fontFamily: 'Syne, sans-serif' }}>
                <span>Total</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', color: '#991b1b', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={handleConfirm} className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 16, borderRadius: 12, justifyContent: 'center' }}>
            Continue to Payment →
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <h3 style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>{children}</h3>
);

const PriceRow = ({ label, value, accent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: accent || '#374151', padding: '3px 0' }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, outline: 'none', color: '#0f172a', boxSizing: 'border-box' };

export default BookingSummary;
