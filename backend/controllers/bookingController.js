const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const Flight = require('../models/Flight');
const { calculatePrice } = require('../services/pricingService');

// POST /api/bookings/confirm
exports.confirmBooking = async (req, res) => {
  try {
    const { flightId, seats: seatBookings } = req.body;
    const userId = req.user._id;

    if (!flightId || !Array.isArray(seatBookings) || seatBookings.length === 0) {
      return res.status(400).json({ success: false, message: 'flightId and seats array are required.' });
    }

    for (const s of seatBookings) {
      if (!s.seatNumber || !s.passengerName?.trim()) {
        return res.status(400).json({ success: false, message: `passengerName is required for every seat (missing for ${s.seatNumber || 'unknown'}).` });
      }
    }

    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

    const seatNumbers = seatBookings.map(s => s.seatNumber);
    const seats = await Seat.find({ flightId, seatNumber: { $in: seatNumbers } });

    if (seats.length !== seatNumbers.length) {
      return res.status(404).json({ success: false, message: 'One or more seats not found.' });
    }

    const alreadyBooked = seats.filter(s => s.status === 'BOOKED');
    if (alreadyBooked.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Seat(s) ${alreadyBooked.map(s => s.seatNumber).join(', ')} are already booked. Please go back and choose different seats.`
      });
    }

    const createdBookings = await Promise.all(
      seats.map(async (seat) => {
        const info = seatBookings.find(s => s.seatNumber === seat.seatNumber);
        const priceBreakdown = await calculatePrice(flight, seat);
        const bookingRef = Booking.generateReference();

        const booking = await Booking.create({
          bookingReference: bookingRef,
          userId,
          flightId,
          seatId: seat._id,
          seatNumber: seat.seatNumber,
          passengerName: info.passengerName.trim(),
          passengerEmail: req.user.email,
          passengerPhone: info.passengerPhone?.trim() || '',
          priceBreakdown,
          status: 'CONFIRMED'
        });

        seat.status = 'BOOKED';
        seat.bookedBy = userId;
        seat.passengerName = info.passengerName.trim();
        seat.passengerPhone = info.passengerPhone?.trim() || '';
        await seat.save();

        return booking;
      })
    );

    const populatedBookings = await Booking.find({ _id: { $in: createdBookings.map(b => b._id) } })
      .populate('flightId', 'flightNumber airline source destination departureTime arrivalTime')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(201).json({
      success: true,
      message: `${createdBookings.length} booking(s) confirmed successfully!`,
      bookings: populatedBookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking.' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Cancelled by user';
    await booking.save();

    const seat = await Seat.findById(booking.seatId);
    if (seat) {
      seat.status = 'AVAILABLE';
      seat.bookedBy = null;
      seat.passengerName = null;
      seat.passengerPhone = null;
      await seat.save();
    }

    res.json({ success: true, message: 'Booking cancelled successfully. Seat is now available again.', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/user
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('flightId', 'flightNumber airline source destination departureTime arrivalTime')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/:id
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('flightId')
      .populate('userId', 'name email');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};