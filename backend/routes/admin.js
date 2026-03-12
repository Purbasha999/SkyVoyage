const express = require('express');
const router = express.Router();
const {
  createFlight, updateFlight, deleteFlight,
  getAllBookings, getDashboardStats,
  getPricingRules, createPricingRule, updatePricingRule, deletePricingRule
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.post('/flights', createFlight);
router.put('/flights/:id', updateFlight);
router.delete('/flights/:id', deleteFlight);

router.get('/bookings', getAllBookings);
router.get('/stats', getDashboardStats);

router.get('/pricing-rules', getPricingRules);
router.post('/pricing-rules', createPricingRule);
router.put('/pricing-rules/:id', updatePricingRule);
router.delete('/pricing-rules/:id', deletePricingRule);

module.exports = router;
