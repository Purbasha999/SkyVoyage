import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getFlightById, getSeatPrice } from '../services/api';

const fmt = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const ruleTypeColor = {
  DEMAND:    '#f59e0b',
  TIME:      '#ef4444',
  SEAT_TYPE: '#8b5cf6',
  CLASS:     '#d97706',
};

const SeatSelection = () => {
  const { id: flightId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passengers = parseInt(searchParams.get('passengers') || 1);

  const [flight, setFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [priceBreakdowns, setPriceBreakdowns] = useState([]);

  const totalBreakdown = priceBreakdowns.length > 0 ? (() => {
    const ruleMap = {}; // { name, charge, type }
    let basePrice = 0;
    let finalPrice = 0;
    for (const p of priceBreakdowns) {
      basePrice  += p.basePrice;
      finalPrice += p.finalPrice;
      for (const r of (p.appliedRules || [])) {
        if (ruleMap[r.name]) {
          ruleMap[r.name] = { ...r, charge: ruleMap[r.name].charge + r.charge };
        } else {
          ruleMap[r.name] = { ...r };
        }
      }
    }
    return { basePrice, finalPrice, rules: Object.values(ruleMap) };
  })() : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFlight = useCallback(() => {
    getFlightById(flightId)
      .then(res => {
        setFlight(res.data.flight);
        setSeats(res.data.seats);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Error loading flight');
        setLoading(false);
      });
  }, [flightId]);

  useEffect(() => { fetchFlight(); }, [fetchFlight]);

  const handleSeatClick = async (seat) => {
    if (seat.status === 'BOOKED') return;
    setError('');

    if (selectedSeats.find(s => s.seatNumber === seat.seatNumber)) {
      setSelectedSeats(prev => prev.filter(s => s.seatNumber !== seat.seatNumber));
      setPriceBreakdowns(prev => prev.filter(p => p.seatNumber !== seat.seatNumber));
      return;
    }

    if (selectedSeats.length >= passengers) {
      setError(`You can only select ${passengers} seat${passengers > 1 ? 's' : ''}.`);
      return;
    }

    setSelectedSeats(prev => [...prev, seat]);

    try {
      const res = await getSeatPrice({ flightId, seatNumber: seat.seatNumber });
      setPriceBreakdowns(prev => [...prev, { seatNumber: seat.seatNumber, ...res.data.priceBreakdown }]);
    } catch {
      // price fetch failure is non-blocking
    }
  };

  const handleProceed = () => {
    if (selectedSeats.length !== passengers) return;
    if (priceBreakdowns.length !== passengers) {
      setError('Prices are still loading, please wait a moment.');
      return;
    }
    navigate('/booking-summary', {
      state: { flight, seats: selectedSeats, priceBreakdowns }
    });
  };

  const getSeatStyle = (seat) => {
    if (seat.status === 'BOOKED') {
      return { bg: '#e2e8f0', border: '#cbd5e1', cursor: 'not-allowed', color: '#94a3b8' };
    }
    if (selectedSeats.find(s => s.seatNumber === seat.seatNumber)) {
      return { bg: '#dbeafe', border: '#3b82f6', cursor: 'pointer', color: '#1d4ed8' };
    }
    if (seat.seatClass === 'BUSINESS') {
      return { bg: '#fef3c7', border: '#f59e0b', cursor: 'pointer', color: '#92400e' };
    }
    return { bg: 'white', border: '#e2e8f0', cursor: 'pointer', color: '#0f172a' };
  };

  const seatsByRow = {};
  seats.forEach(s => {
    if (!seatsByRow[s.row]) seatsByRow[s.row] = [];
    seatsByRow[s.row].push(s);
  });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!flight) return <div className="container" style={{ padding: 40, color: '#ef4444' }}>{error || 'Flight not found.'}</div>;

  const availableCount = seats.filter(s => s.status === 'AVAILABLE').length;

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      {/* Flight info bar */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 24 }}>✈</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{flight.airline} · {flight.flightNumber}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{flight.source} → {flight.destination} · {fmt(flight.departureTime)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Price</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>₹{flight.basePrice.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>{availableCount}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Seat Map */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ marginBottom: 4, fontSize: 20 }}>Select Your Seat{passengers > 1 ? 's' : ''}</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
            Choose {passengers} seat{passengers > 1 ? 's' : ''} — {selectedSeats.length} of {passengers} selected.
          </p>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { color: 'white',    border: '#e2e8f0', label: 'Economy' },
              { color: '#fef3c7', border: '#f59e0b', label: 'Business' },
              { color: '#dbeafe', border: '#3b82f6', label: 'Your Selection' },
              { color: '#e2e8f0', border: '#cbd5e1', label: 'Booked' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: l.color, border: `2px solid ${l.border}` }} />
                <span style={{ fontSize: 12, color: '#64748b' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#991b1b', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Seat grid */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, overflowX: 'auto' }}>
            {/* Column labels */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, paddingLeft: 36 }}>
              {['A', 'B', 'C', '', 'D', 'E', 'F'].map((col, i) => (
                <div key={i} style={{ width: col === '' ? 24 : 40, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                  {col}
                </div>
              ))}
            </div>

            {Object.entries(seatsByRow).sort(([a], [b]) => Number(a) - Number(b)).map(([row, rowSeats]) => {
              const sorted = [...rowSeats].sort((a, b) => a.column.localeCompare(b.column));
              return (
                <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <div style={{ width: 28, textAlign: 'right', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>{row}</div>
                  {sorted.map((seat, idx) => {
                    const style = getSeatStyle(seat);
                    const isBooked = seat.status === 'BOOKED';
                    return (
                      <React.Fragment key={seat._id}>
                        {idx === 3 && <div style={{ width: 20 }} />}
                        <button
                          onClick={() => !isBooked && handleSeatClick(seat)}
                          disabled={isBooked}
                          title={`${seat.seatNumber} — ${seat.seatType} — ${seat.status}`}
                          style={{
                            width: 40, height: 36,
                            borderRadius: 6,
                            background: style.bg,
                            border: `2px solid ${style.border}`,
                            cursor: style.cursor,
                            fontSize: 11,
                            fontWeight: 600,
                            color: style.color,
                            transition: 'all 0.15s',
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
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selection progress */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
              Seats Selected
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minHeight: 36 }}>
              {selectedSeats.length === 0
                ? <span style={{ fontSize: 13, color: '#94a3b8' }}>No seats selected yet</span>
                : selectedSeats.map(s => (
                    <span
                      key={s.seatNumber}
                      onClick={() => handleSeatClick(s)}
                      title="Click to deselect"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: '#dbeafe', color: '#1d4ed8',
                        border: '1.5px solid #3b82f6', borderRadius: 8,
                        padding: '4px 10px', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {s.seatNumber} <span style={{ fontSize: 10, opacity: 0.7 }}>✕</span>
                    </span>
                  ))
              }
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                <span>{selectedSeats.length} selected</span>
                <span>{passengers} needed</span>
              </div>
              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: selectedSeats.length === passengers ? '#10b981' : '#3b82f6',
                  width: `${(selectedSeats.length / passengers) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          {totalBreakdown && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                {priceBreakdowns.length > 1 ? 'Total Price' : 'Price Breakdown'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Base price */}
                <div style={priceRow}>
                  <span style={{ color: '#374151' }}>Base Fare</span>
                  <span style={{ color: '#374151' }}>₹{totalBreakdown.basePrice.toLocaleString('en-IN')}</span>
                </div>

                {/* Dynamic named rules */}
                {totalBreakdown.rules.map(rule => (
                  <div key={rule.name} style={priceRow}>
                    <span style={{ color: ruleTypeColor[rule.type] || '#64748b' }}>{rule.name}</span>
                    <span style={{ color: ruleTypeColor[rule.type] || '#64748b' }}>
                      +₹{rule.charge.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}

                {/* No surcharges */}
                {totalBreakdown.rules.length === 0 && (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0' }}>No charges apply</div>
                )}

                <div style={{ borderTop: '2px solid #0f172a', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, fontFamily: 'Syne, sans-serif' }}>
                  <span>Total</span>
                  <span>₹{totalBreakdown.finalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleProceed}
            disabled={selectedSeats.length !== passengers}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, justifyContent: 'center', borderRadius: 12 }}
          >
            {selectedSeats.length === passengers
              ? 'Continue to Passenger Details →'
              : `Select ${passengers - selectedSeats.length} more seat${passengers - selectedSeats.length > 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
};

const priceRow = {
  display: 'flex', justifyContent: 'space-between',
  fontSize: 14, color: '#374151', padding: '4px 0',
  borderBottom: '1px solid #f1f5f9'
};

export default SeatSelection;