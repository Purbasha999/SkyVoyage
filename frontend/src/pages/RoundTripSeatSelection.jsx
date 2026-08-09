import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import SeatMap from '../components/SeatMap';
import { lockSeats, getFlightPrice } from '../services/api';
import './SeatSelectionRound.css';

const RoundTripSeatSelection = () => {
  const { selectedOutboundFlight: outbound, selectedReturnFlight: returnFlight } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passengers = parseInt(searchParams.get('passengers') || 1);

  const [seats, setSeats] = useState({ outbound: [], return: [] });
  const [error, setError] = useState('');
  const [locking, setLocking] = useState(false);

  if (!outbound || !returnFlight) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: 60 }}>
        <h2>Please select both an outbound and return flight first</h2>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Search Flights</button>
      </div>
    );
  }

  const handleContinue = async () => {
    if (seats.outbound.length < passengers) { setError('Select outbound seats'); return; }
    if (seats.return.length < passengers) { setError('Select return seats'); return; }
    setError('');
    setLocking(true);

    try {
      const [outPrice, retPrice] = await Promise.all([
        getFlightPrice(outbound._id, { seatNumbers: seats.outbound, passengers }),
        getFlightPrice(returnFlight._id, { seatNumbers: seats.return, passengers })
      ]);

      const [outLock, retLock] = await Promise.all([
        lockSeats({ flightId: outbound._id, seatNumbers: seats.outbound }),
        lockSeats({ flightId: returnFlight._id, seatNumbers: seats.return })
      ]);

      navigate('/round-trip/summary', {
        state: {
          outbound, returnFlight,
          outboundSeatNumbers: seats.outbound, returnSeatNumbers: seats.return,
          outboundPricing: outPrice.data.priceBreakdown, returnPricing: retPrice.data.priceBreakdown,
          outboundLockExpiry: outLock.data.lockExpiry, returnLockExpiry: retLock.data.lockExpiry
        }
      });
    } catch {
      setError('Seat locking failed — one or more seats are no longer available.');
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="page-content">
      <div className="round-container">
        <div className="round-title">Select Seats — Round Trip</div>
        <div className="round-sub">Choose {passengers} seat{passengers > 1 ? 's' : ''} on each leg of your journey.</div>

        {error && <div className="round-error">{error}</div>}

        <div className="flight-panel">
          <div className="flight-title">Outbound</div>
          <div className="flight-panel-route">{outbound.airline} · {outbound.flightNumber} · {outbound.source} → {outbound.destination}</div>
          <SeatMap flightId={outbound._id} maxSeats={passengers} onSeatsSelected={(s) => setSeats(prev => ({ ...prev, outbound: s }))} userId={user?.id || user?._id} />
        </div>

        <div className="flight-panel">
          <div className="flight-title">Return</div>
          <div className="flight-panel-route">{returnFlight.airline} · {returnFlight.flightNumber} · {returnFlight.source} → {returnFlight.destination}</div>
          <SeatMap flightId={returnFlight._id} maxSeats={passengers} onSeatsSelected={(s) => setSeats(prev => ({ ...prev, return: s }))} userId={user?.id || user?._id} />
        </div>
      </div>

      <div className="continue-bar">
        <button className="continue-btn" onClick={handleContinue} disabled={locking}>
          {locking ? 'Locking seats...' : 'Continue →'}
        </button>
      </div>
    </div>
  );
};

export default RoundTripSeatSelection;
