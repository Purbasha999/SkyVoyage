const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    // DEMAND     → fires once when occupancy >= {threshold}%
    // TIME       → fires once when booking made within {hoursBeforeDeparture}h
    // SEAT_TYPE  → fires per seat matching {seatType} (WINDOW/MIDDLE/AISLE) or {seatClass}
    // CLASS      → fires per seat matching {class} (ECONOMY/BUSINESS)
    enum: ['DEMAND', 'TIME', 'SEAT_TYPE', 'CLASS'],
    required: true
  },
  condition: {
    threshold: Number,
    hoursBeforeDeparture: Number,
    seatType: String,
    seatClass: String,
    class: { type: String, enum: ['ECONOMY', 'BUSINESS'] }
  },
  charge: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
