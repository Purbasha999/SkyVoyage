const express = require('express');
const router = express.Router();
const { searchFlights, getFlightById, getAllFlights } = require('../controllers/flightController');

router.get('/search', searchFlights);
router.get('/', getAllFlights);
router.get('/:id', getFlightById);

module.exports = router;
