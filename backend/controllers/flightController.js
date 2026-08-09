const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const { calculatePrice } = require('../services/pricingService');

// Release any locks on this flight that have expired (mirrors seatController)
const releaseExpiredLocks = async (flightId) => {
  const now = new Date();
  await Seat.updateMany(
    { flightId, status: 'LOCKED', lockExpiry: { $lt: now } },
    { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
  );
};

// GET /api/flights/search
exports.searchFlights = async (req, res) => {
  try {
    const { source, destination, date, passengers = 1 } = req.query;

    if (!source || !destination || !date) {
      return res.status(400).json({ success: false, message: 'Source, destination, and date are required.' });
    }

    const searchDate = new Date(date);
    const nextDay = new Date(searchDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const flights = await Flight.find({
      source: source.toUpperCase(),
      destination: destination.toUpperCase(),
      departureTime: { $gte: searchDate, $lt: nextDay },
      status: { $ne: 'CANCELLED' }
    }).sort({ departureTime: 1 });

    const flightsWithSeats = await Promise.all(
      flights.map(async (flight) => {
        const availableSeats = await Seat.countDocuments({ flightId: flight._id, status: 'AVAILABLE' });
        const totalSeats = await Seat.countDocuments({ flightId: flight._id });
        return {
          ...flight.toObject(),
          availableSeats,
          totalSeats
        };
      })
    );

    const filtered = flightsWithSeats.filter(f => f.availableSeats >= parseInt(passengers));

    res.json({ success: true, count: filtered.length, flights: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/flights/:id
exports.getFlightById = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found.' });
    }

    await releaseExpiredLocks(flight._id);

    const seats = await Seat.find({ flightId: flight._id }).sort({ row: 1, column: 1 });
    const availableSeats = seats.filter(s => s.status === 'AVAILABLE').length;

    res.json({ success: true, flight: { ...flight.toObject(), availableSeats }, seats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/flights
exports.getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.find().sort({ departureTime: 1 });
    res.json({ success: true, flights });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/flights/:id/price — combined price preview for a set of seats
// (flight-level surcharges applied once for the whole party, not per seat).
exports.getFlightPrice = async (req, res) => {
  try {
    const { seatNumbers = [], passengers = 1 } = req.body;
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

    let seats = [];
    if (seatNumbers.length > 0) {
      seats = await Seat.find({ flightId: flight._id, seatNumber: { $in: seatNumbers } });
    }

    const priceBreakdown = await calculatePrice(flight, seats, passengers);
    res.json({ success: true, priceBreakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
