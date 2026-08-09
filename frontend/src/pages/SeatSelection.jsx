import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SeatMap from '../components/SeatMap';
import { getFlightById, getFlightPrice, lockSeats, releaseSeats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './SeatSelection.css';

const fmt = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDur = (dep, arr) => {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const SeatSelection = () => {
  const { id: flightId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const passengers = parseInt(searchParams.get('passengers') || 1);

  const [flight, setFlight] = useState(null);
  const [selectedSeatNums, setSelectedSeatNums] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getFlightById(flightId).then(res => setFlight(res.data.flight)).catch(() => setError('Failed to load flight'));
  }, [flightId]);

  const selectedRef = useRef([]);
  const proceededRef = useRef(false);
  useEffect(() => { selectedRef.current = selectedSeatNums; }, [selectedSeatNums]);
  useEffect(() => () => {
    if (!proceededRef.current && selectedRef.current.length > 0) {
      releaseSeats({ flightId, seatNumbers: selectedRef.current }).catch(() => {});
    }
  }, [flightId]);

  const handleSeatsSelected = async (seatNums) => {
    setSelectedSeatNums(seatNums);
    setError('');
    if (seatNums.length === 0) { setPricing(null); return; }
    try {
      setLoadingPrice(true);
      const res = await getFlightPrice(flightId, { seatNumbers: seatNums, passengers: seatNums.length });
      setPricing(res.data.priceBreakdown);
    } catch {
      setError('Failed to calculate price');
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleContinue = async () => {
    if (selectedSeatNums.length < passengers) {
      setError(`Please select ${passengers} seat(s)`);
      return;
    }
    setLocking(true);
    try {
      const res = await lockSeats({ flightId, seatNumbers: selectedSeatNums });
      proceededRef.current = true;
      navigate('/booking-summary', {
        state: { flight, seatNumbers: selectedSeatNums, priceBreakdown: pricing, lockExpiry: res.data.lockExpiry }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Seats not available anymore');
      setSelectedSeatNums([]);
      setPricing(null);
    } finally {
      setLocking(false);
    }
  };

  if (!flight) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        {error ? <p style={{ color: 'var(--red-600)' }}>{error}</p> : <div className="spinner spinner-lg" />}
      </div>
    );
  }

  const pb = pricing || {};
  const surchargeEntries = (pb.appliedRules || []).map(r => [r.name, r.charge]);

  return (
    <div className="page-content seats-page">
      <div className="seats-header">
        <div className="section">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back to Results</button>
          <h1 className="seats-title">Select Your Seats</h1>
          <p className="seats-meta">Select {passengers} seat{passengers > 1 ? 's' : ''} for your journey</p>
        </div>
      </div>

      <div className="section seats-layout">
        <div className="seats-map-col">
          <div className="card seats-map-card">
            <div className="card-inner-header">
              <h3>Cabin View</h3>
              <span className="badge badge-blue">{flight.flightNumber}</span>
            </div>
            <SeatMap key={passengers} flightId={flight._id} maxSeats={passengers} onSeatsSelected={handleSeatsSelected} userId={user?.id || user?._id} />
          </div>
        </div>

        <div className="seats-info-col">
          <div className="card seats-flight-card">
            <div className="sfc-airline-badge">{flight.airline}</div>
            <div className="sfc-route">
              <div className="sfc-city">
                <div className="sfc-time">{fmt(flight.departureTime)}</div>
                <div className="sfc-code">{flight.source}</div>
              </div>
              <div className="sfc-mid">
                <div className="sfc-dur">{fmtDur(flight.departureTime, flight.arrivalTime)}</div>
                <div className="sfc-arrow">✈</div>
                <div className="sfc-nonstop">Non-stop</div>
              </div>
              <div className="sfc-city right">
                <div className="sfc-time">{fmt(flight.arrivalTime)}</div>
                <div className="sfc-code">{flight.destination}</div>
              </div>
            </div>
            <div className="sfc-airline-name">{flight.flightNumber}</div>
          </div>

          {error && (
            <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13 }}>{error}</div>
          )}

          <div className="card price-card">
            <h3 className="price-card-title">
              Price Breakdown
              {loadingPrice && <span className="price-fetching-badge">Updating…</span>}
            </h3>

            {selectedSeatNums.length === 0 ? (
              <p className="price-hint">Select a seat to see pricing</p>
            ) : (
              <div className="price-rows">
                <div className="price-row">
                  <span>Base fare ({selectedSeatNums.length}/{passengers} seat{passengers > 1 ? 's' : ''})</span>
                  <span>₹{(pb.basePrice || 0).toLocaleString('en-IN')}</span>
                </div>
                {surchargeEntries.map(([name, charge]) => (
                  <div className="price-row surcharge" key={name}>
                    <span>{name}</span>
                    <span>+₹{charge.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="price-row">
                  <span>Taxes &amp; GST (18%)</span>
                  <span>₹{(pb.taxes || 0).toLocaleString('en-IN')}</span>
                </div>
                <hr className="divider" />
                <div className="price-row total">
                  <span>Total {selectedSeatNums.length < passengers ? '(so far)' : ''}</span>
                  <span>₹{(pb.finalPrice || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-lg btn-full" onClick={handleContinue} disabled={selectedSeatNums.length < passengers || locking}>
            {locking ? 'Locking seats...' : 'Continue to Booking →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
