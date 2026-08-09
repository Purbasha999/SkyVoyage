import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddOnsSection from '../components/AddOnsSection';
import './BookingSummaryRound.css';

const fmt = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

const RoundTripBookingSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    outbound, returnFlight, outboundSeatNumbers, returnSeatNumbers,
    outboundPricing, returnPricing, outboundLockExpiry, returnLockExpiry
  } = location.state || {};

  const maxPax = Math.max(outboundSeatNumbers?.length || 0, returnSeatNumbers?.length || 0);
  const [forms, setForms] = useState(
    Array.from({ length: maxPax }, (_, i) => ({
      passengerName: i === 0 ? (user?.name || '') : '',
      passengerAge: '',
      passengerGender: 'MALE',
      passengerPhone: ''
    }))
  );
  const [addOns, setAddOns] = useState({ outbound: [], return: [] });
  const [error, setError] = useState('');

  if (!outbound || !returnFlight) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: 60 }}>
        <h2>Please select both flights first</h2>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Search Flights</button>
      </div>
    );
  }

  const outboundAddOnTotal = addOns.outbound.reduce((s, i) => s + i.price, 0);
  const returnAddOnTotal = addOns.return.reduce((s, i) => s + i.price, 0);

  const handleConfirm = () => {
    if (forms.some(p => !p.passengerName || !p.passengerAge)) {
      setError('Fill in name and age for every passenger');
      return;
    }
    setError('');
    navigate('/payment', {
      state: {
        bookingData: {
          type: 'roundtrip',
          outbound, returnFlight,
          outboundSeatNumbers, returnSeatNumbers,
          outboundPricing, returnPricing,
          outboundLockExpiry, returnLockExpiry,
          passengers: forms, addOns,
          totalPrice: (outboundPricing?.finalPrice || 0) + (returnPricing?.finalPrice || 0) + outboundAddOnTotal + returnAddOnTotal
        }
      }
    });
  };

  const updatePassenger = (i, field, value) => setForms(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  return (
    <div className="page-content summary-page">
      <div className="summary-header">
        <div className="section">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="summary-title">Booking Summary — Round Trip</h1>
        </div>
      </div>

      <div className="section summary-layout">
        <div className="summary-left">
          <div className="card summary-card">
            <h3 className="sc-title">Passenger Details</h3>
            {forms.map((p, i) => (
              <div key={i} className="passenger-form">
                <div className="pf-label">Passenger {i + 1} · Outbound {outboundSeatNumbers[i]} · Return {returnSeatNumbers[i]}</div>
                <div className="pf-fields">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={p.passengerName} onChange={e => updatePassenger(i, 'passengerName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input className="form-input" type="number" value={p.passengerAge} onChange={e => updatePassenger(i, 'passengerAge', e.target.value)} />
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

          <div>
            <h3 className="sc-title" style={{ margin: '0 0 10px' }}>Add-ons — Outbound</h3>
            <AddOnsSection selected={addOns.outbound} setSelected={(val) => setAddOns(prev => ({ ...prev, outbound: val }))} />
          </div>
          <div>
            <h3 className="sc-title" style={{ margin: '0 0 10px' }}>Add-ons — Return</h3>
            <AddOnsSection selected={addOns.return} setSelected={(val) => setAddOns(prev => ({ ...prev, return: val }))} />
          </div>
        </div>

        <div className="summary-right">
          <div className="card summary-card">
            <h3 className="sc-title">Outbound Flight</h3>
            <div className="sf-airline-row">
              <div className="sf-badge">{outbound.flightNumber}</div>
              <div><div className="sf-airline">{outbound.airline}</div></div>
            </div>
            <div className="sf-route">
              <div className="sf-city"><div className="sf-time">{fmt(outbound.departureTime)}</div><div className="sf-code">{outbound.source}</div></div>
              <div className="sf-arrow-wrap">✈</div>
              <div className="sf-city right"><div className="sf-time">{fmt(outbound.arrivalTime)}</div><div className="sf-code">{outbound.destination}</div></div>
            </div>
            <div className="sf-seats-row">{outboundSeatNumbers.map(s => <span key={s} className="badge badge-blue">{s}</span>)}</div>
          </div>

          <div className="card summary-card">
            <h3 className="sc-title">Return Flight</h3>
            <div className="sf-airline-row">
              <div className="sf-badge">{returnFlight.flightNumber}</div>
              <div><div className="sf-airline">{returnFlight.airline}</div></div>
            </div>
            <div className="sf-route">
              <div className="sf-city"><div className="sf-time">{fmt(returnFlight.departureTime)}</div><div className="sf-code">{returnFlight.source}</div></div>
              <div className="sf-arrow-wrap">✈</div>
              <div className="sf-city right"><div className="sf-time">{fmt(returnFlight.arrivalTime)}</div><div className="sf-code">{returnFlight.destination}</div></div>
            </div>
            <div className="sf-seats-row">{returnSeatNumbers.map(s => <span key={s} className="badge badge-blue">{s}</span>)}</div>
          </div>

          <div className="card summary-card">
            <h3 className="sc-title">Price Breakdown</h3>
            <div className="price-rows">
              <div className="price-row"><span>Outbound Base</span><span>₹{(outboundPricing?.basePrice || 0).toLocaleString('en-IN')}</span></div>
              {outboundPricing?.seatTypeCharge > 0 && <div className="price-row"><span>Outbound Seat Charges</span><span>+₹{outboundPricing.seatTypeCharge.toLocaleString('en-IN')}</span></div>}
              <div className="price-row"><span>Outbound Taxes</span><span>₹{(outboundPricing?.taxes || 0).toLocaleString('en-IN')}</span></div>
              {outboundAddOnTotal > 0 && <div className="price-row"><span>Outbound Add-ons</span><span>+₹{outboundAddOnTotal.toLocaleString('en-IN')}</span></div>}
              <hr className="divider" />
              <div className="price-row"><span>Return Base</span><span>₹{(returnPricing?.basePrice || 0).toLocaleString('en-IN')}</span></div>
              {returnPricing?.seatTypeCharge > 0 && <div className="price-row"><span>Return Seat Charges</span><span>+₹{returnPricing.seatTypeCharge.toLocaleString('en-IN')}</span></div>}
              <div className="price-row"><span>Return Taxes</span><span>₹{(returnPricing?.taxes || 0).toLocaleString('en-IN')}</span></div>
              {returnAddOnTotal > 0 && <div className="price-row"><span>Return Add-ons</span><span>+₹{returnAddOnTotal.toLocaleString('en-IN')}</span></div>}
              <hr className="divider" />
              <div className="price-row total"><span>Total</span><span>₹{((outboundPricing?.finalPrice || 0) + (returnPricing?.finalPrice || 0) + outboundAddOnTotal + returnAddOnTotal).toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: 13 }}>{error}</div>}

          <button className="btn btn-primary btn-lg btn-full" onClick={handleConfirm}>Continue to Payment →</button>
        </div>
      </div>
    </div>
  );
};

export default RoundTripBookingSummary;
