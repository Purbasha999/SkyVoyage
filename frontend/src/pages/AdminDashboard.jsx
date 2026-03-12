import React, { useState, useEffect } from 'react';
import {
  adminGetStats, adminGetAllBookings, getAllFlights,
  adminCreateFlight, adminDeleteFlight, adminGetPricingRules,
  adminCreatePricingRule, adminDeletePricingRule
} from '../services/api';
import CITIES from '../constants/cities';
import FlightIcon from '@mui/icons-material/Flight';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import PersonIcon from '@mui/icons-material/Person';
import CancelPresentationIcon from '@mui/icons-material/CancelPresentation';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import BarChartIcon from '@mui/icons-material/BarChart';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const AdminDashboard = () => {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [flights, setFlights] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [newFlight, setNewFlight] = useState({
    flightNumber: '', airline: '', source: '', destination: '',
    departureTime: '', arrivalTime: '', basePrice: '', rows: 30, columns: 6
  });

  const [newRule, setNewRule] = useState({
    name: '', type: 'DEMAND', charge: '',
    condition: { threshold: '', hoursBeforeDeparture: '', seatType: '' }
  });

  useEffect(() => {
    Promise.all([
      adminGetStats().then(r => setStats(r.data.stats)),
      adminGetAllBookings().then(r => setBookings(r.data.bookings || [])),
      getAllFlights().then(r => setFlights(r.data.flights || [])),
      adminGetPricingRules().then(r => setRules(r.data.rules || []))
    ]).finally(() => setLoading(false));
  }, []);

  const handleCreateFlight = async (e) => {
    e.preventDefault();
    try {
      await adminCreateFlight(newFlight);
      const r = await getAllFlights();
      setFlights(r.data.flights);
      setStats(prev => ({ ...prev, totalFlights: prev.totalFlights + 1 }));
      setMsg('Flight created successfully!');
      setNewFlight({ flightNumber: '', airline: '', source: '', destination: '', departureTime: '', arrivalTime: '', basePrice: '', rows: 10, columns: 6 });
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Error: ' + (err.response?.data?.message || 'Failed'));
    }
  };

  const handleDeleteFlight = async (id) => {
    if (!window.confirm('Delete this flight and all its seats and bookings?')) return;
    await adminDeleteFlight(id);
    const affectedBookings = bookings.filter(b => b.flightId?._id === id);

    setFlights(prev => prev.filter(f => f._id !== id));
    setBookings(prev => prev.map(b => b.flightId?._id === id ? { ...b, status: "CANCELLED" } : b));

    setStats(prev => ({ 
      ...prev, 
      totalFlights: prev.totalFlights - 1, 
      totalBookings: prev.totalBookings - affectedBookings.length, 
      cancelledBookings: prev.cancelledBookings + affectedBookings.length,
      totalRevenue: prev.totalRevenue - (affectedBookings.reduce((sum, b) => sum + (b.priceBreakdown?.finalPrice || 0), 0))
    }));

    setMsg('Flight deleted.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await adminCreatePricingRule(newRule);
      const r = await adminGetPricingRules();
      setRules(r.data.rules);
      setMsg('Pricing rule created!');
      setNewRule({ name: '', type: 'DEMAND', charge: '', condition: { threshold: '', hoursBeforeDeparture: '', seatType: '' } });
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Error: ' + (err.response?.data?.message || 'Failed'));
    }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const inputS = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none' };
  const labelS = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' };

  const tabConfig = {
    overview: { label: 'Overview', icon: <BarChartIcon style={{ fontSize: 18 }} /> },
    flights:  { label: 'Flights',  icon: <FlightIcon style={{ fontSize: 18 }} /> },
    bookings: { label: 'Bookings', icon: <AirplaneTicketIcon style={{ fontSize: 18 }} /> },
    pricing:  { label: 'Pricing',  icon: <CurrencyRupeeIcon style={{ fontSize: 18 }} /> },
  };

  if (loading) {
  return (
    <div style={{
      height: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 12
    }}>
      <div className="spinner"></div>
      <p style={{ color: "#64748b" }}>Loading dashboard...</p>
    </div>
  );
}

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AdminPanelSettingsIcon style={{ fontSize: 32, color: '#0ea5e9' }} /> Admin Dashboard
          </h1>
          <p style={{ color: '#64748b' }}>Manage flights, bookings, and pricing rules</p>
        </div>
      </div>

      {msg && (
        <div className="fade-in" style={{ background: msg.startsWith('Error') ? '#fee2e2' : '#d1fae5', border: '1px solid', borderColor: msg.startsWith('Error') ? '#fca5a5' : '#6ee7b7', borderRadius: 10, padding: '10px 20px', marginBottom: 20, color: msg.startsWith('Error') ? '#991b1b' : '#065f46', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 28 }}>
        {Object.entries(tabConfig).map(([key, { label, icon }]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: tab === key ? '#0ea5e9' : '#64748b',
            borderBottom: `3px solid ${tab === key ? '#0ea5e9' : 'transparent'}`,
            marginBottom: -2, transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Flights', value: stats.totalFlights, icon: <FlightIcon />, color: '#0ea5e9' },
              { label: 'Confirmed Bookings', value: stats.totalBookings, icon: <AirplaneTicketIcon />, color: '#0ea5e9' },
              { label: 'Registered Users', value: stats.totalUsers, icon: <PersonIcon />, color: '#0ea5e9' },
              { label: 'Cancelled', value: stats.cancelledBookings, icon: <CancelPresentationIcon />, color: '#0ea5e9' },
              { label: 'Total Revenue', value: `₹${stats.totalRevenue?.toLocaleString('en-IN')}`, icon: <CurrencyRupeeIcon />, color: '#0ea5e9' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: 20, borderTop: `4px solid ${s.color}` }}>
                <div style={{ marginBottom: 8, color: s.color, display: 'flex' }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Recent Bookings</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['Reference', 'Passenger', 'Flight Number', 'Route', 'Seat', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 10).map(b => (
                    <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0ea5e9' }}>{b.bookingReference}</td>
                      <td style={{ padding: '10px 12px' }}>{b.passengerName}</td>
                      <td style={{ padding: '10px 12px' }}>{b.flightId?.flightNumber || 'Deleted'}</td>
                      <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                        {b.flightId ? `${b.flightId.source} → ${b.flightId.destination}` : "-"}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{b.seatNumber}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>₹{b.priceBreakdown?.finalPrice?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-success' : b.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Flights */}
      {tab === 'flights' && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Flight List */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>All Flights ({flights.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {flights.map(f => (
                <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.flightNumber} · {f.airline}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{f.source} → {f.destination} · {fmt(f.departureTime)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: '#0ea5e9' }}>₹{f.basePrice.toLocaleString('en-IN')}</span>
                    <button onClick={() => handleDeleteFlight(f._id)} className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}><DeleteIcon style={{ fontSize: 14 }} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Flight Form */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Add New Flight</h3>
            <form onSubmit={handleCreateFlight} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'flightNumber', label: 'Flight Number', placeholder: 'FW601' },
                { key: 'airline', label: 'Airline', placeholder: 'Indigo' },
                { key: 'basePrice', label: 'Base Price (₹)', placeholder: '4500', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label style={labelS}>{field.label}</label>
                  <input type={field.type || 'text'} placeholder={field.placeholder} value={newFlight[field.key]} required
                    onChange={e => setNewFlight({ ...newFlight, [field.key]: e.target.value })} style={inputS} />
                </div>
              ))}
              <div>
                <label style={labelS}>From</label>
                <select value={newFlight.source} required onChange={e => setNewFlight({ ...newFlight, source: e.target.value })} style={inputS}>
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>To</label>
                <select value={newFlight.destination} required onChange={e => setNewFlight({ ...newFlight, destination: e.target.value })} style={inputS}>
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Departure Time</label>
                <input type="datetime-local" value={newFlight.departureTime} required onChange={e => setNewFlight({ ...newFlight, departureTime: e.target.value })} style={inputS} />
              </div>
              <div>
                <label style={labelS}>Arrival Time</label>
                <input type="datetime-local" value={newFlight.arrivalTime} required onChange={e => setNewFlight({ ...newFlight, arrivalTime: e.target.value })} style={inputS} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelS}>Rows</label>
                  <input type="number" value={newFlight.rows} min={15} max={60} onChange={e => setNewFlight({ ...newFlight, rows: e.target.value })} style={inputS} />
                </div>
                <div>
                  <label style={labelS}>Columns</label>
                  <input type="number" value={newFlight.columns} min={4} max={8} onChange={e => setNewFlight({ ...newFlight, columns: e.target.value })} style={inputS} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AddIcon style={{ fontSize: 18 }} /> Create Flight
              </button>
            </form>
          </div>
        </div>
      )}

      {/* All Bookings */}
      {tab === 'bookings' && (
        <div className="card fade-in" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>All Bookings ({bookings.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Reference', 'Passenger', 'Flight Number', 'Route', 'Date', 'Seat', 'Amount', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0ea5e9', whiteSpace: 'nowrap' }}>{b.bookingReference}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{b.passengerName}</td>
                    <td style={{ padding: '10px 12px' }}>{b.flightId?.flightNumber || 'Deleted'}</td>
                    <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                      {b.flightId ? `${b.flightId.source} → ${b.flightId.destination}` : "-"}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{b.flightId ? fmt(b.flightId.departureTime) : '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{b.seatNumber}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>₹{b.priceBreakdown?.finalPrice?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-success' : b.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing Rules */}
      {tab === 'pricing' && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Active Pricing Rules</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rules.map(rule => (
                <div key={rule._id} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{rule.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{rule.type} · {rule.description}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      Condition: {JSON.stringify(rule.condition)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, color: '#f59e0b', fontFamily: 'Syne, sans-serif', fontSize: 16 }}>+₹{rule.charge}</span>
                    <span className={`badge ${rule.isActive ? 'badge-success' : 'badge-danger'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span>
                    <button onClick={async () => { await adminDeletePricingRule(rule._id); setRules(rules.filter(r => r._id !== rule._id)); }} className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}><DeleteIcon style={{ fontSize: 14 }} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Add Pricing Rule */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Add Pricing Rule</h3>
            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelS}>Rule Name</label>
                <input value={newRule.name} required onChange={e => setNewRule({ ...newRule, name: e.target.value })} placeholder="High Demand Surcharge" style={inputS} />
              </div>
              <div>
                <label style={labelS}>Type</label>
                <select value={newRule.type} onChange={e => setNewRule({ ...newRule, type: e.target.value })} style={inputS}>
                  <option value="DEMAND">DEMAND</option>
                  <option value="TIME">TIME</option>
                  <option value="SEAT_TYPE">SEAT_TYPE</option>
                </select>
              </div>
              {newRule.type === 'DEMAND' && (
                <div>
                  <label style={labelS}>Occupancy Threshold (%)</label>
                  <input type="number" value={newRule.condition.threshold} onChange={e => setNewRule({ ...newRule, condition: { ...newRule.condition, threshold: e.target.value } })} placeholder="70" style={inputS} />
                </div>
              )}
              {newRule.type === 'TIME' && (
                <div>
                  <label style={labelS}>Hours Before Departure</label>
                  <input type="number" value={newRule.condition.hoursBeforeDeparture} onChange={e => setNewRule({ ...newRule, condition: { ...newRule.condition, hoursBeforeDeparture: e.target.value } })} placeholder="48" style={inputS} />
                </div>
              )}
              {newRule.type === 'SEAT_TYPE' && (
                <div>
                  <label style={labelS}>Seat Type</label>
                  <select value={newRule.condition.seatType} onChange={e => setNewRule({ ...newRule, condition: { ...newRule.condition, seatType: e.target.value } })} style={inputS}>
                    <option value="WINDOW">WINDOW</option>
                    <option value="MIDDLE">MIDDLE</option>
                    <option value="AISLE">AISLE</option>
                    <option value="MIDDLE">BUSINESS</option>
                    <option value="MIDDLE">ECONOMY</option>
                  </select>
                </div>
              )}
              <div>
                <label style={labelS}>Surcharge (₹)</label>
                <input type="number" value={newRule.charge} required onChange={e => setNewRule({ ...newRule, charge: e.target.value })} placeholder="1000" style={inputS} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AddIcon style={{ fontSize: 18 }} /> Add Rule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;