const express = require('express');
const router = express.Router();
const { lockSeats, releaseSeats, getSeatPrice } = require('../controllers/seatController');
const { protect } = require('../middleware/auth');

router.post('/lock', protect, lockSeats);
router.post('/release', protect, releaseSeats);
router.get('/price', protect, getSeatPrice);

module.exports = router;
