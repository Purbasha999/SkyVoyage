const PromoCode = require('../models/PromoCode');

// POST /api/promo/apply  { code, totalPrice, isStudent }
exports.applyPromo = async (req, res) => {
  try {
    const { code, totalPrice, isStudent } = req.body;

    if (!code || totalPrice == null) {
      return res.status(400).json({ success: false, message: 'code and totalPrice are required.' });
    }

    const promo = await PromoCode.findOne({ code: String(code).toUpperCase(), isActive: true });

    if (!promo) {
      return res.status(400).json({ success: false, message: 'Invalid or expired promo code.' });
    }

    if (promo.expiryDate && promo.expiryDate < new Date()) {
      return res.status(400).json({ success: false, message: 'This promo code has expired.' });
    }

    if (promo.isStudentOnly && !isStudent) {
      return res.status(403).json({ success: false, message: 'This code is only valid for student accounts.' });
    }

    let discount = 0;
    if (promo.discountType === 'PERCENT') {
      discount = (promo.discountValue / 100) * totalPrice;
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    } else {
      discount = promo.discountValue;
    }
    discount = Math.min(Math.round(discount), totalPrice);

    res.json({
      success: true,
      discount,
      finalPrice: totalPrice - discount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
