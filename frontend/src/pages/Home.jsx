import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CITIES from '../constants/cities';

const Home = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    source: 'DEL', destination: 'BOM', date: tomorrow, passengers: 1
  });
  const [error, setError] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (form.source === form.destination) {
      setError('Source and destination cannot be the same.');
      return;
    }
    setError('');
    navigate(`/flights?source=${form.source}&destination=${form.destination}&date=${form.date}&passengers=${form.passengers}`);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const popularDestinations = [
            {
              code: 'BOM', name: 'Mumbai', tagline: 'City of Dreams',
              img: 'https://images.unsplash.com/photo-1660145416818-b9a2b1a1f193?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
            },
            {
              code: 'DEL', name: 'Delhi', tagline: 'Heart of India',
              img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
            },
            {
              code: 'BLR', name: 'Bangalore', tagline: 'Silicon Valley of India',
              img: 'https://images.unsplash.com/photo-1698332137428-3c4296198e8f?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFuZ2Fsb3JlfGVufDB8fDB8fHww'
            },
            {
              code: 'CCU', name: 'Kolkata', tagline: 'City of Joy',
              img: 'https://plus.unsplash.com/premium_photo-1697730414399-3d4d9ada98bd?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
            },
            {
              code: 'MAA', name: 'Chennai', tagline: 'Gateway to the South',
              img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2hlbm5haXxlbnwwfHwwfHx8MA%3D%3D'
            },
          ]

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0ea5e9 100%)',
        padding: '70px 24px 120px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(14,165,233,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(14,165,233,0.08)', pointerEvents: 'none' }} />

        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', marginBottom: 10 }}>
              <span style={{ fontSize: 25, color: '#7dd3fc', fontWeight: 500 }}>Welcome to SkyVoyage</span>
            </div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(36px, 5vw, 60px)', color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
              Book Smarter.<br />
              <span style={{ color: '#38bdf8' }}>Fly Better.</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 440, margin: '0 auto' }}>
              Real-time seat selection, dynamic pricing, and instant confirmations.
            </p>
          </div>

          {/* Search Form */}
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="card" style={{ padding: 28, borderRadius: 20 }}>
              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSearch}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</label>
                    <select name="source" value={form.source} onChange={handleChange} style={selectStyle}>
                      {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
                    <select name="destination" value={form.destination} onChange={handleChange} style={selectStyle}>
                      {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                    <input type="date" name="date" value={form.date} min={today} onChange={handleChange} style={selectStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passengers</label>
                    <select name="passengers" value={form.passengers} onChange={handleChange} style={selectStyle}>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: 12, justifyContent: 'center' }}>
                   Search Flights
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Destinations */}
      <div className="container" style={{ padding: '60px 24px' }}>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Popular Destinations</h2>
        <p style={{ color: '#64748b', marginBottom: 32 }}>Explore India's most loved cities</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {popularDestinations.map((city) => (
            <button
              key={city.code}
              onClick={() => navigate(`/flights?destination=${city.code}&date=${tomorrow}&passengers=1`)}
              style={{
                position: 'relative', height: 200, borderRadius: 16,
                overflow: 'hidden', border: 'none', cursor: 'pointer',
                padding: 0, fontFamily: 'inherit',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            >
              <img
                src={city.img}
                alt={city.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.style.display = 'none'; e.target.parentElement.style.background = '#1e3a5f'; }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
              }} />

              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '16px',
                textAlign: 'left',
              }}>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 18, fontFamily: 'Syne, sans-serif', lineHeight: 1.2 }}>
                  {city.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                  {city.tagline}
                </div>
              </div>

              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8, padding: '3px 8px',
                color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em'
              }}>
                {city.code}
              </div>
            </button>
          ))}
        </div>
      </div>
      
    </div>
  );
};

const selectStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  fontSize: 14, color: '#0f172a', outline: 'none',
  transition: 'border-color 0.2s'
};

export default Home;