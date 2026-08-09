import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CITIES from '../constants/cities';
import { useBooking } from '../context/BookingContext';
import './Home.css';

const cityName = (code) => CITIES.find(c => c.code === code)?.name || code;

const DEALS = [
  { from: 'BOM', to: 'GOI', price: '₹2,500', tag: 'Flash Sale', color: 'linear-gradient(135deg,#1a3a6e,#2d7dd2)' },
  { from: 'DEL', to: 'BLR', price: '₹3,800', tag: 'Weekend Deal', color: 'linear-gradient(135deg,#0f4c75,#1b6ca8,#44b3c4)' },
  { from: 'MAA', to: 'HYD', price: '₹2,800', tag: 'Monsoon Fare', color: 'linear-gradient(135deg,#1d5c63,#0f8b8d,#6bc5c7)' },
  { from: 'CCU', to: 'BOM', price: '₹5,500', tag: 'Early Bird', color: 'linear-gradient(135deg,#4a1060,#7b1fa2,#ce93d8)' },
  { from: 'DEL', to: 'GOI', price: '₹6,100', tag: 'Holiday Saver', color: 'linear-gradient(135deg,#b5451b,#e07a5f,#f4a261)' },
];

const PROMOS = [
  { title: 'Student Special', sub: 'Exclusively on SkyVoyage web & app', perks: [['10%', 'Off with STUDENT10'], ['Zero', 'Change fee'], ['24/7', 'Support']], color: '#185FA5' },
  { title: 'Early Bird Offer', sub: 'Book ahead and save big', perks: [['₹500', 'Instant savings with FLY500'], ['Free', 'Seat selection'], ['2x', 'Reward points']], color: '#0F6E56' },
  { title: 'SkyVoyage Plus', sub: 'Perks for frequent flyers', perks: [['15%', 'Off with WELCOME15'], ['Priority', 'Boarding'], ['Lounge', 'Access']], color: '#5C1AAB' },
];

const DESTINATIONS = [
  { code: 'BOM', name: 'Mumbai', image: 'https://images.unsplash.com/photo-1666843527155-14ec5f016802?w=1600&auto=format&fit=crop&q=60', price: '₹2,500' },
  { code: 'DEL', name: 'Delhi', image: 'https://images.unsplash.com/photo-1597040663342-45b6af3d91a5?w=1600&auto=format&fit=crop&q=60', price: '₹3,800', isNew: true },
  { code: 'GOI', name: 'Goa', image: 'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=1600&auto=format&fit=crop&q=60', price: '₹2,500' },
  { code: 'BLR', name: 'Bangalore', image: 'https://images.unsplash.com/photo-1698332137428-3c4296198e8f?w=1600&auto=format&fit=crop&q=60', price: '₹3,800', isNew: true },
  { code: 'HYD', name: 'Hyderabad', image: 'https://images.unsplash.com/photo-1657981630164-769503f3a9a8?w=1600&auto=format&fit=crop&q=60', price: '₹2,800' },
  { code: 'MAA', name: 'Chennai', image: 'https://plus.unsplash.com/premium_photo-1697730420879-dc2a8dbaa31f?w=1600&auto=format&fit=crop&q=60', price: '₹2,800' },
  { code: 'CCU', name: 'Kolkata', image: 'https://images.unsplash.com/photo-1589041127168-9b1915731dc3?w=1600&auto=format&fit=crop&q=60', price: '₹5,500', isNew: true },
];

