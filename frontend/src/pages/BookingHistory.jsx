import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getUserBookings, cancelBooking } from '../services/api';

const fmt = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// Group bookings of same flight created within 60s of each other.
const groupBookings = (bookings) => {
  const groups = [];

  for (const booking of bookings) {
    const flightId = booking.flightId?._id || booking.flightId;
    const createdMs = new Date(booking.createdAt).getTime();

    const match = groups.find(g => {
      const gFlightId = g.bookings[0].flightId?._id || g.bookings[0].flightId;
      const gCreatedMs = new Date(g.bookings[0].createdAt).getTime();
      return (
        String(gFlightId) === String(flightId) &&
        Math.abs(gCreatedMs - createdMs) <= 60_000
      );
    });

    if (match) {
      match.bookings.push(booking);
    } else {
      groups.push({ bookings: [booking] });
    }
  }

  return groups;
};

const BookingHistory = () => {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  const statusConfig = {
    CONFIRMED: { label: 'Confirmed', bg: '#d1fae5', color: '#065f46', bar: '#10b981'},
    CANCELLED: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b', bar: '#ef4444'}
  };

  const groups = groupBookings(bookings);

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>My Bookings</h1>
        <p style={{ color: '#64748b' }}>View and manage all your flight bookings</p>
      </div>

      {successMsg && (
        <div className="fade-in" style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 20px', marginBottom: 20, color: '#065f46', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b' }}>
          {error}
        </div>
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
          const flight = group.bookings[0].flightId;
          const bookedAt = group.bookings[0].createdAt;

          const allCancelled = group.bookings.every(b => b.status === 'CANCELLED');
          const someCancelled = group.bookings.some(b => b.status === 'CANCELLED');
          const groupStatus = allCancelled ? 'CANCELLED' : 'CONFIRMED';
          const status = statusConfig[groupStatus];

          const groupTotal = group.bookings.reduce((sum, b) => sum + (b.priceBreakdown?.finalPrice || 0), 0);

          return (
            <div key={gi} className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Status colour bar */}
              <div style={{ height: 4, background: status.bar }} />
              <div style={{ padding: '20px 24px' }}>
                {/* Header row: flight info + total */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                  <div>
                    {/* Status badge + booked date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ ...badgeStyle, background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                      {someCancelled && !allCancelled && (
                        <span style={{ ...badgeStyle, background: '#fef3c7', color: '#92400e' }}>
                          Partial
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Booked {fmt(bookedAt)}</span>
                    </div>

                    {/* Route */}
                    {flight && (
                      <>
                        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 2 }}>
                          {flight.source} → {flight.destination}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
                          {flight.airline} · {flight.flightNumber}
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                          <span>{fmt(flight.departureTime)}</span>
                          <span>{fmtTime(flight.departureTime)} → {fmtTime(flight.arrivalTime)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Total + seat count */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {group.bookings.length} seat{group.bookings.length > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#0f172a' }}>
                      ₹{groupTotal.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>total</div>
                  </div>
                </div>

                {/* Seat rows */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {group.bookings.map((booking, bi) => {
                    const bStatus = statusConfig[booking.status] || statusConfig.CONFIRMED;
                    const isLast = bi === group.bookings.length - 1;

                    return (
                      <div
                        key={booking._id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          flexWrap: 'wrap', gap: 12,
                          padding: '12px 0',
                          borderBottom: isLast ? 'none' : '1px solid #f8fafc',
                        }}
                      >
                        {/* Seat chip + passenger info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{
                            background: booking.status === 'CANCELLED' ? '#f1f5f9' : '#dbeafe',
                            color: booking.status === 'CANCELLED' ? '#94a3b8' : '#1d4ed8',
                            fontWeight: 800, fontSize: 15, borderRadius: 8,
                            padding: '6px 14px', fontFamily: 'Syne, sans-serif',
                            minWidth: 56, textAlign: 'center',
                            textDecoration: booking.status === 'CANCELLED' ? 'line-through' : 'none'
                          }}>
                            {booking.seatNumber}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: booking.status === 'CANCELLED' ? '#94a3b8' : '#0f172a' }}>
                              {booking.passengerName}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>
                              {booking.bookingReference}
                              {booking.passengerPhone ? ` · ${booking.passengerPhone}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Per-seat price + status + cancel */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ ...badgeStyle, background: bStatus.bg, color: bStatus.color, fontSize: 11 }}>
                            {bStatus.label}
                          </span>
                          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: booking.status === 'CANCELLED' ? '#94a3b8' : '#0f172a', minWidth: 80, textAlign: 'right' }}>
                            ₹{booking.priceBreakdown?.finalPrice?.toLocaleString('en-IN')}
                          </div>
                          {booking.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleCancel(booking._id)}
                              disabled={cancelling === booking._id}
                              className="btn btn-danger"
                              style={{ fontSize: 11, padding: '4px 12px' }}
                            >
                              {cancelling === booking._id ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price breakdown */}
                {group.bookings.length === 1 && group.bookings[0].priceBreakdown && (
                  <details style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <summary style={{ fontSize: 13, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                      View price breakdown
                    </summary>
                    <PriceBreakdownGrid breakdown={group.bookings[0].priceBreakdown} />
                  </details>
                )}

                {group.bookings.length > 1 && (
                  <details style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <summary style={{ fontSize: 13, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                      View price breakdown per seat
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                      {group.bookings.map(b => (
                        <div key={b._id}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                            Seat {b.seatNumber} — {b.passengerName}
                          </div>
                          <PriceBreakdownGrid breakdown={b.priceBreakdown} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PriceBreakdownGrid = ({ breakdown }) => (
  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 6 }}>
    {[
      { label: 'Base', value: breakdown.basePrice },
      ...(breakdown.demandCharge ? [{ label: 'Demand', value: breakdown.demandCharge }] : []),
      ...(breakdown.lateBookingCharge ? [{ label: 'Late Booking', value: breakdown.lateBookingCharge }] : []),
      ...(breakdown.seatTypeCharge ? [{ label: 'Seat Type', value: breakdown.seatTypeCharge }] : []),
      { label: 'Total', value: breakdown.finalPrice, bold: true },
    ].map(item => (
      <div key={item.label}>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</div>
        <div style={{ fontSize: 14, fontWeight: item.bold ? 800 : 600, color: item.bold ? '#0ea5e9' : '#0f172a' }}>
          ₹{item.value?.toLocaleString('en-IN')}
        </div>
      </div>
    ))}
  </div>
);

const badgeStyle = { padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 };

export default BookingHistory;