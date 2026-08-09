const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: {
    type: String,
    enum: ['meal', 'baggage'],
    required: true
  },
  veg: { type: Boolean, default: null },
  baggageWeight: { type: Number, default: null },
  maxQuantity: { type: Number, default: 1 },
  description: String,
  image: String,
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AddOn', addOnSchema);