const Home = () => {
  const navigate = useNavigate();
  const { setRoundTripSearch } = useBooking();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  const [tripType, setTripType] = useState('oneway');
  const [form, setForm] = useState({ source: 'DEL', destination: 'BOM', date: tomorrow, returnDate: dayAfter, passengers: 1 });
  const [error, setError] = useState('');
  const [promoIdx, setPromoIdx] = useState(0);

  const handleSearch = (e) => {
    e.preventDefault();
    if (form.source === form.destination) {
      setError('Source and destination cannot be the same.');
      return;
    }
    if (tripType === 'roundtrip' && form.returnDate < form.date) {
      setError('Return date must be on or after the departure date.');
      return;
    }
    setError('');

    if (tripType === 'roundtrip') {
      setRoundTripSearch({ source: form.source, destination: form.destination, date: form.date, returnDate: form.returnDate, passengers: form.passengers });
      navigate(`/flights?source=${form.source}&destination=${form.destination}&date=${form.date}&returnDate=${form.returnDate}&passengers=${form.passengers}&tripType=roundtrip`);
    } else {
      navigate(`/flights?source=${form.source}&destination=${form.destination}&date=${form.date}&passengers=${form.passengers}`);
    }
  };

  const swap = () => setForm(f => ({ ...f, source: f.destination, destination: f.source }));
  const quickSearch = (from, to) => navigate(`/flights?source=${from}&destination=${to}&date=${tomorrow}&passengers=1`);

  const promo = PROMOS[promoIdx];

  return (
    <div className="sky-page home-page">
      <div className="clouds-wrap">
        <div className="cloud c1" style={{ left: '3%' }} />
        <div className="cloud c2" style={{ left: '55%' }} />
        <div className="cloud c3" style={{ left: '25%' }} />
        <div className="cloud c4" style={{ left: '75%' }} />
        <div className="cloud c5" style={{ left: '10%' }} />
        <div className="cloud c6" style={{ left: '40%' }} />
      </div>

      {/* Hero */}
      <div className="home-hero">
        <div className="hero-badge-pill">✈ Smart Flight Booking</div>
        <h1 className="hero-heading">Book <span>Smarter</span>,<br />Fly Better</h1>
        <p className="hero-sub">Real-time seat selection · Dynamic pricing · Instant confirmation</p>
      </div>

      {/* Search Card */}
      <div className="search-card-wrap">
        <div className="card-glass search-card">
          <div className="trip-tabs">
            {['oneway', 'roundtrip'].map(t => (
              <button key={t} className={`trip-tab${tripType === t ? ' active' : ''}`} onClick={() => setTripType(t)}>
                {t === 'oneway' ? 'One Way' : 'Round Trip'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-400)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16, color: 'var(--red-600)', fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <label className="form-label">From</label>
              <select className="form-input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <button type="button" className="swap-btn" onClick={swap} title="Swap">⇄</button>
            <div className="form-group">
              <label className="form-label">To</label>
              <select className="form-input" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}>
                {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Departure</label>
              <input className="form-input" type="date" min={today} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            {tripType === 'roundtrip' && (
              <div className="form-group">
                <label className="form-label">Return</label>
                <input className="form-input" type="date" min={form.date || today} value={form.returnDate} onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Passengers</label>
              <select className="form-input" value={form.passengers} onChange={e => setForm(f => ({ ...f, passengers: parseInt(e.target.value) }))}>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-lg search-submit">Search Flights</button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        {[['16+', 'Routes'], ['7', 'Cities'], ['0%', 'Booking Fees'], ['10 min', 'Seat Lock']].map(([n, l]) => (
          <div key={l} className="stat-item">
            <div className="stat-num">{n}</div>
            <div className="stat-label">{l}</div>
          </div>
        ))}
      </div>

      <div className="home-sections">
        {/* Hot Deals */}
        <div className="section" id="deals">
          <div className="section-header">
            <div className="section-title">Hot Deals</div>
          </div>
          <div className="deals-scroll">
            {DEALS.map((deal, i) => (
              <div key={i} className="deal-card" style={{ background: deal.color }}>
                <span className="deal-tag">{deal.tag}</span>
                <div className="deal-route">{cityName(deal.from)} → {cityName(deal.to)}</div>
                <div className="deal-bottom">
                  <div>
                    <div className="deal-from">from</div>
                    <div className="deal-price">{deal.price}</div>
                  </div>
                  <button className="deal-btn" onClick={() => quickSearch(deal.from, deal.to)}>Book Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Destinations */}
        <div className="section">
          <div className="section-header">
            <div className="section-title">Popular Destinations</div>
          </div>
          <div className="dest-row">
            {DESTINATIONS.map(d => (
              <div key={d.code} className="dest-card" onClick={() => setForm(f => ({ ...f, destination: d.code }))}>
                <div className="dest-circle">
                  <img src={d.image} alt={d.name} />
                  {d.isNew && <span className="dest-new">New</span>}
                </div>
                <div className="dest-name">{d.name}</div>
                <div className="dest-price">{d.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Promo Banner */}
        <div className="section">
          <div className="promo-banner" style={{ background: promo.color }}>
            <div className="promo-left">
              <div className="promo-kicker">✦ Limited Time Offer</div>
              <div className="promo-title">{promo.title}</div>
              <div className="promo-sub">{promo.sub}</div>
              <div className="promo-perks">
                {promo.perks.map(([val, label]) => (
                  <div key={label} className="promo-perk">
                    <span className="perk-val">{val}</span>
                    <span className="perk-label">{label}</span>
                  </div>
                ))}
              </div>
              <button className="btn promo-btn" onClick={() => navigate('/payment')}>Claim Offer</button>
            </div>
            <div className="promo-dots">
              {PROMOS.map((_, i) => (
                <div key={i} className={`pdot${promoIdx === i ? ' active' : ''}`} onClick={() => setPromoIdx(i)} />
              ))}
            </div>
          </div>
        </div>

        {/* Why SkyVoyage */}
        <div className="section why-section">
          <div className="section-header">
            <div className="section-title">Why SkyVoyage?</div>
          </div>
          <div className="features-grid">
            {[
              ['/passenger.png', 'Smart Seat Selection', 'Choose window, aisle, or extra legroom with live availability', '#E6F1FB'],
              ['/flying-money.png', 'Best Price Guarantee', 'Dynamic pricing engine finds the sharpest fares on every route', '#E1F5EE'],
              ['/padlock.png', 'Instant Seat Lock', 'Seats lock the moment you select — no race conditions, ever', '#FAEEDA'],
              ['/cancel.png', 'Easy Cancellations', 'Cancel or modify bookings anytime with zero hassle', '#FAECE7'],
            ].map(([icon, title, desc, bg]) => (
              <div key={title} className="feature-card">
                <div className="feature-icon" style={{ background: bg }}><img src={icon} alt={title} className="feature-img" /></div>
                <div className="feature-title">{title}</div>
                <div className="feature-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="home-footer">
        <div className="footer-logo">
          <span className="footer-logo-icon">✈</span> SkyVoyage
        </div>
        <div className="footer-links">
          <a href="#deals">Deals</a>
          <a href="#!">Privacy</a>
          <a href="#!">Terms</a>
          <a href="#!">Contact</a>
        </div>
        <p className="footer-copy">© 2026 SkyVoyage · Smart Flight Booking</p>
      </footer>
    </div>
  );
};

export default Home;
