const express = require('express');
const router = express.Router();
const { bookSeats, getSeatPrice } = require('../controllers/seatController');
const { protect } = require('../middleware/auth');

router.post('/book', protect, bookSeats);
router.get('/price', protect, getSeatPrice);

module.exports = router;