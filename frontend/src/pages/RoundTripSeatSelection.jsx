import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { getFlightById, getFlightPrice, lockSeats } from '../services/api';

const fmt = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const Leg = ({ label, flight, seats, selected, onSelect, passengers, pricing, pricingLoading }) => {
  const [loading, setLoading] = useState(true);
  const [localSeats, setLocalSeats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getFlightById(flight._id)
      .then(res => setLocalSeats(res.data.seats))
      .finally(() => setLoading(false));
  }, [flight._id]);

  const seatsByRow = {};
  localSeats.forEach(s => {
    if (!seatsByRow[s.row]) seatsByRow[s.row] = [];
    seatsByRow[s.row].push(s);
  });

  const getSeatStyle = (seat) => {
    if (seat.status === 'BOOKED') return { bg: '#e2e8f0', border: '#cbd5e1', cursor: 'not-allowed', color: '#94a3b8' };
    const isSelected = !!selected.find(s => s.seatNumber === seat.seatNumber);
    if (isSelected) return { bg: '#dbeafe', border: '#3b82f6', cursor: 'pointer', color: '#1d4ed8' };
    if (seat.status === 'LOCKED') return { bg: '#fef3c7', border: '#f59e0b', cursor: 'not-allowed', color: '#92400e' };
    if (seat.seatClass === 'BUSINESS') return { bg: '#fef3c7', border: '#f59e0b', cursor: 'pointer', color: '#92400e' };
    return { bg: 'white', border: '#e2e8f0', cursor: 'pointer', color: '#0f172a' };
  };

  const handleClick = (seat) => {
    setError('');
    const isSelected = !!selected.find(s => s.seatNumber === seat.seatNumber);
    if (!isSelected && (seat.status === 'BOOKED' || seat.status === 'LOCKED')) return;

    if (isSelected) {
      onSelect(selected.filter(s => s.seatNumber !== seat.seatNumber));
      return;
    }
    if (selected.length >= passengers) {
      setError(`Select at most ${passengers} seat(s) for this leg.`);
      return;
    }
    onSelect([...selected, seat]);
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{flight.airline} · {flight.flightNumber}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{flight.source} → {flight.destination} · {fmt(flight.departureTime)}</div>
        </div>
        <span className="badge badge-info">{selected.length}/{passengers} selected</span>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 10 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30 }}><div className="spin" style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', margin: '0 auto' }} /></div>
      ) : (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, overflowX: 'auto' }}>
          {Object.entries(seatsByRow).sort(([a], [b]) => Number(a) - Number(b)).map(([row, rowSeats]) => {
            const sorted = [...rowSeats].sort((a, b) => a.column.localeCompare(b.column));
            return (
              <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                <div style={{ width: 22, textAlign: 'right', fontSize: 11, color: '#94a3b8', marginRight: 3 }}>{row}</div>
                {sorted.map((seat, idx) => {
                  const style = getSeatStyle(seat);
                  return (
                    <React.Fragment key={seat._id}>
                      {idx === 3 && <div style={{ width: 14 }} />}
                      <button
                        onClick={() => handleClick(seat)}
                        title={`${seat.seatNumber} — ${seat.seatType} — ${seat.status}`}
                        style={{
                          width: 32, height: 30, borderRadius: 5,
                          background: style.bg, border: `2px solid ${style.border}`,
                          cursor: style.cursor, fontSize: 9, fontWeight: 600, color: style.color,
                          fontFamily: 'inherit'
                        }}
                      >
                        {seat.seatNumber}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {pricing && (
        <div style={{ marginTop: 14, borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
          <span>Leg total {pricingLoading && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>· updating…</span>}</span>
          <span>₹{pricing.finalPrice.toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  );
};

const RoundTripSeatSelection = () => {
  const { selectedOutboundFlight, selectedReturnFlight, roundTripSeats, setRoundTripSeats } = useBooking();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passengers = parseInt(searchParams.get('passengers') || 1);

  const [outboundPricing, setOutboundPricing] = useState(null);
  const [returnPricing, setReturnPricing] = useState(null);
  const [outLoading, setOutLoading] = useState(false);
  const [retLoading, setRetLoading] = useState(false);
  const [error, setError] = useState('');
  const [locking, setLocking] = useState(false);

  const setOutbound = useCallback((s) => setRoundTripSeats(prev => ({ ...prev, outbound: s })), [setRoundTripSeats]);
  const setReturn = useCallback((s) => setRoundTripSeats(prev => ({ ...prev, return: s })), [setRoundTripSeats]);

  useEffect(() => {
    if (!selectedOutboundFlight || roundTripSeats.outbound.length === 0) { setOutboundPricing(null); return; }
    setOutLoading(true);
    getFlightPrice(selectedOutboundFlight._id, { seatNumbers: roundTripSeats.outbound.map(s => s.seatNumber), passengers: roundTripSeats.outbound.length })
      .then(res => setOutboundPricing(res.data.priceBreakdown))
      .finally(() => setOutLoading(false));
  }, [roundTripSeats.outbound, selectedOutboundFlight]);

  useEffect(() => {
    if (!selectedReturnFlight || roundTripSeats.return.length === 0) { setReturnPricing(null); return; }
    setRetLoading(true);
    getFlightPrice(selectedReturnFlight._id, { seatNumbers: roundTripSeats.return.map(s => s.seatNumber), passengers: roundTripSeats.return.length })
      .then(res => setReturnPricing(res.data.priceBreakdown))
      .finally(() => setRetLoading(false));
  }, [roundTripSeats.return, selectedReturnFlight]);

  if (!selectedOutboundFlight || !selectedReturnFlight) {
    return (
      <div className="container" style={{ padding: 60, textAlign: 'center' }}>
        <h2>Please select both an outbound and return flight first</h2>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Search Flights</button>
      </div>
    );
  }

  const combinedTotal = (outboundPricing?.finalPrice || 0) + (returnPricing?.finalPrice || 0);

  const handleContinue = async () => {
    if (roundTripSeats.outbound.length < passengers || roundTripSeats.return.length < passengers) {
      setError(`Select ${passengers} seat(s) on both legs to continue.`);
      return;
    }
    setLocking(true);
    setError('');
    try {
      const [outLock, retLock] = await Promise.all([
        lockSeats({ flightId: selectedOutboundFlight._id, seatNumbers: roundTripSeats.outbound.map(s => s.seatNumber) }),
        lockSeats({ flightId: selectedReturnFlight._id, seatNumbers: roundTripSeats.return.map(s => s.seatNumber) })
      ]);
      navigate('/round-trip/summary', {
        state: {
          outbound: selectedOutboundFlight,
          returnFlight: selectedReturnFlight,
          outboundSeats: roundTripSeats.outbound,
          returnSeats: roundTripSeats.return,
          outboundPricing, returnPricing,
          outboundLockExpiry: outLock.data.lockExpiry,
          returnLockExpiry: retLock.data.lockExpiry
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'One or more seats are no longer available.');
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Select Seats — Round Trip</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Choose {passengers} seat{passengers > 1 ? 's' : ''} on each leg of your journey.</p>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#991b1b' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', marginBottom: 24 }}>
        <Leg label="Outbound" flight={selectedOutboundFlight} selected={roundTripSeats.outbound} onSelect={setOutbound} passengers={passengers} pricing={outboundPricing} pricingLoading={outLoading} />
        <Leg label="Return" flight={selectedReturnFlight} selected={roundTripSeats.return} onSelect={setReturn} passengers={passengers} pricing={returnPricing} pricingLoading={retLoading} />
      </div>

      <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Combined Total</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>₹{combinedTotal.toLocaleString('en-IN')}</div>
        </div>
        <button onClick={handleContinue} disabled={locking} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 12 }}>
          {locking ? 'Locking seats...' : 'Continue to Passenger Details →'}
        </button>
      </div>
    </div>
  );
};

export default RoundTripSeatSelection;
