import React, { useEffect, useState } from 'react';
import {
  getAllFlights, adminCreateFlight, adminUpdateFlight, adminDeleteFlight,
  adminGetAllBookings, adminGetStats,
  adminGetPricingRules, adminCreatePricingRule, adminUpdatePricingRule, adminDeletePricingRule
} from '../services/api';
import CITIES from '../constants/cities';
import './AdminDashboard.css';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const RULE_TYPE_META = {
  DEMAND: { label: 'High Demand', icon: '📈', badge: 'badge-amber' },
  TIME: { label: 'Last Minute', icon: '⏰', badge: 'badge-red' },
  SEAT_TYPE: { label: 'Seat Type', icon: '💺', badge: 'badge-blue' },
  CLASS: { label: 'Cabin Class', icon: '🎫', badge: 'badge-blue' },
};

const conditionSummary = (rule) => {
  switch (rule.type) {
    case 'DEMAND': return `Occupancy ≥ ${rule.condition?.threshold}%`;
    case 'TIME': return `Within ${rule.condition?.hoursBeforeDeparture}h of departure`;
    case 'SEAT_TYPE': return rule.condition?.seatType ? `Seat type: ${rule.condition.seatType}` : `Cabin: ${rule.condition?.seatClass}`;
    case 'CLASS': return `Cabin class: ${rule.condition?.class}`;
    default: return '—';
  }
};

const INITIAL_FLIGHT_FORM = { flightNumber: '', airline: '', source: '', destination: '', departureTime: '', arrivalTime: '', basePrice: '', rows: 10, columns: 6 };
const INITIAL_RULE_FORM = { name: '', description: '', type: 'DEMAND', charge: '', isActive: true, threshold: '', hoursBeforeDeparture: '', seatType: 'WINDOW', class: 'ECONOMY' };

