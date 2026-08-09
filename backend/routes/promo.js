const express = require('express');
const router = express.Router();
const { applyPromo } = require('../controllers/promoController');

router.post('/apply', applyPromo);

module.exports = router;
