const Seat = require('../models/Seat');
const Flight = require('../models/Flight');
const { calculatePrice } = require('../services/pricingService');

const LOCK_DURATION_MINUTES = 10; // seats auto-unlock after 10 min

// Release any locks on this flight that have expired
const releaseExpiredLocks = async (flightId) => {
  const now = new Date();
  await Seat.updateMany(
    { flightId, status: 'LOCKED', lockExpiry: { $lt: now } },
    { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
  );
};

// POST /api/seats/lock — seat locking to prevent double-booking while a
// user fills in passenger + payment details.
exports.lockSeats = async (req, res) => {
  try {
    const { flightId, seatNumbers } = req.body;
    const userId = req.user._id;

    if (!flightId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ success: false, message: 'flightId and seatNumbers are required.' });
    }

    await releaseExpiredLocks(flightId);

    const seats = await Seat.find({ flightId, seatNumber: { $in: seatNumbers } });
    if (seats.length !== seatNumbers.length) {
      return res.status(404).json({ success: false, message: 'One or more seats not found.' });
    }

    const unavailable = seats.filter(
      s => s.status !== 'AVAILABLE' && !(s.status === 'LOCKED' && s.lockedBy?.toString() === userId.toString())
    );
    if (unavailable.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Seat(s) ${unavailable.map(s => s.seatNumber).join(', ')} are not available.`
      });
    }

    const lockExpiry = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

    // Release this user's older locks on the same flight first
    await Seat.updateMany(
      { flightId, lockedBy: userId, status: 'LOCKED' },
      { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
    );

    await Seat.updateMany(
      { flightId, seatNumber: { $in: seatNumbers } },
      { status: 'LOCKED', lockedBy: userId, lockedAt: new Date(), lockExpiry }
    );

    const updatedSeats = await Seat.find({ flightId, seatNumber: { $in: seatNumbers } });

    res.json({
      success: true,
      message: `${seatNumbers.length} seat(s) locked for ${LOCK_DURATION_MINUTES} minutes.`,
      seats: updatedSeats,
      lockExpiry
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/seats/release — seat deselection / navigating away
exports.releaseSeats = async (req, res) => {
  try {
    const { flightId, seatNumbers } = req.body;
    const userId = req.user._id;

    await Seat.updateMany(
      { flightId, seatNumber: { $in: seatNumbers }, lockedBy: userId, status: 'LOCKED' },
      { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
    );

    res.json({ success: true, message: 'Seat(s) released.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/seats/price?flightId=&seatNumber=  (single-seat quick lookup)
exports.getSeatPrice = async (req, res) => {
  try {
    const { flightId, seatNumber } = req.query;

    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

    const seat = await Seat.findOne({ flightId, seatNumber });
    if (!seat) return res.status(404).json({ success: false, message: 'Seat not found.' });

    const priceBreakdown = await calculatePrice(flight, seat, 1);

    res.json({ success: true, priceBreakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
