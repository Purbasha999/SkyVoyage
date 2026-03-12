const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const User = require('../models/User');
const PricingRule = require('../models/PricingRule');

const createSeatsForFlight = async (flightId, layout) => {
  const { rows, columnLabels } = layout;
  const businessRows = rows < 35 ? 2 : 3;
  const seats = [];

  for (let row = 1; row <= rows; row++) {
    for (let colIdx = 0; colIdx < columnLabels.length; colIdx++) {
      const col = columnLabels[colIdx];
      const seatNumber = `${row}${col}`;

      let seatType = 'MIDDLE';
      if (col === 'A' || col === columnLabels[columnLabels.length - 1]) seatType = 'WINDOW';
      else if (col === 'C' || col === 'D') seatType = 'AISLE';

      const seatClass = row <= businessRows ? 'BUSINESS' : 'ECONOMY';  // ← new

      seats.push({ flightId, seatNumber, row, column: col, seatType, seatClass });
    }
  }

  await Seat.insertMany(seats);
  return seats.length;
};

// POST /api/admin/flights
exports.createFlight = async (req, res) => {
  try {
    const { flightNumber, airline, source, destination, departureTime, arrivalTime, basePrice, rows = 10, columns = 6 } = req.body;

    if (!flightNumber || !airline || !source || !destination || !departureTime || !arrivalTime || !basePrice) {
      return res.status(400).json({ success: false, message: 'All flight fields are required.' });
    }

    const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, columns);
    const totalSeats = rows * columns;

    const flight = await Flight.create({
      flightNumber,
      airline,
      source: source.toUpperCase(),
      destination: destination.toUpperCase(),
      departureTime,
      arrivalTime,
      basePrice,
      totalSeats,
      seatLayout: { rows, columns, columnLabels }
    });

    const seatCount = await createSeatsForFlight(flight._id, { rows, columnLabels });

    res.status(201).json({
      success: true,
      message: `Flight created with ${seatCount} seats.`,
      flight
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Flight number already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/flights/:id
exports.updateFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });
    res.json({ success: true, message: 'Flight updated.', flight });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/flights/:id
exports.deleteFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });
    await Seat.deleteMany({ flightId: req.params.id });
    await Booking.updateMany({ flightId: req.params.id }, { $set: { status: "CANCELLED" }});
    res.json({ success: true, message: 'Flight and its seats and bookings deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email')
      .populate('flightId', 'flightNumber airline source destination departureTime')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);

    res.json({ success: true, total, page: Number(page), bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalFlights, totalBookings, totalUsers, revenue] = await Promise.all([
      Flight.countDocuments(),
      Booking.countDocuments({ status: 'CONFIRMED' }),
      User.countDocuments({ role: 'user' }),
      Booking.aggregate([
        { $match: { status: 'CONFIRMED' } },
        { $group: { _id: null, total: { $sum: '$priceBreakdown.finalPrice' } } }
      ])
    ]);

    const cancelledBookings = await Booking.countDocuments({ status: 'CANCELLED' });

    res.json({
      success: true,
      stats: {
        totalFlights,
        totalBookings,
        totalUsers,
        cancelledBookings,
        totalRevenue: revenue[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPricingRules = async (req, res) => {
  try {
    const rules = await PricingRule.find().sort({ type: 1 });
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.create(req.body);
    res.status(201).json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePricingRule = async (req, res) => {
  try {
    await PricingRule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Pricing rule deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
