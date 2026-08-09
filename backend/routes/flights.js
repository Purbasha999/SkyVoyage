const express = require('express');
const router = express.Router();
const { searchFlights, getFlightById, getAllFlights, getFlightPrice } = require('../controllers/flightController');
const { protect } = require('../middleware/auth');

router.get('/search', searchFlights);
router.get('/', getAllFlights);
router.get('/:id', getFlightById);
router.post('/:id/price', protect, getFlightPrice);

module.exports = router;
