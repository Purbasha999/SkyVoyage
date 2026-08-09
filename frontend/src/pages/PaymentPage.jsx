import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { confirmBooking, applyPromoCode } from '../services/api';

// Simulated payment methods — no real gateway is wired up; this mirrors a
// checkout flow so the booking confirms only once the user "pays".
const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state?.bookingData;

  const [method, setMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('');
  const [bankLogin, setBankLogin] = useState({ userId: '', password: '' });

  const [promo, setPromo] = useState('');
  const [promoStatus, setPromoStatus] = useState(null); // { message, isError }
  const [discount, setDiscount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  if (!bookingData) {
    return (
      <div className="container" style={{ padding: 60, textAlign: 'center' }}>
        <h2>Session expired</h2>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const finalPrice = Math.max(0, bookingData.totalPrice - discount);

  const handleApplyPromo = async () => {
    if (!promo.trim()) return;
    try {
      const res = await applyPromoCode({ code: promo.trim(), totalPrice: bookingData.totalPrice, isStudent: false });
      setDiscount(res.data.discount);
      setPromoStatus({ message: `Promo applied! You saved ₹${res.data.discount.toLocaleString('en-IN')}.`, isError: false });
    } catch (err) {
      setDiscount(0);
      setPromoStatus({ message: err.response?.data?.message || 'Invalid promo code', isError: true });
    }
  };

  const validateMethod = () => {
    if (method === 'UPI') {
      if (!upiVerified) return 'Please verify your UPI ID first.';
    }
    if (method === 'Card') {
      if (!card.number || !card.cvv || !card.expiry || !card.name) return 'Please fill in all card details.';
    }
    if (method === 'NetBanking') {
      if (!selectedBank || !bankLogin.userId || !bankLogin.password) return 'Please complete your bank login.';
    }
    return null;
  };

  const handlePay = async () => {
    const validationError = validateMethod();
    if (validationError) { setError(validationError); return; }
    setError('');
    setPaying(true);

    try {
      if (bookingData.type === 'roundtrip') {
        const groupId = `GRP-${Date.now().toString(36).toUpperCase()}`;
        const seatBookings = (seats) => seats.map((seat, i) => ({
          seatNumber: seat.seatNumber,
          passengerName: bookingData.passengers[i].passengerName.trim(),
          passengerAge: bookingData.passengers[i].passengerAge,
          passengerGender: bookingData.passengers[i].passengerGender,
          passengerPhone: bookingData.passengers[i].passengerPhone?.trim() || ''
        }));

        const res = await Promise.all([
          confirmBooking({
            flightId: bookingData.outbound._id,
            seats: seatBookings(bookingData.outboundSeats),
            addOns: bookingData.addOns.outbound || [],
            discount,
            groupId
          }),
          confirmBooking({
            flightId: bookingData.returnFlight._id,
            seats: seatBookings(bookingData.returnSeats),
            addOns: bookingData.addOns.return || [],
            discount: 0,
            groupId
          })
        ]);

        const allBookings = [...res[0].data.bookings, ...res[1].data.bookings];
        navigate('/bookings', { state: { newBookings: allBookings } });
      } else {
        const seatBookings = bookingData.seats.map((seat, i) => ({
          seatNumber: seat.seatNumber,
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
    <div className="container" style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Payment</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Promo */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Apply Promo Code</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={promo}
                onChange={e => setPromo(e.target.value.toUpperCase())}
                placeholder="e.g. FLY500"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={handleApplyPromo} className="btn btn-outline" style={{ fontSize: 13, padding: '9px 18px' }}>Apply</button>
            </div>
            {promoStatus && (
              <p style={{ fontSize: 12, marginTop: 8, color: promoStatus.isError ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                {promoStatus.message}
              </p>
            )}
          </div>

          {/* Payment method */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Payment Method</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {['UPI', 'Card', 'NetBanking'].map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, border: `1.5px solid ${method === m ? '#0ea5e9' : '#e2e8f0'}`,
                    background: method === m ? '#f0f9ff' : 'white', color: method === m ? '#0ea5e9' : '#64748b',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {method === 'UPI' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={upiId} onChange={e => { setUpiId(e.target.value); setUpiVerified(false); }} placeholder="yourname@upi" style={{ ...inputStyle, flex: 1 }} />
                  <button
                    onClick={() => setUpiVerified(upiId.includes('@'))}
                    className="btn btn-outline"
                    style={{ fontSize: 12, padding: '9px 16px' }}
                  >
                    {upiVerified ? 'Verified ✓' : 'Verify'}
                  </button>
                </div>
                {upiId && !upiId.includes('@') && <p style={{ fontSize: 12, color: '#ef4444' }}>Enter a valid UPI ID (e.g. name@bank).</p>}
              </div>
            )}

            {method === 'Card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input placeholder="Card Number" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} style={inputStyle} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input placeholder="MM/YY" value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                  <input placeholder="CVV" value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                </div>
                <input placeholder="Card Holder Name" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} style={inputStyle} />
              </div>
            )}

            {method === 'NetBanking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)} style={inputStyle}>
                  <option value="">Select Bank</option>
                  <option value="SBI">SBI</option>
                  <option value="HDFC">HDFC</option>
                  <option value="ICICI">ICICI</option>
                </select>
                {selectedBank && (
                  <>
                    <input placeholder="User ID" value={bankLogin.userId} onChange={e => setBankLogin({ ...bankLogin, userId: e.target.value })} style={inputStyle} />
                    <input type="password" placeholder="Password" value={bankLogin.password} onChange={e => setBankLogin({ ...bankLogin, password: e.target.value })} style={inputStyle} />
                  </>
                )}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', color: '#991b1b', fontSize: 13 }}>{error}</div>
          )}
        </div>

        {/* Summary */}
        <div className="card" style={{ padding: 20, position: 'sticky', top: 90 }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Payment Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span>Subtotal</span>
            <span>₹{bookingData.totalPrice.toLocaleString('en-IN')}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: '#10b981' }}>
              <span>Discount</span>
              <span>-₹{discount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div style={{ borderTop: '2px solid #0f172a', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 22, fontFamily: 'Syne, sans-serif', marginBottom: 16 }}>
            <span>Total</span>
            <span style={{ color: '#0ea5e9' }}>₹{finalPrice.toLocaleString('en-IN')}</span>
          </div>
          <button onClick={handlePay} disabled={paying} className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 16, borderRadius: 12, justifyContent: 'center' }}>
            {paying ? 'Processing...' : `Pay ₹${finalPrice.toLocaleString('en-IN')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

export default PaymentPage;
