import React, { useEffect, useState } from 'react';
import { getFlightById } from '../services/api';
import './SeatMap.css';

const DEFAULT_COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEFAULT_ROWS = 10;

// A reusable cabin seat picker. Fetches its own seat map for `flightId` and
// reports the selected seat *numbers* (strings) back via onSeatsSelected —
// two of these render side by side for round-trip bookings.
const SeatMap = ({ flightId, maxSeats = 1, onSeatsSelected, userId, refreshKey }) => {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId, refreshKey]);

  const loadSeats = async () => {
    try {
      setLoading(true);
      const res = await getFlightById(flightId);
      setSeats(res.data.seats);
    } catch {
      setError('Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  const cols = seats.length > 0 ? [...new Set(seats.map(s => s.column))].sort() : DEFAULT_COLS;
  const maxRow = seats.length > 0 ? Math.max(...seats.map(s => s.row)) : DEFAULT_ROWS;
  const lastBusinessRow = Math.max(...seats.filter(s => s.seatClass === 'BUSINESS').map(s => s.row), 0);
  const aisleAfter = Math.floor(cols.length / 2) - 1;

  const getSeat = (row, col) => seats.find(s => s.row === row && s.column === col);

  const getSeatClass = (seat) => {
    if (!seat) return 'seat-empty';
    if (seat.status === 'BOOKED') return 'seat-confirmed';
    if (seat.status === 'LOCKED' && seat.lockedBy !== userId) return 'seat-locked';
    if (selected.includes(seat.seatNumber)) return 'seat-selected';
    if (seat.seatClass === 'BUSINESS') return 'seat-business';
    return 'seat-available';
  };

  const handleSeatClick = (seat) => {
    if (!seat) return;
    if (seat.status === 'BOOKED') return;
    if (seat.status === 'LOCKED' && !selected.includes(seat.seatNumber)) return;

    let newSelected;
    if (selected.includes(seat.seatNumber)) {
      newSelected = selected.filter(s => s !== seat.seatNumber);
    } else if (selected.length >= maxSeats) {
      // At capacity — picking a new seat swaps out the oldest selection
      // instead of requiring an explicit deselect first.
      newSelected = [...selected.slice(1), seat.seatNumber];
    } else {
      newSelected = [...selected, seat.seatNumber];
    }
    setSelected(newSelected);
    onSeatsSelected(newSelected);
  };

  if (loading) {
    return (
      <div className="seat-map-loading">
        <div className="spinner spinner-lg" />
        <p>Loading seat map...</p>
      </div>
    );
  }

  return (
    <div className="seat-map-wrap">
      {error && <div style={{ color: 'var(--red-600)', fontSize: 13 }}>{error}</div>}

      <div className="seat-legend">
        <div className="legend-item"><div className="legend-box seat-business" /> Business</div>
        <div className="legend-item"><div className="legend-box seat-available" /> Economy</div>
        <div className="legend-item"><div className="legend-box seat-selected" /> Selected</div>
        <div className="legend-item"><div className="legend-box seat-confirmed" /> Booked</div>
        <div className="legend-item"><div className="legend-box seat-locked" /> Locked</div>
      </div>

      <div className="airplane-body">
        <div className="airplane-nose">✈ Front of Aircraft</div>

        <div className="seat-row header-row">
          <div className="row-num" />
          {cols.map((col, i) => (
            <React.Fragment key={col}>
              {i === aisleAfter + 1 && <div className="aisle-gap" />}
              <div className="col-header">{col}</div>
            </React.Fragment>
          ))}
        </div>

        {Array.from({ length: maxRow }, (_, i) => i + 1).map(row => (
          <React.Fragment key={row}>
            {row === 1 && lastBusinessRow > 0 && <div className="class-section-label business-label">✦ Business Class</div>}
            {lastBusinessRow > 0 && row === lastBusinessRow + 1 && <div className="class-section-label economy-label">— Economy Class —</div>}

            <div className={`seat-row ${row <= lastBusinessRow ? 'business-row' : ''}`}>
              <div className="row-num">{row}</div>
              {cols.map((col, ci) => {
                const seat = getSeat(row, col);
                return (
                  <React.Fragment key={col}>
                    {ci === aisleAfter + 1 && <div className="aisle-gap" />}
                    <button
                      className={`seat ${getSeatClass(seat)}`}
                      onClick={() => handleSeatClick(seat)}
                      title={seat ? `${seat.seatNumber} — ${seat.seatType} — ${seat.seatClass} (${seat.status})` : ''}
                      disabled={!seat || seat.status === 'BOOKED' || (seat.status === 'LOCKED' && !selected.includes(seat.seatNumber))}
                    >
                      <span className="seat-num">{seat ? seat.seatNumber : ''}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        <div className="airplane-tail">🚪 Exit</div>
      </div>

      {selected.length > 0 && (
        <div className="selected-summary">
          <span>Selected: <strong>{selected.join(', ')}</strong></span>
          <span className="badge badge-blue">{selected.length}/{maxSeats} seat(s)</span>
        </div>
      )}
    </div>
  );
};

export default SeatMap;
