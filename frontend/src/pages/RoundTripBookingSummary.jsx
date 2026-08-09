import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddOnsSection from '../components/AddOnsSection';

const fmt = (date) => new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

const LegSummary = ({ label, flight, seats, pricing }) => (
  <div className="card" style={{ padding: 20 }}>
    <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 15 }}>{flight.airline} · {flight.flightNumber}</div>
    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{flight.source} → {flight.destination} · {fmt(flight.departureTime)}</div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
      {seats.map(s => <span key={s.seatNumber} className="badge badge-info">{s.seatNumber}</span>)}
    </div>
    {pricing && (
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Row label="Base fare" value={pricing.basePrice} />
        {pricing.demandCharge > 0 && <Row label="High demand" value={pricing.demandCharge} accent="#f59e0b" />}
        {pricing.lateBookingCharge > 0 && <Row label="Last-minute" value={pricing.lateBookingCharge} accent="#ef4444" />}
        {pricing.seatTypeCharge > 0 && <Row label="Seat charges" value={pricing.seatTypeCharge} accent="#8b5cf6" />}
        {pricing.seatClassCharge > 0 && <Row label="Business class" value={pricing.seatClassCharge} accent="#f59e0b" />}
        <Row label="Taxes & GST" value={pricing.taxes} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
          <span>Leg total</span><span>₹{pricing.finalPrice.toLocaleString('en-IN')}</span>
        </div>
      </div>
    )}
  </div>
);

const Row = ({ label, value, accent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', color: accent || '#374151' }}>
    <span>{label}</span><span>₹{value.toLocaleString('en-IN')}</span>
  </div>
);

const RoundTripBookingSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    outbound, returnFlight, outboundSeats, returnSeats,
    outboundPricing, returnPricing, outboundLockExpiry, returnLockExpiry
  } = location.state || {};

  const maxPax = Math.max(outboundSeats?.length || 0, returnSeats?.length || 0);
  const [passengers, setPassengers] = useState(
    Array.from({ length: maxPax }, (_, i) => ({
      passengerName: i === 0 ? (user?.name || '') : '',
      passengerAge: '',
      passengerGender: 'MALE',
      passengerPhone: ''
    }))
  );
  const [addOns, setAddOns] = useState({ outbound: [], return: [] });
  const [error, setError] = useState('');

  if (!outbound || !returnFlight || !outboundSeats?.length || !returnSeats?.length) {
    return (
      <div className="container" style={{ padding: 60, textAlign: 'center' }}>
        <h2>Session Expired</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Please start your round-trip search again.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">Search Flights</button>
      </div>
    );
  }

  const outAddOnTotal = addOns.outbound.reduce((s, a) => s + a.price, 0);
  const retAddOnTotal = addOns.return.reduce((s, a) => s + a.price, 0);
  const grandTotal = (outboundPricing?.finalPrice || 0) + (returnPricing?.finalPrice || 0) + outAddOnTotal + retAddOnTotal;

  const updatePassenger = (idx, field, value) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleConfirm = () => {
    const missing = passengers.findIndex(p => !p.passengerName.trim() || !p.passengerAge);
    if (missing !== -1) {
      setError('Full name and age are required for every passenger.');
      return;
    }
    setError('');
    navigate('/payment', {
      state: {
        bookingData: {
          type: 'roundtrip',
          outbound, returnFlight, outboundSeats, returnSeats,
          outboundPricing, returnPricing,
          outboundLockExpiry, returnLockExpiry,
          passengers, addOns,
          totalPrice: grandTotal
        }
      }
    });
  };

  return (
    <div className="container" style={{ padding: '32px 24px', maxWidth: 950, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Booking Summary — Round Trip</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Review both legs of your journey and add extras.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 14 }}>Passenger Details</h3>
            {passengers.map((p, idx) => (
              <div key={idx} style={{ marginBottom: idx < passengers.length - 1 ? 20 : 0, paddingBottom: idx < passengers.length - 1 ? 20 : 0, borderBottom: idx < passengers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Passenger {idx + 1} · Outbound {outboundSeats[idx]?.seatNumber} · Return {returnSeats[idx]?.seatNumber}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input style={inputStyle} value={p.passengerName} onChange={e => updatePassenger(idx, 'passengerName', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Age *</label>
                    <input style={inputStyle} type="number" min="1" max="120" value={p.passengerAge} onChange={e => updatePassenger(idx, 'passengerAge', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select style={inputStyle} value={p.passengerGender} onChange={e => updatePassenger(idx, 'passengerGender', e.target.value)}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
                <label style={labelStyle}>Phone (optional)</label>
                <input style={inputStyle} value={p.passengerPhone} onChange={e => updatePassenger(idx, 'passengerPhone', e.target.value)} />
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Add-ons — Outbound</h3>
            <AddOnsSection selected={addOns.outbound} setSelected={(val) => setAddOns(prev => ({ ...prev, outbound: val }))} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Add-ons — Return</h3>
            <AddOnsSection selected={addOns.return} setSelected={(val) => setAddOns(prev => ({ ...prev, return: val }))} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LegSummary label="Outbound" flight={outbound} seats={outboundSeats} pricing={outboundPricing} />
          <LegSummary label="Return" flight={returnFlight} seats={returnSeats} pricing={returnPricing} />

          <div className="card" style={{ padding: 20 }}>
            {outAddOnTotal > 0 && <Row label="Outbound add-ons" value={outAddOnTotal} />}
            {retAddOnTotal > 0 && <Row label="Return add-ons" value={retAddOnTotal} />}
            <div style={{ borderTop: '2px solid #0f172a', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, fontFamily: 'Syne, sans-serif' }}>
              <span>Grand Total</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', color: '#991b1b', fontSize: 13 }}>{error}</div>
          )}

          <button onClick={handleConfirm} className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 16, borderRadius: 12, justifyContent: 'center' }}>
            Continue to Payment →
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, outline: 'none', color: '#0f172a', boxSizing: 'border-box' };

export default RoundTripBookingSummary;
