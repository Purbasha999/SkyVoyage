const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    unique: true,
    required: true
  },
  // Links every seat booked together in one checkout (multi-seat and
  // round-trip bookings create several Booking docs sharing a groupId).
  groupId: {
    type: String,
    index: true
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
  passengerAge: { type: Number },
  passengerGender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
  passengerEmail: { type: String, required: true },
  passengerPhone: { type: String },
  // Add-ons (meals/baggage) and promo discount apply once per checkout;
  // they're only populated on the first Booking doc within a groupId.
  addOns: {
    type: [{
      name: { type: String },
      price: { type: Number },
      type: { type: String },
      baggageWeight: { type: Number }
    }],
    default: []
  },
  priceBreakdown: {
    basePrice: { type: Number, required: true },
    demandCharge: { type: Number, default: 0 },
    lateBookingCharge: { type: Number, default: 0 },
    seatTypeCharge: { type: Number, default: 0 },
    seatClassCharge: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    mealTotal: { type: Number, default: 0 },
    baggageTotal: { type: Number, default: 0 },
    addOnTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['CONFIRMED', 'CANCELLED'],
    default: 'CONFIRMED'
  },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ bookingReference: 1 });

bookingSchema.statics.generateReference = function () {
  const prefix = 'SV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

bookingSchema.statics.generateGroupId = function () {
  return `GRP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

module.exports = mongoose.model('Booking', bookingSchema);
