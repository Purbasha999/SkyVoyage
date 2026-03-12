const Seat = require('../models/Seat');
const Flight = require('../models/Flight');
const { calculatePrice } = require('../services/pricingService');

// POST /api/seats/book
exports.bookSeats = async (req, res) => {
  try {
    const { flightId, seats: seatBookings } = req.body;
    const userId = req.user._id;

    if (!flightId || !Array.isArray(seatBookings) || seatBookings.length === 0) {
      return res.status(400).json({ success: false, message: 'flightId and seats array are required.' });
    }

    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

    const seatNumbers = seatBookings.map(s => s.seatNumber);
    const seats = await Seat.find({ flightId, seatNumber: { $in: seatNumbers } });

    if (seats.length !== seatNumbers.length) {
      return res.status(404).json({ success: false, message: 'One or more seats not found.' });
    }

    const unavailable = seats.filter(s => s.status === 'BOOKED');
    if (unavailable.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Seat(s) ${unavailable.map(s => s.seatNumber).join(', ')} are already booked.`
      });
    }

    const bookings = await Promise.all(
      seats.map(async (seat) => {
        const passengerInfo = seatBookings.find(s => s.seatNumber === seat.seatNumber);
        seat.status = 'BOOKED';
        seat.bookedBy = userId;
        seat.passengerName = passengerInfo.passengerName;
        seat.passengerPhone = passengerInfo.passengerPhone || '';
        await seat.save();

        const priceBreakdown = await calculatePrice(flight, seat);
        return { seat, priceBreakdown };
      })
    );

    res.json({
      success: true,
      message: `${seats.length} seat(s) booked successfully.`,
      bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/seats/price
exports.getSeatPrice = async (req, res) => {
  try {
    const { flightId, seatNumber } = req.query;

    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

    const seat = await Seat.findOne({ flightId, seatNumber });
    if (!seat) return res.status(404).json({ success: false, message: 'Seat not found.' });

    const priceBreakdown = await calculatePrice(flight, seat);

    res.json({ success: true, priceBreakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};