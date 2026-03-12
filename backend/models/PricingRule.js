const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['DEMAND', 'TIME', 'SEAT_TYPE'],
    required: true
  },
  condition: {
    // For DEMAND: price increases if more than {threshold}% seats are booked
    // For TIME: price increases if booking made within {hoursBeforeDeparture} hours
    // For SEAT_TYPE: price increases for {seatType} or {seatClass}
    threshold: Number,
    hoursBeforeDeparture: Number,
    seatType: String,
    seatClass: String
  },
  charge: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
