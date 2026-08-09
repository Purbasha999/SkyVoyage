const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['PERCENT', 'FLAT'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscount: { type: Number, default: null },
  isStudentOnly: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  expiryDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', promoSchema);
