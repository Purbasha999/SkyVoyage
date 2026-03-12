import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { searchFlights } from '../services/api';

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

const FlightResults = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const source = params.get('source') || '';
  const destination = params.get('destination') || '';
  const date = params.get('date') || '';
  const passengers = params.get('passengers') || 1;

  useEffect(() => {
    if (!source || !destination || !date) return;
    setLoading(true);
    searchFlights({ source, destination, date, passengers })
      .then(res => setFlights(res.data.flights || []))
      .catch(err => setError(err.response?.data?.message || 'Error fetching flights'))
      .finally(() => setLoading(false));
  }, [source, destination, date, passengers]);

  const airlineColors = {
    'Indigo': '#0e48e9',
    'Air India': '#cb3429',
    'Vistara': '#490da9',
    'Akasa Air': '#b76e2d',
  };

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      {/* Header */}
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
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {fmtDate(date)} · {passengers} passenger{passengers > 1 ? 's' : ''}
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>Error</div>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {!loading && !error && flights.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✈️</div>
          <h3 style={{ marginBottom: 8 }}>No flights found</h3>
          <p style={{ color: '#64748b', marginBottom: 24 }}>No flights available for this route and date combination.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">Try Different Dates</button>
        </div>
      )}

      {!loading && flights.length > 0 && (
        <div>
          <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
            {flights.length} flight{flights.length > 1 ? 's' : ''} found
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {flights.map(flight => {
              const accentColor = airlineColors[flight.airline] || '#0ea5e9';
              return (
                <div key={flight._id} className="card fade-in" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <div style={{ height: 4, background: accentColor }} />
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                      {/* Airline & flight number */}
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

                      {/* Route & timing */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{fmt(flight.departureTime)}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{flight.source}</div>
                        </div>
                        <div style={{ flex: 1, maxWidth: 120, textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{duration(flight.departureTime, flight.arrivalTime)}</div>
                          <div style={{ height: 2, background: '#e2e8f0', position: 'relative' }}>
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Direct</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{fmt(flight.arrivalTime)}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{flight.destination}</div>
                        </div>
                      </div>

                      {/* Price & seats */}
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
                          onClick={() => navigate(`/flights/${flight._id}/seats?passengers=${passengers}`)}
                          disabled={flight.availableSeats === 0}
                          className="btn btn-primary"
                          style={{ fontSize: 13, padding: '8px 20px' }}
                        >
                          Select Seats
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightResults;
