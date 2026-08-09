import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { confirmBooking, applyPromoCode } from '../services/api';
import './PaymentPage.css';

const METHODS = [
  { key: 'UPI', label: 'UPI', icon: '📱' },
  { key: 'Card', label: 'Card', icon: '💳' },
  { key: 'NetBanking', label: 'Net Banking', icon: '🏦' },
];

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state?.bookingData;

  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState('UPI');
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  if (!bookingData) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2>Session expired</h2>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const finalPrice = Math.max(0, bookingData.totalPrice - discount);

  const applyPromo = async () => {
    if (!promo.trim()) return;
    try {
      const res = await applyPromoCode({ code: promo.trim(), totalPrice: bookingData.totalPrice, isStudent: false });
      setDiscount(res.data.discount);
      setError('');
    } catch (err) {
      setDiscount(0);
      setError(err.response?.data?.message || 'Invalid promo code');
    }
  };

  const handlePayment = async () => {
    setError('');
    setPaying(true);

    try {
      if (bookingData.type === 'roundtrip') {
        const groupId = `GRP-${Date.now().toString(36).toUpperCase()}`;
        const seatBookings = (nums) => nums.map((seatNumber, i) => ({
          seatNumber,
          passengerName: bookingData.passengers[i].passengerName.trim(),
          passengerAge: bookingData.passengers[i].passengerAge,
          passengerGender: bookingData.passengers[i].passengerGender,
          passengerPhone: bookingData.passengers[i].passengerPhone?.trim() || ''
        }));

        const res = await Promise.all([
          confirmBooking({
            flightId: bookingData.outbound._id,
            seats: seatBookings(bookingData.outboundSeatNumbers),
            addOns: bookingData.addOns.outbound || [],
            discount,
            groupId
          }),
          confirmBooking({
            flightId: bookingData.returnFlight._id,
            seats: seatBookings(bookingData.returnSeatNumbers),
            addOns: bookingData.addOns.return || [],
            discount: 0,
            groupId
          })
        ]);

        navigate('/bookings', { state: { newBookings: [...res[0].data.bookings, ...res[1].data.bookings] } });
      } else {
        const seatBookings = bookingData.seatNumbers.map((seatNumber, i) => ({
          seatNumber,
          passengerName: bookingData.passengers[i].passengerName.trim(),
          passengerAge: bookingData.passengers[i].passengerAge,
          passengerGender: bookingData.passengers[i].passengerGender,
          passengerPhone: bookingData.passengers[i].passengerPhone?.trim() || ''
        }));

        const res = await confirmBooking({
          flightId: bookingData.flight._id,
          seats: seatBookings,
          addOns: bookingData.addOns || [],
          discount
        });

        navigate('/bookings', { state: { newBookings: res.data.bookings } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Your seats may have expired — please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-left">
        <div className="card">
          <h3>Apply Promo Code</h3>
          <div className="promo-box">
            <input value={promo} onChange={e => setPromo(e.target.value.toUpperCase())} placeholder="e.g. FLY500" />
            <button onClick={applyPromo}>Apply</button>
          </div>
          {discount > 0 && <p style={{ color: 'var(--teal-600)', fontSize: 12, marginTop: 8, fontWeight: 600 }}>Promo applied! You saved ₹{discount.toLocaleString('en-IN')}.</p>}
        </div>

        <div className="card">
          <h3>Payment Method</h3>
          <div className="payment-options">
            {METHODS.map(m => (
              <div key={m.key} className={`method-tile ${method === m.key ? 'active' : ''}`} onClick={() => setMethod(m.key)}>
                <span style={{ fontSize: 20, display: 'block', marginBottom: 6 }}>{m.icon}</span>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: 13 }}>{error}</div>}
      </div>

      <div className="payment-right">
        <div className="card summary-card">
          <h3>Payment Summary</h3>
          <div className="price-row"><span>Total</span><span>₹{bookingData.totalPrice.toLocaleString('en-IN')}</span></div>
          {discount > 0 && <div className="price-row discount"><span>Discount</span><span>-₹{discount.toLocaleString('en-IN')}</span></div>}
          <hr className="divider" />
          <div className="price-total">₹{finalPrice.toLocaleString('en-IN')}</div>
          <button className="pay-btn" onClick={handlePayment} disabled={paying}>
            {paying ? 'Processing...' : `Pay ₹${finalPrice.toLocaleString('en-IN')} via ${method}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
