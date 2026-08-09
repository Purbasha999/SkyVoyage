import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { getUserBookings, cancelBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './BookingHistory.css';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDur = (dep, arr) => {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const statusColors = { CONFIRMED: 'badge-green', CANCELLED: 'badge-red' };

// Group per-seat Booking docs by groupId (multi-seat / round-trip checkouts
// share one). Legacy bookings without a groupId fall back to a
// same-flight-within-60s heuristic.
const groupBookings = (bookings) => {
  const groups = [];
  const byGroupId = {};

  for (const booking of bookings) {
    if (booking.groupId) {
      if (!byGroupId[booking.groupId]) {
        byGroupId[booking.groupId] = { groupId: booking.groupId, bookings: [] };
        groups.push(byGroupId[booking.groupId]);
      }
      byGroupId[booking.groupId].bookings.push(booking);
      continue;
    }
    const flightId = booking.flightId?._id || booking.flightId;
    const createdMs = new Date(booking.createdAt).getTime();
    const match = groups.find(g => {
      if (g.groupId) return false;
      const gFlightId = g.bookings[0].flightId?._id || g.bookings[0].flightId;
      const gCreatedMs = new Date(g.bookings[0].createdAt).getTime();
      return String(gFlightId) === String(flightId) && Math.abs(gCreatedMs - createdMs) <= 60_000;
    });
    if (match) match.bookings.push(booking);
    else groups.push({ groupId: null, bookings: [booking] });
  }
  return groups;
};

const legsOf = (group) => {
  const byFlight = {};
  group.bookings.forEach(b => {
    const fid = String(b.flightId?._id || b.flightId);
    if (!byFlight[fid]) byFlight[fid] = [];
    byFlight[fid].push(b);
  });
  return Object.values(byFlight);
};

const downloadTicket = async (elementId, filename) => {
  const input = document.getElementById(elementId);
  if (!input) return;
  const canvas = await html2canvas(input, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(filename);
};

const LegTicket = ({ leg, ticketId }) => {
  const flight = leg[0].flightId;
  if (!flight) return null;
  return (
    <div id={ticketId} style={{ position: 'absolute', left: -9999, top: 0 }} className="ticket-container">
      <div className="ticket-header">
        <div>
          <div className="ticket-title">✈ SkyVoyage Boarding Pass</div>
          <div className="ticket-date">Journey Date: {fmtDate(flight.departureTime)}</div>
        </div>
        <div className="ticket-ref">
          <div>Booking Ref</div>
          <strong>{leg[0].bookingReference}</strong>
        </div>
      </div>

      <div className="ticket-route">
        <div className="ticket-city"><div className="ticket-code">{flight.source}</div><div className="ticket-time">{fmtTime(flight.departureTime)}</div></div>
        <div className="ticket-arrow">✈</div>
        <div className="ticket-city"><div className="ticket-code">{flight.destination}</div><div className="ticket-time">{fmtTime(flight.arrivalTime)}</div></div>
      </div>

      <div className="ticket-divider" />

      <div className="ticket-section">
        <h3>PASSENGERS</h3>
        {leg.map((p, i) => (
          <div key={i} className="ticket-passenger">
            <span>{p.passengerName} {p.passengerGender ? `(${p.passengerGender}, ${p.passengerAge})` : ''}</span>
            <span>{p.seatNumber}</span>
          </div>
        ))}
      </div>

      <div className="ticket-section">
        <h3>PRICE DETAILS</h3>
        {(() => {
          const base = leg.reduce((s, b) => s + b.priceBreakdown.basePrice, 0);
          const taxes = leg.reduce((s, b) => s + b.priceBreakdown.taxes, 0);
          const addOnTotal = leg.reduce((s, b) => s + (b.priceBreakdown.addOnTotal || 0), 0);
          const total = leg.reduce((s, b) => s + b.priceBreakdown.finalPrice, 0);
          return (
            <>
              <div className="ticket-price-row"><span>Base Fare</span><span>₹{base}</span></div>
              <div className="ticket-price-row"><span>Taxes</span><span>₹{taxes}</span></div>
              {addOnTotal > 0 && <div className="ticket-price-row"><span>Add-ons</span><span>₹{addOnTotal}</span></div>}
              <div className="ticket-total">Total ₹{total}</div>
            </>
          );
        })()}
      </div>

      <div className="ticket-footer">
        <div className="ticket-note">Flight: {flight.flightNumber}<br />Airline: {flight.airline}</div>
        <div className="ticket-qr">
          <QRCodeCanvas value={JSON.stringify({ ref: leg[0].bookingReference, name: leg[0].passengerName, flight: flight.flightNumber, from: flight.source, to: flight.destination, date: flight.departureTime })} size={80} />
        </div>
      </div>
    </div>
  );
};

const BookingCard = ({ group, onCancel }) => {
  const [cancellingId, setCancellingId] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const legs = legsOf(group);
  const isRoundTrip = legs.length > 1;
  const allCancelled = group.bookings.every(b => b.status === 'CANCELLED');
  const someCancelled = group.bookings.some(b => b.status === 'CANCELLED');
  const groupStatus = allCancelled ? 'CANCELLED' : 'CONFIRMED';
  const groupTotal = group.bookings.reduce((s, b) => s + (b.priceBreakdown?.finalPrice || 0), 0);
  const key = group.groupId || group.bookings[0]._id;
  const allAddOns = group.bookings.flatMap(b => b.addOns || []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setCancellingId(bookingId);
      await onCancel(bookingId);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={`booking-card ${groupStatus === 'CANCELLED' ? 'cancelled' : ''}`}>
      <div className="bc-top">
        <div className="bc-ref-row">
          <div className="bc-ref">
            <span className="bc-ref-label">Booking Ref{group.bookings.length > 1 ? 's' : ''}</span>
            <span className="bc-ref-num">{group.bookings.map(b => b.bookingReference).join(', ')}</span>
          </div>
          <span className={`badge ${statusColors[groupStatus]}`}>{groupStatus}</span>
          {isRoundTrip && <span className="badge badge-blue">Round Trip</span>}
          {someCancelled && !allCancelled && <span className="badge badge-amber">Partial</span>}
        </div>

        {legs.map((leg, li) => {
          const f = leg[0].flightId;
          if (!f) return null;
          return (
            <div className="bc-flight-row" key={li}>
              <div className="bc-airline-chip">{isRoundTrip ? (li === 0 ? 'OUT' : 'RET') : f.airline.slice(0, 2).toUpperCase()}</div>
              <div className="bc-route-wrap">
                <div className="bc-city-block">
                  <div className="bc-time">{fmtTime(f.departureTime)}</div>
                  <div className="bc-code">{f.source}</div>
                </div>
                <div className="bc-mid">
                  <div className="bc-dur">{fmtDur(f.departureTime, f.arrivalTime)}</div>
                  <div className="bc-line">── ✈ ──</div>
                  <div className="bc-nonstop">Non-stop</div>
                </div>
                <div className="bc-city-block right">
                  <div className="bc-time">{fmtTime(f.arrivalTime)}</div>
                  <div className="bc-code">{f.destination}</div>
                </div>
              </div>
              {li === 0 && (
                <div className="bc-price-block">
                  <div className="bc-price">₹{groupTotal.toLocaleString('en-IN')}</div>
                  <div className="bc-price-label">Total Paid</div>
                </div>
              )}
            </div>
          );
        })}

        <div className="bc-meta-row">
          <span className="bc-meta-item">📅 {fmtDate(group.bookings[0].createdAt)}</span>
          <span className="bc-meta-item">💺 {group.bookings.map(b => b.seatNumber).join(', ')}</span>
          <span className="bc-meta-item">👥 {group.bookings.length} passenger{group.bookings.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="bc-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? '▲ Hide Details' : '▼ View Details'}
        </button>
        <div className="bc-actions-right">
          {legs.map((leg, li) => (
            <button key={li} className="btn btn-primary btn-sm" onClick={() => downloadTicket(`ticket-${key}-${li}`, `SkyVoyage_Ticket_${leg[0].bookingReference}.pdf`)}>
              Download {isRoundTrip ? (li === 0 ? 'Outbound' : 'Return') : ''} Ticket
            </button>
          ))}
          {groupStatus === 'CONFIRMED' && group.bookings.some(b => b.status === 'CONFIRMED') && (
            group.bookings.filter(b => b.status === 'CONFIRMED').map(b => (
              <button key={b._id} className="btn btn-danger btn-sm" onClick={() => handleCancel(b._id)} disabled={cancellingId === b._id}>
                {cancellingId === b._id ? 'Cancelling...' : `Cancel ${b.seatNumber}`}
              </button>
            ))
          )}
        </div>
      </div>

      {expanded && (
        <div className="bc-expanded">
          <div className="bc-exp-section">
            <div className="bc-exp-title">Passengers</div>
            <div className="bc-passengers">
              {group.bookings.map((p, i) => (
                <div key={i} className="bc-passenger">
                  <span className="bc-pax-num">{i + 1}</span>
                  <span className="bc-pax-name">{p.passengerName}</span>
                  {p.passengerAge && <span className="bc-pax-age">Age {p.passengerAge}</span>}
                  {p.passengerGender && <span className="bc-pax-gender">{p.passengerGender}</span>}
                  <span className="badge badge-blue">{p.seatNumber}</span>
                </div>
              ))}
            </div>
            {allAddOns.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 10 }}>
                <strong>Add-ons:</strong> {allAddOns.map(a => `${a.name} (₹${a.price})`).join(', ')}
              </p>
            )}
          </div>

          <div className="bc-exp-section">
            <div className="bc-exp-title">Price Breakdown</div>
            <div className="bc-price-table">
              <div className="bc-pr"><span>Base Fare</span><span>₹{group.bookings.reduce((s, b) => s + b.priceBreakdown.basePrice, 0)}</span></div>
              <div className="bc-pr"><span>Taxes &amp; GST</span><span>₹{group.bookings.reduce((s, b) => s + b.priceBreakdown.taxes, 0)}</span></div>
              {allAddOns.length > 0 && <div className="bc-pr"><span>Add-ons</span><span>₹{group.bookings.reduce((s, b) => s + (b.priceBreakdown.addOnTotal || 0), 0)}</span></div>}
              <div className="bc-pr total"><span>Total</span><span>₹{groupTotal.toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        </div>
      )}

      {legs.map((leg, li) => <LegTicket key={li} leg={leg} ticketId={`ticket-${key}-${li}`} />)}
    </div>
  );
};

const BookingHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const { newBookings } = location.state || {};
    if (newBookings?.length > 0) {
      setSuccessMsg(`${newBookings.length} booking${newBookings.length > 1 ? 's' : ''} confirmed!`);
    }
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await getUserBookings();
      setBookings(res.data.bookings);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelBooking({ bookingId: id, reason: 'Cancelled by user' });
      setSuccessMsg('Booking cancelled. Seat released.');
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const groups = groupBookings(bookings);
  const filteredGroups = groups.filter(g => {
    if (filter === 'ALL') return true;
    const allCancelled = g.bookings.every(b => b.status === 'CANCELLED');
    return filter === 'CANCELLED' ? allCancelled : !allCancelled;
  });

  const stats = {
    total: groups.length,
    confirmed: groups.filter(g => !g.bookings.every(b => b.status === 'CANCELLED')).length,
    cancelled: groups.filter(g => g.bookings.every(b => b.status === 'CANCELLED')).length,
    spent: bookings.filter(b => b.status === 'CONFIRMED').reduce((s, b) => s + (b.priceBreakdown?.finalPrice || 0), 0)
  };

  return (
    <div className="page-content dashboard-page">
      <div className="dashboard-header">
        <div className="section">
          <div className="dash-welcome">
            <div className="dash-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className="dash-title">My Trips</h1>
              <p className="dash-sub">Welcome back, {user?.name?.split(' ')[0]}!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="section dashboard-content">
        {successMsg && <div className="fade-in" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)', borderRadius: 'var(--radius-md)', padding: '12px 20px', marginBottom: 20, fontWeight: 600 }}>{successMsg}</div>}
        {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>{error}</div>}

        <div className="dash-stats">
          {[
            ['Total Trips', stats.total, '/plane.png'],
            ['Confirmed', stats.confirmed, '/yes.png'],
            ['Cancelled', stats.cancelled, '/cancel.png'],
            ['Total Spent', `₹${stats.spent.toLocaleString('en-IN')}`, '/flying-money.png'],
          ].map(([label, val, icon]) => (
            <div key={label} className="dash-stat-card">
              <img src={icon} alt={label} className="asc-img" />
              <div className="dash-stat-val">{val}</div>
              <div className="dash-stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="dash-filters">
          {['ALL', 'CONFIRMED', 'CANCELLED'].map(f => (
            <button key={f} className={`filter-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'All Trips' : f === 'CONFIRMED' ? 'Upcoming' : 'Cancelled'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="dash-loading"><div className="spinner spinner-lg" /><p>Loading your trips...</p></div>
        ) : filteredGroups.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">✈️</div>
            <h3>{filter === 'ALL' ? 'No trips yet' : `No ${filter.toLowerCase()} bookings`}</h3>
            <p>Ready for your next adventure?</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Search Flights</button>
          </div>
        ) : (
          <div className="booking-list">
            {filteredGroups.map((g, i) => <BookingCard key={g.groupId || i} group={g} onCancel={handleCancel} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingHistory;
