const Seat = require('../models/Seat');
const PricingRule = require('../models/PricingRule');

/**
 * Calculate dynamic price for a seat on a flight
 * @param {Object} flight - Flight document
 * @param {Object} seat - Seat document
 * @returns {Object} priceBreakdown
 */
const calculatePrice = async (flight, seat) => {
  const basePrice = flight.basePrice;
  const appliedRules = [];    // [{ name, charge, type }]

  const rules = await PricingRule.find({ isActive: true });

  const totalSeats = await Seat.countDocuments({ flightId: flight._id });
  const bookedSeats = await Seat.countDocuments({ flightId: flight._id, status: 'BOOKED' });
  const occupancyPercent = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

  const now = new Date();
  const departure = new Date(flight.departureTime);
  const hoursUntilDeparture = (departure - now) / (1000 * 60 * 60);

  if (rules.length > 0) {
    for (const rule of rules) {
      if (!rule.isActive) continue;

      switch (rule.type) {
        case 'DEMAND':
          if (rule.condition.threshold && occupancyPercent >= rule.condition.threshold) {
            appliedRules.push({ name: rule.name, charge: rule.charge, type: rule.type });
          }
          break;

        case 'TIME':
          if (rule.condition.hoursBeforeDeparture && hoursUntilDeparture <= rule.condition.hoursBeforeDeparture) {
            appliedRules.push({ name: rule.name, charge: rule.charge, type: rule.type });
          }
          break;

        case 'SEAT_TYPE':
          if (
            (rule.condition.seatType && seat.seatType === rule.condition.seatType) ||
            (rule.condition.seatClass && seat.seatClass === rule.condition.seatClass)
          ) {
            appliedRules.push({ name: rule.name, charge: rule.charge, type: rule.type });
          }
          break;
      }
    }
  } else { // fallback
    if (hoursUntilDeparture <= 24) appliedRules.push({ name: 'Late Booking', charge: 1500, type: 'TIME' });
    if (seat.seatClass === 'BUSINESS') appliedRules.push({ name: 'Business Class',  charge: 12000, type: 'SEAT_TYPE' });
  }

  const surchargeTotal = appliedRules.reduce((sum, r) => sum + r.charge, 0);
  const finalPrice = basePrice + surchargeTotal;

  return {
    basePrice,
    appliedRules,
    finalPrice,
    occupancyPercent: Math.round(occupancyPercent),
    hoursUntilDeparture: Math.round(hoursUntilDeparture)
  };
};

module.exports = { calculatePrice };