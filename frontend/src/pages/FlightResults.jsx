import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { searchFlights } from '../services/api';
import { useBooking } from '../context/BookingContext';

const fmt = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const duration = (dep, arr) => {
  const mins = (new Date(arr) - new Date(dep)) / 60000;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const airlineColors = {
  'Indigo': '#0e48e9',
  'Air India': '#cb3429',
  'Vistara': '#490da9',
  'Akasa Air': '#b76e2d',
};

const FlightCard = ({ flight, onSelect, selected, buttonLabel }) => {
  const accentColor = airlineColors[flight.airline] || '#0ea5e9';
  return (
    <div className="card fade-in" style={{ padding: 0, overflow: 'hidden', border: selected ? '2px solid #0ea5e9' : '1px solid #e2e8f0' }}>
      <div style={{ height: 4, background: accentColor }} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${accentColor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20
            }}>✈</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{flight.airline}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{flight.flightNumber}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{fmt(flight.departureTime)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{flight.source}</div>
            </div>
            <div style={{ flex: 1, maxWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{duration(flight.departureTime, flight.arrivalTime)}</div>
              <div style={{ height: 2, background: '#e2e8f0', position: 'relative' }} />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Direct</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{fmt(flight.arrivalTime)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{flight.destination}</div>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: 160 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', fontFamily: 'Syne, sans-serif' }}>
              ₹{flight.basePrice.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>per person (base)</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
              <span className={`badge ${flight.availableSeats > 10 ? 'badge-success' : flight.availableSeats > 0 ? 'badge-warning' : 'badge-danger'}`}>
                {flight.availableSeats > 0 ? `${flight.availableSeats} seats left` : 'Sold Out'}
              </span>
            </div>
            <button
              onClick={onSelect}
              disabled={flight.availableSeats === 0}
              className={selected ? 'btn btn-outline' : 'btn btn-primary'}
              style={{ fontSize: 13, padding: '8px 20px' }}
            >
              {selected ? '✓ Selected' : buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FlightResults = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { selectedOutboundFlight, setSelectedOutboundFlight, selectedReturnFlight, setSelectedReturnFlight } = useBooking();

  const source = params.get('source') || '';
  const destination = params.get('destination') || '';
  const date = params.get('date') || '';
  const passengers = params.get('passengers') || 1;
  const tripType = params.get('tripType');
  const returnDate = params.get('returnDate');
  const isRoundTrip = tripType === 'roundtrip';

  const [outboundFlights, setOutboundFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!source || !destination || !date) return;
    setLoading(true);
    setError('');

    if (isRoundTrip) {
      Promise.all([
        searchFlights({ source, destination, date, passengers }),
        searchFlights({ source: destination, destination: source, date: returnDate, passengers })
      ])
        .then(([outRes, retRes]) => {
          setOutboundFlights(outRes.data.flights || []);
          setReturnFlights(retRes.data.flights || []);
        })
        .catch(err => setError(err.response?.data?.message || 'Error fetching flights'))
        .finally(() => setLoading(false));
    } else {
      searchFlights({ source, destination, date, passengers })
        .then(res => setFlights(res.data.flights || []))
        .catch(err => setError(err.response?.data?.message || 'Error fetching flights'))
        .finally(() => setLoading(false));
    }
  }, [source, destination, date, passengers, isRoundTrip, returnDate]);

  const handleSelectOneWay = (flight) => {
    navigate(`/flights/${flight._id}/seats?passengers=${passengers}`);
  };

  const handleSelectOutbound = (flight) => setSelectedOutboundFlight(flight);
  const handleSelectReturn = (flight) => {
    setSelectedReturnFlight(flight);
    navigate(`/round-trip/seats?passengers=${passengers}`);
  };

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link to="/" style={{ color: '#64748b', fontSize: 14 }}>Home</Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>Search Results</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 4 }}>
              {source} <span style={{ color: '#0ea5e9' }}>→</span> {destination}
              {isRoundTrip && <span className="badge badge-info" style={{ marginLeft: 12, verticalAlign: 'middle' }}>Round Trip</span>}
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {fmtDate(date)}{isRoundTrip ? ` · Return ${fmtDate(returnDate)}` : ''} · {passengers} passenger{passengers > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => navigate('/')} className="btn btn-outline" style={{ fontSize: 13 }}>
            Modify Search
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spin" style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b' }}>Searching flights...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {!loading && !error && isRoundTrip && (
        outboundFlights.length === 0 && returnFlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✈️</div>
            <h3 style={{ marginBottom: 8 }}>No flights found</h3>
            <p style={{ color: '#64748b', marginBottom: 24 }}>No outbound or return flights available for this route.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">Try Different Dates</button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Outbound · {fmtDate(date)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              {outboundFlights.length === 0
                ? <p style={{ color: '#64748b' }}>No outbound flights on this date.</p>
                : outboundFlights.map(f => (
                    <FlightCard
                      key={f._id}
                      flight={f}
                      selected={selectedOutboundFlight?._id === f._id}
                      buttonLabel="Select Outbound"
                      onSelect={() => handleSelectOutbound(f)}
                    />
                  ))
              }
            </div>

            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Return · {fmtDate(returnDate)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {returnFlights.length === 0
                ? <p style={{ color: '#64748b' }}>No return flights on this date. Try another date.</p>
                : returnFlights.map(f => (
                    <FlightCard
                      key={f._id}
                      flight={f}
                      selected={selectedReturnFlight?._id === f._id}
                      buttonLabel="Select Return"
                      onSelect={() => handleSelectReturn(f)}
                    />
                  ))
              }
            </div>

            {!selectedOutboundFlight && (
              <p style={{ marginTop: 20, fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>Select an outbound flight first, then choose a return flight to continue.</p>
            )}
          </div>
        )
      )}

      {!loading && !error && !isRoundTrip && (
        flights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✈️</div>
            <h3 style={{ marginBottom: 8 }}>No flights found</h3>
            <p style={{ color: '#64748b', marginBottom: 24 }}>No flights available for this route and date combination.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">Try Different Dates</button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
              {flights.length} flight{flights.length > 1 ? 's' : ''} found
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {flights.map(f => (
                <FlightCard key={f._id} flight={f} buttonLabel="Select Seats" onSelect={() => handleSelectOneWay(f)} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default FlightResults;
