const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  flightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: true
  },
  seatNumber: {
    type: String,
    required: true
  },
  row: { type: Number, required: true },
  column: { type: String, required: true },
  seatType: {
    type: String,
    enum: ['WINDOW', 'MIDDLE', 'AISLE'],
    required: true
  },
  seatClass: {
    type: String,
    enum: ['ECONOMY', 'BUSINESS'],
    default: 'ECONOMY'
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'LOCKED', 'BOOKED'],
    default: 'AVAILABLE'
  },
  // Concurrency handling: a seat is held for a short window while a user
  // fills in passenger/payment details, then either confirmed or released.
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockExpiry: {
    type: Date,
    default: null
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

seatSchema.index({ flightId: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ flightId: 1, status: 1 });

module.exports = mongoose.model('Seat', seatSchema);
