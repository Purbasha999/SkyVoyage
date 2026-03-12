const express = require('express');
const router = express.Router();
const { confirmBooking, cancelBooking, getUserBookings, getBookingById } = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.post('/confirm', protect, confirmBooking);
router.post('/cancel', protect, cancelBooking);
router.get('/user', protect, getUserBookings);
router.get('/:id', protect, getBookingById);

module.exports = router;