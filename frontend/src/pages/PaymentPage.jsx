import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { confirmBooking, applyPromoCode } from '../services/api';
import './PaymentPage.css';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state?.bookingData;

  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [showUpiPin, setShowUpiPin] = useState(false);
  const [upiPin, setUpiPin] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('');
  const [bankLogin, setBankLogin] = useState({ userId: '', password: '' });
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

  const handleUpiVerify = () => {
    if (!upiId.includes('@')) { setError('Invalid UPI ID'); return; }
    setError('');
    setUpiVerified(true);
  };

  const handlePayment = async () => {
    if (method === 'UPI') {
      if (!upiVerified) return setError('Verify UPI first');
      if (!showUpiPin) return setShowUpiPin(true);
      if (upiPin.length !== 4) return setError('Enter a valid 4-digit PIN');
    }
    if (method === 'Card') {
      if (!card.number || !card.cvv || !card.expiry) return setError('Fill in card details');
    }
    if (method === 'NetBanking') {
      if (!selectedBank || !bankLogin.userId || !bankLogin.password) return setError('Complete bank login');
    }

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
            {['UPI', 'Card', 'NetBanking'].map(m => (
              <div key={m} className={`method-tile ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)}>{m}</div>
            ))}
          </div>

          <div className="payment-form">
            {method === 'UPI' && (
              <div className="upi-form">
                <div>
                  <input value={upiId} onChange={e => { setUpiId(e.target.value); setUpiVerified(false); }} placeholder="Enter UPI ID" />
                  <button type="button" onClick={handleUpiVerify} className="verify-btn">{upiVerified ? 'Verified ✓' : 'Verify'}</button>
                </div>
                {showUpiPin && (
                  <input type="password" maxLength={4} placeholder="Enter UPI PIN" value={upiPin} onChange={e => setUpiPin(e.target.value)} />
                )}
              </div>
            )}

            {method === 'Card' && (
              <div className="card-form">
                <input placeholder="Card Number" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} />
                <div className="card-row">
                  <input placeholder="MM/YY" value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} />
                  <input placeholder="CVV" value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} />
                </div>
                <input placeholder="Card Holder Name" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} />
              </div>
            )}

            {method === 'NetBanking' && (
              <div className="netbanking-form">
                <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
                  <option value="">Select Bank</option>
                  <option value="SBI">SBI</option>
                  <option value="HDFC">HDFC</option>
                  <option value="ICICI">ICICI</option>
                </select>
                {selectedBank && (
                  <>
                    <input placeholder="User ID" value={bankLogin.userId} onChange={e => setBankLogin({ ...bankLogin, userId: e.target.value })} />
                    <input type="password" placeholder="Password" value={bankLogin.password} onChange={e => setBankLogin({ ...bankLogin, password: e.target.value })} />
                  </>
                )}
              </div>
            )}
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
            {paying ? 'Processing...' : `Pay ₹${finalPrice.toLocaleString('en-IN')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
