const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const Flight = require('../models/Flight');
const { calculatePrice, splitEven } = require('../services/pricingService');

const cleanAddOns = (addOns) => {
  let safe = [];
  if (Array.isArray(addOns)) safe = addOns;
  else if (typeof addOns === 'string') {
    try { safe = JSON.parse(addOns); } catch { safe = []; }
  }
  if (!Array.isArray(safe)) safe = [];

  return safe.map(a => ({
    name: a?.name || 'Unknown',
    price: Number(a?.price) || 0,
    type: a?.type || (a?.baggageWeight ? 'baggage' : 'meal'),
    baggageWeight: a?.baggageWeight || null
  }));
};

// POST /api/bookings/confirm
// Seats must already be LOCKED by this user (see seatController.lockSeats).
// Every seat in the request becomes its own Booking document, all sharing
// one groupId so multi-seat / round-trip checkouts can be displayed and
// cancelled together.
exports.confirmBooking = async (req, res) => {
  try {
    const { flightId, seats: seatBookings, addOns = [], discount = 0, groupId: requestedGroupId } = req.body;
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

    // Seats must be locked by this user — proves nobody else grabbed them
    // between seat-map selection and checkout.
    const seats = await Seat.find({
      flightId,
      seatNumber: { $in: seatNumbers },
      lockedBy: userId,
      status: 'LOCKED'
    });

    if (seats.length !== seatNumbers.length) {
      return res.status(409).json({
        success: false,
        message: 'Seat lock expired or seats not locked by you. Please re-select seats.'
      });
    }

    const combined = await calculatePrice(flight, seats, seats.length);

    const cleanedAddOns = cleanAddOns(addOns);
    const addOnTotal = cleanedAddOns.reduce((sum, a) => sum + a.price, 0);
    const mealTotal = cleanedAddOns.filter(a => a.type === 'meal').reduce((sum, a) => sum + a.price, 0);
    const baggageTotal = cleanedAddOns.filter(a => a.type === 'baggage').reduce((sum, a) => sum + a.price, 0);

    const groupTotalBeforeDiscount = combined.finalPrice + addOnTotal;
    const safeDiscount = Math.max(0, Math.min(Number(discount) || 0, groupTotalBeforeDiscount));

    const groupId = requestedGroupId || Booking.generateGroupId();
    const n = seats.length;

    const createdBookings = await Promise.all(seats.map(async (seat, idx) => {
      const info = seatBookings.find(s => s.seatNumber === seat.seatNumber);
      const isFirst = idx === 0;
      const own = combined.perSeat[seat.seatNumber] || { seatTypeCharge: 0, seatClassCharge: 0 };

      const demandShare = splitEven(combined.demandCharge, n, idx);
      const lateShare = splitEven(combined.lateBookingCharge, n, idx);
      const taxShare = splitEven(combined.taxes, n, idx);
      const discountShare = isFirst ? safeDiscount : 0;

      const seatSubtotal = flight.basePrice + own.seatTypeCharge + own.seatClassCharge + demandShare + lateShare;
      const finalPrice = Math.max(0, seatSubtotal + taxShare + (isFirst ? addOnTotal : 0) - discountShare);

      const bookingRef = Booking.generateReference();

      const booking = await Booking.create({
        bookingReference: bookingRef,
        groupId,
        userId,
        flightId,
        seatId: seat._id,
        seatNumber: seat.seatNumber,
        passengerName: info.passengerName.trim(),
        passengerAge: info.passengerAge ? Number(info.passengerAge) : undefined,
        passengerGender: info.passengerGender || undefined,
        passengerEmail: req.user.email,
        passengerPhone: info.passengerPhone?.trim() || '',
        addOns: isFirst ? cleanedAddOns : [],
        priceBreakdown: {
          basePrice: flight.basePrice,
          demandCharge: demandShare,
          lateBookingCharge: lateShare,
          seatTypeCharge: own.seatTypeCharge,
          seatClassCharge: own.seatClassCharge,
          taxes: taxShare,
          mealTotal: isFirst ? mealTotal : 0,
          baggageTotal: isFirst ? baggageTotal : 0,
          addOnTotal: isFirst ? addOnTotal : 0,
          discount: discountShare,
          finalPrice
        },
        status: 'CONFIRMED'
      });

      seat.status = 'BOOKED';
      seat.bookedBy = userId;
      seat.lockedBy = null;
      seat.lockedAt = null;
      seat.lockExpiry = null;
      await seat.save();

      return booking;
    }));

    const populatedBookings = await Booking.find({ _id: { $in: createdBookings.map(b => b._id) } })
      .populate('flightId', 'flightNumber airline source destination departureTime arrivalTime')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(201).json({
      success: true,
      message: `${createdBookings.length} booking(s) confirmed successfully!`,
      groupId,
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
