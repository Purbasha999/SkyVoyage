const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  airline: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  destination: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  departureTime: {
    type: Date,
    required: true
  },
  arrivalTime: {
    type: Date,
    required: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalSeats: {
    type: Number,
    required: true,
    default: 60
  },
  seatLayout: {
    rows: { type: Number, default: 10 },
    columns: { type: Number, default: 6 },
    columnLabels: { type: [String], default: ['A', 'B', 'C', 'D', 'E', 'F'] }
  },
  amenities: [String],
  status: {
    type: String,
    enum: ['SCHEDULED', 'DELAYED', 'CANCELLED', 'COMPLETED'],
    default: 'SCHEDULED'
  },
  createdAt: { type: Date, default: Date.now }
});

flightSchema.virtual('availableSeatsCount', {
  ref: 'Seat',
  localField: '_id',
  foreignField: 'flightId',
  count: true,
  match: { status: 'AVAILABLE' }
});

module.exports = mongoose.model('Flight', flightSchema);