const AdminDashboard = () => {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [showAddFlight, setShowAddFlight] = useState(false);
  const [flightForm, setFlightForm] = useState(INITIAL_FLIGHT_FORM);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [rules, setRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState(INITIAL_RULE_FORM);
  const [editRuleId, setEditRuleId] = useState(null);

  useEffect(() => {
    loadStats();
    if (tab === 'flights') loadFlights();
    if (tab === 'bookings') loadBookings();
    if (tab === 'pricing') loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const loadStats = async () => {
    try { const res = await adminGetStats(); setStats(res.data.stats); } catch { flash('Error: Failed to load stats'); }
  };
  const loadFlights = async () => {
    try { setLoading(true); const res = await getAllFlights(); setFlights(res.data.flights); }
    catch { flash('Error: Failed to load flights'); } finally { setLoading(false); }
  };
  const loadBookings = async () => {
    try { setLoading(true); const res = await adminGetAllBookings(); setBookings(res.data.bookings); }
    catch { flash('Error: Failed to load bookings'); } finally { setLoading(false); }
  };
  const loadRules = async () => {
    try { setLoading(true); const res = await adminGetPricingRules(); setRules(res.data.rules); }
    catch { flash('Error: Failed to load pricing rules'); } finally { setLoading(false); }
  };

  const ff = (field, val) => setFlightForm(f => ({ ...f, [field]: val }));

  const handleAddFlight = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        flightNumber: flightForm.flightNumber,
        airline: flightForm.airline,
        source: flightForm.source,
        destination: flightForm.destination,
        departureTime: flightForm.departureTime,
        arrivalTime: flightForm.arrivalTime,
        basePrice: Number(flightForm.basePrice),
        rows: Number(flightForm.rows),
        columns: Number(flightForm.columns),
      };
      if (editId) {
        await adminUpdateFlight(editId, payload);
        flash('Flight updated!');
        setEditId(null);
      } else {
        await adminCreateFlight(payload);
        flash(`Flight created with ${payload.rows * payload.columns} seats!`);
      }
      setFlightForm(INITIAL_FLIGHT_FORM);
      setShowAddFlight(false);
      loadFlights();
      loadStats();
    } catch (err) {
      flash('Error: ' + (err.response?.data?.message || 'Failed to save flight'));
    } finally { setSubmitting(false); }
  };

  const handleDeleteFlight = async (id) => {
    if (!window.confirm('Delete this flight and all its seats and bookings?')) return;
    try { await adminDeleteFlight(id); flash('Flight deleted'); loadFlights(); loadStats(); }
    catch { flash('Error: Delete failed'); }
  };

  const handleEditFlight = (flight) => {
    setFlightForm({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      source: flight.source,
      destination: flight.destination,
      departureTime: new Date(new Date(flight.departureTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      arrivalTime: new Date(new Date(flight.arrivalTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      basePrice: flight.basePrice,
      rows: flight.seatLayout?.rows || 10,
      columns: flight.seatLayout?.columns || 6,
    });
    setEditId(flight._id);
    setShowAddFlight(true);
  };

  const buildCondition = (form) => {
    switch (form.type) {
      case 'DEMAND': return { threshold: Number(form.threshold) };
      case 'TIME': return { hoursBeforeDeparture: Number(form.hoursBeforeDeparture) };
      case 'SEAT_TYPE': return { seatType: form.seatType };
      case 'CLASS': return { class: form.class };
      default: return {};
    }
  };

  const rf = (field, val) => setRuleForm(r => ({ ...r, [field]: val }));

  const handleSaveRule = async (e) => {
    e.preventDefault();
    const payload = { name: ruleForm.name, description: ruleForm.description, type: ruleForm.type, charge: Number(ruleForm.charge), isActive: ruleForm.isActive, condition: buildCondition(ruleForm) };
    try {
      setSubmitting(true);
      if (editRuleId) { await adminUpdatePricingRule(editRuleId, payload); flash('Pricing rule updated!'); setEditRuleId(null); }
      else { await adminCreatePricingRule(payload); flash('Pricing rule created!'); }
      setRuleForm(INITIAL_RULE_FORM);
      setShowRuleForm(false);
      loadRules();
    } catch (err) {
      flash('Error: ' + (err.response?.data?.message || 'Failed to save rule'));
    } finally { setSubmitting(false); }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this pricing rule?')) return;
    try { await adminDeletePricingRule(id); flash('Rule deleted'); loadRules(); }
    catch { flash('Error: Failed to delete rule'); }
  };

  const handleEditRule = (rule) => {
    setRuleForm({
      name: rule.name, description: rule.description || '', type: rule.type, charge: rule.charge, isActive: rule.isActive,
      threshold: rule.condition?.threshold ?? '', hoursBeforeDeparture: rule.condition?.hoursBeforeDeparture ?? '',
      seatType: rule.condition?.seatType || 'WINDOW', class: rule.condition?.class || 'ECONOMY',
    });
    setEditRuleId(rule._id);
    setShowRuleForm(true);
  };

  const handleToggleRule = async (rule) => {
    try { await adminUpdatePricingRule(rule._id, { isActive: !rule.isActive }); flash(`Rule ${rule.isActive ? 'disabled' : 'enabled'}`); loadRules(); }
    catch { flash('Error: Failed to toggle rule'); }
  };

  return (
    <div className="page-content admin-page">
      <div className="admin-header">
        <div className="section">
          <div className="admin-header-row">
            <div>
              <h1 className="admin-title">🛡 Admin Dashboard</h1>
              <p className="admin-sub">Manage flights, bookings & system</p>
            </div>
            {tab === 'flights' && (
              <button className="btn btn-primary" onClick={() => { setShowAddFlight(true); setEditId(null); setFlightForm(INITIAL_FLIGHT_FORM); }}>+ Add Flight</button>
            )}
            {tab === 'pricing' && (
              <button className="btn btn-primary" onClick={() => { setShowRuleForm(true); setEditRuleId(null); setRuleForm(INITIAL_RULE_FORM); }}>+ Add Rule</button>
            )}
          </div>
          <div className="admin-tabs">
            {[['overview', 'Overview'], ['flights', 'Flights'], ['bookings', 'Bookings'], ['pricing', 'Pricing Rules']].map(([v, l]) => (
              <button key={v} className={`admin-tab${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="section admin-content">
        {msg && <div className="fade-in" style={{ background: msg.startsWith('Error') ? 'var(--red-50)' : 'var(--teal-50)', color: msg.startsWith('Error') ? 'var(--red-600)' : 'var(--teal-600)', borderRadius: 10, padding: '10px 20px', marginBottom: 20, fontWeight: 600 }}>{msg}</div>}

        {/* OVERVIEW */}
        {tab === 'overview' && stats && (
          <div>
            <div className="admin-stats-grid">
              {[
                ['Confirmed Bookings', stats.totalBookings, '/ticket-flight.png', 'blue'],
                ['Registered Users', stats.totalUsers, '/passenger.png', 'blue'],
                ['Cancelled', stats.cancelledBookings, '/cancel.png', 'red'],
                ['Total Revenue', `₹${stats.totalRevenue?.toLocaleString('en-IN')}`, '/money.png', 'amber'],
                ['Active Flights', stats.totalFlights, '/plane.png', 'green'],
              ].map(([label, val, icon, color]) => (
                <div key={label} className={`admin-stat-card ac-${color}`}>
                  <div className="asc-icon"><img src={icon} alt={label} className="asc-img" /></div>
                  <div className="asc-val">{val}</div>
                  <div className="asc-label">{label}</div>
                </div>
              ))}
            </div>

            <div className="admin-info-cards">
              <div className="card admin-info-card">
                <h3>Quick Guide</h3>
                <ul>
                  <li>Go to <strong>Flights</strong> tab to add or manage flights</li>
                  <li>Go to <strong>Bookings</strong> tab to view all user bookings</li>
                  <li>Go to <strong>Pricing Rules</strong> tab to configure dynamic surcharges</li>
                  <li>Seats are auto-generated when a flight is created</li>
                </ul>
              </div>
              <div className="card admin-info-card">
                <h3>Pricing Rules</h3>
                <ul>
                  <li><strong>High Demand</strong> — surcharge when occupancy exceeds a threshold %</li>
                  <li><strong>Last Minute</strong> — surcharge when booking within N hours of departure</li>
                  <li><strong>Seat Type</strong> — per-seat charge for Window, Middle, or Aisle seats</li>
                  <li><strong>Cabin Class</strong> — per-seat charge for Economy or Business seats</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* FLIGHTS */}
        {tab === 'flights' && (
          <div>
            {showAddFlight && (
              <div className="add-flight-form card">
                <div className="aff-header">
                  <h3>{editId ? 'Edit Flight' : 'Add New Flight'}</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddFlight(false); setEditId(null); }}>✕ Close</button>
                </div>
                <form onSubmit={handleAddFlight} className="aff-grid">
                  <div className="form-group"><label className="form-label">Flight Number</label>
                    <input className="form-input" placeholder="SV601" value={flightForm.flightNumber} onChange={e => ff('flightNumber', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Airline</label>
                    <input className="form-input" placeholder="SkyJet" value={flightForm.airline} onChange={e => ff('airline', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Source City</label>
                    <select className="form-input" value={flightForm.source} onChange={e => ff('source', e.target.value)} required>
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Destination City</label>
                    <select className="form-input" value={flightForm.destination} onChange={e => ff('destination', e.target.value)} required>
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Departure Time</label>
                    <input className="form-input" type="datetime-local" value={flightForm.departureTime} onChange={e => ff('departureTime', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Arrival Time</label>
                    <input className="form-input" type="datetime-local" value={flightForm.arrivalTime} onChange={e => ff('arrivalTime', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Base Price (₹)</label>
                    <input className="form-input" type="number" placeholder="5000" min="100" value={flightForm.basePrice} onChange={e => ff('basePrice', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Rows</label>
                    <input className="form-input" type="number" min="2" max="60" value={flightForm.rows} onChange={e => ff('rows', e.target.value ? parseInt(e.target.value) : '')} required />
                    <span className="form-hint">Total seat rows</span></div>
                  <div className="form-group"><label className="form-label">Columns</label>
                    <input className="form-input" type="number" min="2" max="8" value={flightForm.columns} onChange={e => ff('columns', e.target.value ? parseInt(e.target.value) : '')} required />
                    <span className="form-hint">Seats per row (e.g. 6 = A B C | D E F)</span></div>
                  <div className="aff-submit">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editId ? 'Update Flight' : 'Create Flight'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowAddFlight(false); setEditId(null); }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {loading ? <div className="admin-loading"><div className="spinner spinner-lg" /></div> : (
              <div className="flights-table-wrap card">
                <table className="admin-table">
                  <thead><tr><th>Flight</th><th>Route</th><th>Departure</th><th>Base Price</th><th>Seats</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {flights.map(f => (
                      <tr key={f._id}>
                        <td><div className="at-flight-num">{f.flightNumber}</div><div className="at-airline">{f.airline}</div></td>
                        <td>{f.source} → {f.destination}</td>
                        <td className="at-date">{fmtDate(f.departureTime)}</td>
                        <td>₹{f.basePrice?.toLocaleString('en-IN')}</td>
                        <td><span className="badge badge-blue">{f.seatLayout?.rows ?? 10}r × {f.seatLayout?.columns ?? 6}c</span></td>
                        <td><span className={`badge ${f.status === 'SCHEDULED' ? 'badge-green' : 'badge-amber'}`}>{f.status}</span></td>
                        <td>
                          <div className="at-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => handleEditFlight(f)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFlight(f._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS */}
        {tab === 'bookings' && (
          <div>
            {loading ? <div className="admin-loading"><div className="spinner spinner-lg" /></div> : (
              <div className="bookings-table-wrap card">
                <table className="admin-table">
                  <thead><tr><th>Booking Ref</th><th>Passenger</th><th>Flight</th><th>Route</th><th>Date</th><th>Seat</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b._id}>
                        <td><span className="at-ref">{b.bookingReference}</span></td>
                        <td>
                          <div className="at-user">{b.passengerName}</div>
                          <div className="at-email">{b.userId?.email || ''}</div>
                        </td>
                        <td className="at-flight-num">{b.flightId?.flightNumber || '—'}</td>
                        <td>{b.flightId ? `${b.flightId.source} → ${b.flightId.destination}` : '—'}</td>
                        <td className="at-date">{b.flightId?.departureTime ? fmtDate(b.flightId.departureTime) : '—'}</td>
                        <td>{b.seatNumber}</td>
                        <td className="at-price">₹{b.priceBreakdown?.finalPrice?.toLocaleString('en-IN')}</td>
                        <td><span className={`badge ${b.status === 'CONFIRMED' ? 'badge-green' : 'badge-red'}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PRICING RULES */}
        {tab === 'pricing' && (
          <div>
            {showRuleForm && (
              <div className="add-flight-form card">
                <div className="aff-header">
                  <h3>{editRuleId ? 'Edit Pricing Rule' : 'Add Pricing Rule'}</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowRuleForm(false); setEditRuleId(null); }}>✕ Close</button>
                </div>
                <form onSubmit={handleSaveRule} className="aff-grid">
                  <div className="form-group">
                    <label className="form-label">Rule Name</label>
                    <input className="form-input" placeholder="e.g. Peak Season Demand" value={ruleForm.name} onChange={e => rf('name', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rule Type</label>
                    <select className="form-input" value={ruleForm.type} onChange={e => rf('type', e.target.value)}>
                      <option value="DEMAND">High Demand (occupancy %)</option>
                      <option value="TIME">Last Minute (hours before departure)</option>
                      <option value="SEAT_TYPE">Seat Type (Window / Middle / Aisle)</option>
                      <option value="CLASS">Cabin Class (Economy / Business)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Surcharge (₹)</label>
                    <input className="form-input" type="number" min="0" placeholder="1000" value={ruleForm.charge} onChange={e => rf('charge', e.target.value ? parseInt(e.target.value) : '')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={ruleForm.isActive ? 'true' : 'false'} onChange={e => rf('isActive', e.target.value === 'true')}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  {ruleForm.type === 'DEMAND' && (
                    <div className="form-group">
                      <label className="form-label">Occupancy Threshold (%)</label>
                      <input className="form-input" type="number" min="1" max="100" placeholder="70" value={ruleForm.threshold} onChange={e => rf('threshold', e.target.value ? parseInt(e.target.value) : '')} required />
                      <span className="form-hint">Surcharge applies when seats booked ≥ this %</span>
                    </div>
                  )}
                  {ruleForm.type === 'TIME' && (
                    <div className="form-group">
                      <label className="form-label">Hours Before Departure</label>
                      <input className="form-input" type="number" min="1" placeholder="48" value={ruleForm.hoursBeforeDeparture} onChange={e => rf('hoursBeforeDeparture', e.target.value ? parseInt(e.target.value) : '')} required />
                      <span className="form-hint">Surcharge applies when booking within this window</span>
                    </div>
                  )}
                  {ruleForm.type === 'SEAT_TYPE' && (
                    <div className="form-group">
                      <label className="form-label">Seat Type</label>
                      <select className="form-input" value={ruleForm.seatType} onChange={e => rf('seatType', e.target.value)}>
                        <option value="WINDOW">Window</option>
                        <option value="MIDDLE">Middle</option>
                        <option value="AISLE">Aisle</option>
                      </select>
                    </div>
                  )}
                  {ruleForm.type === 'CLASS' && (
                    <div className="form-group">
                      <label className="form-label">Cabin Class</label>
                      <select className="form-input" value={ruleForm.class} onChange={e => rf('class', e.target.value)}>
                        <option value="ECONOMY">Economy</option>
                        <option value="BUSINESS">Business</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group aff-full">
                    <label className="form-label">Description (optional)</label>
                    <input className="form-input" placeholder="Short note about this rule" value={ruleForm.description} onChange={e => rf('description', e.target.value)} />
                  </div>
                  <div className="aff-submit">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editRuleId ? 'Update Rule' : 'Create Rule'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowRuleForm(false); setEditRuleId(null); }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {loading ? <div className="admin-loading"><div className="spinner spinner-lg" /></div> : rules.length === 0 ? (
              <div className="card admin-empty">
                <div className="empty-icon">📋</div>
                <p>No pricing rules yet. Click <strong>+ Add Rule</strong> to create one.</p>
                <p className="empty-hint">Until at least one rule exists, hardcoded fallback values will be used.</p>
              </div>
            ) : (
              <div className="pricing-rules-grid">
                {rules.map(rule => {
                  const meta = RULE_TYPE_META[rule.type] || {};
                  return (
                    <div key={rule._id} className={`card pricing-rule-card${rule.isActive ? '' : ' rule-inactive'}`}>
                      <div className="prc-header">
                        <div className="prc-title-row">
                          <span className="prc-icon">{meta.icon}</span>
                          <div>
                            <div className="prc-name">{rule.name}</div>
                            {rule.description && <div className="prc-desc">{rule.description}</div>}
                          </div>
                        </div>
                        <div className="prc-badges">
                          <span className={`badge ${meta.badge}`}>{meta.label}</span>
                          <span className={`badge ${rule.isActive ? 'badge-green' : 'badge-gray'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <div className="prc-body">
                        <div className="prc-detail"><span>Condition</span><strong>{conditionSummary(rule)}</strong></div>
                        <div className="prc-detail"><span>Surcharge</span><strong className="prc-charge">+₹{rule.charge.toLocaleString('en-IN')}</strong></div>
                      </div>
                      <div className="prc-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => handleToggleRule(rule)}>{rule.isActive ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleEditRule(rule)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRule(rule._id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
