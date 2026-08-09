import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddOnsSection from '../components/AddOnsSection';
import './BookingSummary.css';

const fmt = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDur = (dep, arr) => {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const BookingSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { flight, seatNumbers, priceBreakdown: pb, lockExpiry } = location.state || {};

  const [passengerForms, setPassengerForms] = useState(
    Array.from({ length: seatNumbers?.length || 0 }, (_, i) => ({
      passengerName: i === 0 ? (user?.name || '') : '',
      passengerAge: '',
      passengerGender: 'MALE',
      passengerPhone: ''
    }))
  );
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [error, setError] = useState('');

  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!lockExpiry) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((new Date(lockExpiry) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockExpiry]);

  if (!flight || !seatNumbers?.length || !pb) {
    navigate('/');
    return null;
  }

  const addOnTotal = selectedAddOns.reduce((s, a) => s + a.price, 0);
  const mealTotal = selectedAddOns.filter(a => a.type === 'meal').reduce((s, a) => s + a.price, 0);
  const baggageTotal = selectedAddOns.filter(a => a.type === 'baggage').reduce((s, a) => s + a.price, 0);

  const updatePassenger = (i, field, value) => {
    setPassengerForms(forms => forms.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  };

  const handleConfirm = () => {
    const invalid = passengerForms.find(p => !p.passengerName || !p.passengerAge);
    if (invalid) { setError('Please fill in all passenger details'); return; }
    setError('');

    navigate('/payment', {
      state: {
        bookingData: {
          type: 'oneway',
          flight, seatNumbers, priceBreakdown: pb, passengers: passengerForms,
          addOns: selectedAddOns,
          totalPrice: (pb.finalPrice || 0) + addOnTotal
        }
      }
    });
  };

  return (
    <div className="page-content summary-page">
      <div className="summary-header">
        <div className="section">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="summary-title">Booking Summary</h1>
        </div>
      </div>

      <div className="section summary-layout">
        <div className="summary-left">
          {secondsLeft != null && (
            <div className="lock-countdown" style={{ background: secondsLeft < 60 ? 'var(--red-50)' : 'var(--amber-50)', color: secondsLeft < 60 ? 'var(--red-600)' : '#854F0B' }}>
              🔒 Seats locked — complete checkout within {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} or they'll be released.
            </div>
          )}

          <div className="card summary-card">
            <h3 className="sc-title">Passenger Details</h3>
            {passengerForms.map((p, i) => (
              <div key={i} className="passenger-form">
                <div className="pf-label">Passenger {i + 1} · Seat {seatNumbers[i]}</div>
                <div className="pf-fields">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" placeholder="As on ID" value={p.passengerName} onChange={e => updatePassenger(i, 'passengerName', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input className="form-input" type="number" placeholder="25" min="1" max="120" value={p.passengerAge} onChange={e => updatePassenger(i, 'passengerAge', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-input" value={p.passengerGender} onChange={e => updatePassenger(i, 'passengerGender', e.target.value)}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AddOnsSection selected={selectedAddOns} setSelected={setSelectedAddOns} />
        </div>

        <div className="summary-right">
          <div className="card summary-card">
            <h3 className="sc-title">Flight Details</h3>
            <div className="sf-airline-row">
              <div className="sf-badge">{flight.flightNumber}</div>
              <div>
                <div className="sf-airline">{flight.airline}</div>
                <div className="sf-num">{flight.flightNumber}</div>
              </div>
            </div>
            <div className="sf-route">
              <div className="sf-city">
                <div className="sf-time">{fmt(flight.departureTime)}</div>
                <div className="sf-code">{flight.source}</div>
              </div>
              <div className="sf-arrow-wrap">
                <div className="sf-dur">{fmtDur(flight.departureTime, flight.arrivalTime)}</div>
                <div className="sf-line">──── ✈ ────</div>
              </div>
              <div className="sf-city right">
                <div className="sf-time">{fmt(flight.arrivalTime)}</div>
                <div className="sf-code">{flight.destination}</div>
              </div>
            </div>
            <div className="sf-date">{fmtDate(flight.departureTime)}</div>
            <div className="sf-seats-row">
              <span className="sf-seats-label">Selected Seats:</span>
              {seatNumbers.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
            </div>
          </div>

          <div className="card summary-card">
            <h3 className="sc-title">Price Breakdown</h3>
            <div className="price-rows">
              <div className="price-row"><span>Base fare ({seatNumbers.length} pax)</span><span>₹{(pb.basePrice || 0).toLocaleString('en-IN')}</span></div>
              {pb.demandCharge > 0 && <div className="price-row surcharge"><span>High demand</span><span>+₹{pb.demandCharge.toLocaleString('en-IN')}</span></div>}
              {pb.lateBookingCharge > 0 && <div className="price-row surcharge"><span>Last-minute</span><span>+₹{pb.lateBookingCharge.toLocaleString('en-IN')}</span></div>}
              {pb.seatTypeCharge > 0 && <div className="price-row"><span>Seat charges</span><span>+₹{pb.seatTypeCharge.toLocaleString('en-IN')}</span></div>}
              {pb.seatClassCharge > 0 && <div className="price-row"><span>Business class</span><span>+₹{pb.seatClassCharge.toLocaleString('en-IN')}</span></div>}
              <div className="price-row"><span>Taxes &amp; GST (18%)</span><span>₹{(pb.taxes || 0).toLocaleString('en-IN')}</span></div>
              {mealTotal > 0 && <div className="price-row"><span>Meals</span><span>+₹{mealTotal.toLocaleString('en-IN')}</span></div>}
              {baggageTotal > 0 && <div className="price-row"><span>Excess Baggage</span><span>+₹{baggageTotal.toLocaleString('en-IN')}</span></div>}
              <hr className="divider" />
              <div className="price-row total"><span>Total Amount</span><span>₹{((pb.finalPrice || 0) + addOnTotal).toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: 13 }}>{error}</div>}

          <button className="btn btn-primary btn-lg btn-full" onClick={handleConfirm}>
            Continue to Payment · ₹{((pb.finalPrice || 0) + addOnTotal).toLocaleString('en-IN')}
          </button>
          <p className="summary-tnc">By confirming, you agree to our Terms & Conditions. Fare includes all taxes.</p>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
