const express = require('express');
const router = express.Router();
const { getAddOns } = require('../controllers/addonController');

router.get('/', getAddOns);

module.exports = router;
