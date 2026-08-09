import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { getUserBookings, cancelBooking } from '../services/api';

const fmt = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// Group bookings by groupId (multi-seat and round-trip checkouts share one).
// Bookings created before this field existed fall back to the old
// same-flight-within-60s heuristic so nothing "disappears" from history.
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

// Is this a round-trip group? (two different flights sharing one groupId)
const legsOf = (group) => {
  const byFlight = {};
  group.bookings.forEach(b => {
    const fid = String(b.flightId?._id || b.flightId);
    if (!byFlight[fid]) byFlight[fid] = [];
    byFlight[fid].push(b);
  });
  return Object.values(byFlight);
};

const statusConfig = {
  CONFIRMED: { label: 'Confirmed', bg: '#d1fae5', color: '#065f46', bar: '#10b981' },
  CANCELLED: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b', bar: '#ef4444' }
};

const badgeStyle = { padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 };

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
    <div id={ticketId} style={{ position: 'absolute', left: -9999, top: 0, width: 700, background: 'white', padding: 32, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22 }}>✈ SkyVoyage Boarding Pass</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Journey Date: {fmt(flight.departureTime)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Booking Ref</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{leg[0].bookingReference}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26 }}>{flight.source}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{fmtTime(flight.departureTime)}</div>
        </div>
        <div style={{ fontSize: 24 }}>✈</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26 }}>{flight.destination}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{fmtTime(flight.arrivalTime)}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 14, marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Passengers</h3>
        {leg.map((b, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
            <span>{b.passengerName} {b.passengerGender ? `(${b.passengerGender}, ${b.passengerAge})` : ''}</span>
            <span style={{ fontWeight: 700 }}>{b.seatNumber}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Flight: {flight.flightNumber}<br />Airline: {flight.airline}
        </div>
        <QRCodeCanvas
          value={JSON.stringify({
            ref: leg[0].bookingReference,
            name: leg[0].passengerName,
            flight: flight.flightNumber,
            from: flight.source,
            to: flight.destination,
            date: flight.departureTime
          })}
          size={72}
        />
      </div>
    </div>
  );
};

const BookingHistory = () => {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const { newBookings, newBooking } = location.state || {};
    if (newBookings?.length > 0) {
      const refs = newBookings.map(b => b.bookingReference).join(', ');
      setSuccessMsg(`${newBookings.length} booking${newBookings.length > 1 ? 's' : ''} confirmed! Ref${newBookings.length > 1 ? 's' : ''}: ${refs}`);
    } else if (newBooking) {
      setSuccessMsg(`Booking ${newBooking.bookingReference} confirmed!`);
    }
    fetchBookings();
  }, [location.state]);

  const fetchBookings = () => {
    setLoading(true);
    getUserBookings()
      .then(res => setBookings(res.data.bookings || []))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(bookingId);
    try {
      await cancelBooking({ bookingId, reason: 'Cancelled by user' });
      fetchBookings();
      setSuccessMsg('Booking cancelled. The seat is now available again.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  const groups = groupBookings(bookings);

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>My Bookings</h1>
        <p style={{ color: '#64748b' }}>View, download tickets for, and manage all your flight bookings</p>
      </div>

      {successMsg && (
        <div className="fade-in" style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 20px', marginBottom: 20, color: '#065f46', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b' }}>{error}</div>
      )}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spin" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', margin: '0 auto' }} />
        </div>
      )}
      {!loading && bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✈️</div>
          <h3 style={{ marginBottom: 8 }}>No bookings yet</h3>
          <p style={{ color: '#64748b', marginBottom: 24 }}>Your booking history will appear here</p>
          <a href="/" className="btn btn-primary">Search Flights</a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map((group, gi) => {
          const legs = legsOf(group);
          const isRoundTrip = legs.length > 1;
          const allCancelled = group.bookings.every(b => b.status === 'CANCELLED');
          const someCancelled = group.bookings.some(b => b.status === 'CANCELLED');
          const groupStatus = allCancelled ? 'CANCELLED' : 'CONFIRMED';
          const status = statusConfig[groupStatus];
          const groupTotal = group.bookings.reduce((sum, b) => sum + (b.priceBreakdown?.finalPrice || 0), 0);
          const key = group.groupId || `legacy-${gi}`;
          const isExpanded = !!expanded[key];
          const allAddOns = group.bookings.flatMap(b => b.addOns || []);

          return (
            <div key={key} className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 4, background: status.bar }} />
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ ...badgeStyle, background: status.bg, color: status.color }}>{status.label}</span>
                      {isRoundTrip && <span style={{ ...badgeStyle, background: '#e0f2fe', color: '#0369a1' }}>Round Trip</span>}
                      {someCancelled && !allCancelled && <span style={{ ...badgeStyle, background: '#fef3c7', color: '#92400e' }}>Partial</span>}
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Booked {fmt(group.bookings[0].createdAt)}</span>
                    </div>

                    {legs.map((leg, li) => {
                      const flight = leg[0].flightId;
                      if (!flight) return <div key={li} style={{ fontSize: 13, color: '#94a3b8' }}>Flight deleted</div>;
                      return (
                        <div key={li} style={{ marginBottom: li < legs.length - 1 ? 8 : 0 }}>
                          <div style={{ fontWeight: 700, fontSize: isRoundTrip ? 15 : 20 }}>
                            {isRoundTrip && <span style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 700, marginRight: 6 }}>{li === 0 ? 'OUT' : 'RET'}</span>}
                            {flight.source} → {flight.destination}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {flight.airline} · {flight.flightNumber} · {fmt(flight.departureTime)} · {fmtTime(flight.departureTime)} → {fmtTime(flight.arrivalTime)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {group.bookings.length} seat{group.bookings.length > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>₹{groupTotal.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>total</div>
                  </div>
                </div>

                {/* Seat rows */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  {group.bookings.map((booking, bi) => {
                    const bStatus = statusConfig[booking.status] || statusConfig.CONFIRMED;
                    const isLast = bi === group.bookings.length - 1;
                    return (
                      <div key={booking._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid #f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{
                            background: booking.status === 'CANCELLED' ? '#f1f5f9' : '#dbeafe',
                            color: booking.status === 'CANCELLED' ? '#94a3b8' : '#1d4ed8',
                            fontWeight: 800, fontSize: 14, borderRadius: 8, padding: '5px 12px',
                            fontFamily: 'Syne, sans-serif', minWidth: 50, textAlign: 'center',
                            textDecoration: booking.status === 'CANCELLED' ? 'line-through' : 'none'
                          }}>
                            {booking.seatNumber}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: booking.status === 'CANCELLED' ? '#94a3b8' : '#0f172a' }}>{booking.passengerName}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{booking.bookingReference}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ ...badgeStyle, background: bStatus.bg, color: bStatus.color, fontSize: 11 }}>{bStatus.label}</span>
                          <div style={{ fontSize: 14, fontWeight: 700, minWidth: 76, textAlign: 'right' }}>₹{booking.priceBreakdown?.finalPrice?.toLocaleString('en-IN')}</div>
                          {booking.status === 'CONFIRMED' && (
                            <button onClick={() => handleCancel(booking._id)} disabled={cancelling === booking._id} className="btn btn-danger" style={{ fontSize: 11, padding: '4px 12px' }}>
                              {cancelling === booking._id ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {allAddOns.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                    <strong>Add-ons:</strong> {allAddOns.map(a => `${a.name} (₹${a.price})`).join(', ')}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}>
                    {isExpanded ? '▲ Hide price breakdown' : '▼ View price breakdown'}
                  </button>
                  {legs.map((leg, li) => (
                    <button
                      key={li}
                      className="btn btn-outline"
                      style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => downloadTicket(`ticket-${key}-${li}`, `SkyVoyage_Ticket_${leg[0].bookingReference}.pdf`)}
                    >
                      Download {isRoundTrip ? (li === 0 ? 'Outbound' : 'Return') : ''} Ticket
                    </button>
                  ))}
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    {group.bookings.map(b => (
                      <div key={b._id}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Seat {b.seatNumber} — {b.passengerName}</div>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                          {[
                            { label: 'Base', value: b.priceBreakdown.basePrice },
                            ...(b.priceBreakdown.demandCharge ? [{ label: 'Demand', value: b.priceBreakdown.demandCharge }] : []),
                            ...(b.priceBreakdown.lateBookingCharge ? [{ label: 'Late Booking', value: b.priceBreakdown.lateBookingCharge }] : []),
                            ...(b.priceBreakdown.seatTypeCharge ? [{ label: 'Seat Type', value: b.priceBreakdown.seatTypeCharge }] : []),
                            ...(b.priceBreakdown.seatClassCharge ? [{ label: 'Cabin Class', value: b.priceBreakdown.seatClassCharge }] : []),
                            { label: 'Taxes', value: b.priceBreakdown.taxes },
                            ...(b.priceBreakdown.addOnTotal ? [{ label: 'Add-ons', value: b.priceBreakdown.addOnTotal }] : []),
                            ...(b.priceBreakdown.discount ? [{ label: 'Discount', value: -b.priceBreakdown.discount }] : []),
                            { label: 'Total', value: b.priceBreakdown.finalPrice, bold: true }
                          ].map(item => (
                            <div key={item.label}>
                              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</div>
                              <div style={{ fontSize: 14, fontWeight: item.bold ? 800 : 600, color: item.bold ? '#0ea5e9' : '#0f172a' }}>₹{item.value?.toLocaleString('en-IN')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Off-screen printable tickets, one per leg */}
              {legs.map((leg, li) => (
                <LegTicket key={li} leg={leg} ticketId={`ticket-${key}-${li}`} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingHistory;
