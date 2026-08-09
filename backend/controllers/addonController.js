const AddOn = require('../models/AddOn');

// GET /api/addons?type=meal&veg=true
exports.getAddOns = async (req, res) => {
  try {
    const { type, veg } = req.query;
    const filter = { available: true };

    if (type) filter.type = type;
    if (veg !== undefined) filter.veg = veg === 'true';

    const addons = await AddOn.find(filter);
    res.json({ success: true, addons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
