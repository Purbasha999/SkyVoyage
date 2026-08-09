import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchFlights } from '../services/api';
import { useBooking } from '../context/BookingContext';
import FlightCard from '../components/FlightCard';
import './Flights.css';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const FlightResults = () => {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const { selectedOutboundFlight, setSelectedOutboundFlight, selectedReturnFlight, setSelectedReturnFlight } = useBooking();

  const source = urlParams.get('source') || '';
  const destination = urlParams.get('destination') || '';
  const date = urlParams.get('date') || '';
  const passengers = parseInt(urlParams.get('passengers') || '1');
  const tripType = urlParams.get('tripType');
  const returnDate = urlParams.get('returnDate');
  const isRoundTrip = tripType === 'roundtrip';

  const [editData, setEditData] = useState({ date: date || '', passengers: passengers || 1 });
  const [flights, setFlights] = useState([]);
  const [outboundFlights, setOutboundFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('price');

  useEffect(() => { setEditData({ date: date || '', passengers: passengers || 1 }); }, [date, passengers]);

  useEffect(() => {
    if (!source || !destination || !date) return;
    fetchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, destination, date, passengers, isRoundTrip, returnDate]);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError('');
      if (isRoundTrip) {
        const [res1, res2] = await Promise.all([
          searchFlights({ source, destination, date, passengers }),
          searchFlights({ source: destination, destination: source, date: returnDate, passengers })
        ]);
        setOutboundFlights(res1.data.flights || []);
        setReturnFlights(res2.data.flights || []);
      } else {
        const res = await searchFlights({ source, destination, date, passengers });
        setFlights(res.data.flights || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch flights');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOneWay = (flight) => navigate(`/flights/${flight._id}/seats?passengers=${passengers}`);
  const handleSelectOutbound = (flight) => setSelectedOutboundFlight(flight);
  const handleSelectReturn = (flight) => {
    setSelectedReturnFlight(flight);
    navigate(`/round-trip/seats?passengers=${passengers}`);
  };

  const sorted = [...flights].sort((a, b) => {
    if (sortBy === 'price') return (a.dynamicPrice || a.basePrice) - (b.dynamicPrice || b.basePrice);
    if (sortBy === 'duration') return (new Date(a.arrivalTime) - new Date(a.departureTime)) - (new Date(b.arrivalTime) - new Date(b.departureTime));
    if (sortBy === 'departure') return new Date(a.departureTime) - new Date(b.departureTime);
    return 0;
  });

  const buildUpdatedUrl = ({ date: d = editData.date, passengers: p = editData.passengers } = {}) => {
    let url = `/flights?source=${source}&destination=${destination}&passengers=${p}&date=${d}`;
    if (isRoundTrip) url += `&tripType=roundtrip&returnDate=${returnDate}`;
    return url;
  };

  const handleUpdate = () => navigate(buildUpdatedUrl());

  // Passenger count takes effect immediately — no need to also click Update,
  // since a stale count would let you pick a flight that can't actually fit
  // your party.
  const handlePassengersChange = (n) => {
    setEditData(prev => ({ ...prev, passengers: n }));
    navigate(buildUpdatedUrl({ passengers: n }));
  };

  return (
    <div className="page-content flights-page">
      <div className="flights-top-bar section">
        <div className="route-pill">✈ {source} → {destination}</div>
        <div className="field-pill">
          📅
          <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} />
        </div>
        <div className="field-pill">
          👤
          <select value={editData.passengers} onChange={e => handlePassengersChange(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>)}
          </select>
        </div>
        <button className="update-btn" onClick={handleUpdate}>Update</button>
      </div>

      <div className="flights-header">
        <div className="section">
          <div className="flights-breadcrumb">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
          </div>
          <div className="flights-title-row">
            <div>
              <h1 className="flights-title">
                {source} → {destination} {isRoundTrip && <span className="badge badge-blue" style={{ marginLeft: 10, verticalAlign: 'middle' }}>Round Trip</span>}
              </h1>
              <p className="flights-meta">
                {fmtDate(date)}{isRoundTrip ? ` · Return ${fmtDate(returnDate)}` : ''} · {passengers} passenger{passengers > 1 ? 's' : ''}
              </p>
            </div>
            {!isRoundTrip && (
              <div className="sort-bar">
                <span className="sort-label">Sort by:</span>
                {[['price', 'Cheapest'], ['duration', 'Fastest'], ['departure', 'Earliest']].map(([v, l]) => (
                  <button key={v} className={`sort-btn${sortBy === v ? ' active' : ''}`} onClick={() => setSortBy(v)}>{l}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section flights-content">
        {loading ? (
          <div className="flights-loading">
            <div className="spinner spinner-lg" />
            <p>Searching best flights for you...</p>
          </div>
        ) : error ? (
          <div className="no-flights">
            <div className="no-flights-icon">✈️</div>
            <h3>{error}</h3>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Search Again</button>
          </div>
        ) : isRoundTrip ? (
          outboundFlights.length === 0 && returnFlights.length === 0 ? (
            <div className="no-flights">
              <div className="no-flights-icon">✈️</div>
              <h3>No flights found</h3>
              <p>No outbound or return flights available</p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>Search Again</button>
            </div>
          ) : (
            <>
              <h2 className="section-title">Outbound Flights</h2>
              <div className="flight-list">
                {outboundFlights.length === 0 ? (
                  <div className="no-date-warning">❌ No outbound flights on this date</div>
                ) : (
                  outboundFlights.map(f => (
                    <FlightCard key={f._id} flight={f} isSelected={selectedOutboundFlight?._id === f._id} buttonLabel="Select Outbound →" onSelect={() => handleSelectOutbound(f)} />
                  ))
                )}
              </div>

              <h2 className="section-title" style={{ marginTop: 32 }}>Return Flights</h2>
              <div className="flight-list">
                {returnFlights.length === 0 ? (
                  <div className="no-date-warning">❌ No return flights on selected date <br />✅ Try another date</div>
                ) : (
                  returnFlights.map(f => (
                    <FlightCard key={f._id} flight={f} isSelected={selectedReturnFlight?._id === f._id} buttonLabel="Select Return →" onSelect={() => handleSelectReturn(f)} />
                  ))
                )}
              </div>
              {!selectedOutboundFlight && (
                <p style={{ marginTop: 16, fontSize: 13, color: '#854F0B', fontWeight: 600 }}>Select an outbound flight first, then choose a return flight to continue.</p>
              )}
            </>
          )
        ) : sorted.length === 0 ? (
          <div className="no-flights">
            <div className="no-flights-icon">✈️</div>
            <h3>No flights found</h3>
            <p>Try different dates or cities</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Search Again</button>
          </div>
        ) : (
          <div className="flight-list">
            {sorted.map(f => <FlightCard key={f._id} flight={f} onSelect={handleSelectOneWay} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightResults;
