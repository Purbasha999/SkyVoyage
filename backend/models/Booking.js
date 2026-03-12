const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: true
  },
  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true
  },
  seatNumber: { type: String, required: true },
  passengerName: { type: String, required: true },
  passengerEmail: { type: String, required: true },
  passengerPhone: { type: String },
  priceBreakdown: {
    basePrice: { type: Number, required: true },
    demandCharge: { type: Number, default: 0 },
    lateBookingCharge: { type: Number, default: 0 },
    seatTypeCharge: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['LOCKED', 'CONFIRMED', 'CANCELLED'],
    default: 'CONFIRMED'
  },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ bookingReference: 1 });

bookingSchema.statics.generateReference = function () {
  const prefix = 'FW';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

module.exports = mongoose.model('Booking', bookingSchema);
