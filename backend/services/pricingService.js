const Seat = require('../models/Seat');
const PricingRule = require('../models/PricingRule');

/**
 * Calculate dynamic price for one or more seats on a flight.
 *
 * Flight-level surcharges (DEMAND, TIME) apply once for the whole group of
 * passengers, not once per seat. Seat-level surcharges (SEAT_TYPE, CLASS)
 * apply per matching seat. 18% GST is applied on the subtotal.
 *
 * @param {Object} flight          Flight document
 * @param {Object|Array} seats     A single Seat doc, or an array of them
 * @param {Number} passengerCount  Defaults to seats.length (min 1)
 * @returns {Object} priceBreakdown — also includes `perSeat`, a map of
 *   seatNumber -> { seatTypeCharge, seatClassCharge } for attributing
 *   charges back to individual Booking documents.
 */
const calculatePrice = async (flight, seats, passengerCount) => {
  const seatsArr = Array.isArray(seats) ? seats : (seats ? [seats] : []);
  const numPassengers = passengerCount || seatsArr.length || 1;

  const basePrice = flight.basePrice * numPassengers;
  let demandCharge = 0;
  let lateBookingCharge = 0;
  const appliedRules = [];
  const perSeat = {};
  seatsArr.forEach(s => { perSeat[s.seatNumber] = { seatTypeCharge: 0, seatClassCharge: 0 }; });

  const rules = await PricingRule.find({ isActive: true });

  const totalSeats = await Seat.countDocuments({ flightId: flight._id });
  const bookedSeats = await Seat.countDocuments({
    flightId: flight._id,
    status: { $in: ['BOOKED', 'LOCKED'] }
  });
  const occupancyPercent = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

  const now = new Date();
  const departure = new Date(flight.departureTime);
  const hoursUntilDeparture = (departure - now) / (1000 * 60 * 60);

  let demandApplied = false;
  let timeApplied = false;

  for (const rule of rules) {
    if (!rule.isActive) continue;

    switch (rule.type) {
      case 'DEMAND':
        if (!demandApplied && rule.condition?.threshold != null && occupancyPercent >= rule.condition.threshold) {
          demandCharge += rule.charge;
          demandApplied = true;
          appliedRules.push({ name: rule.name, type: rule.type, charge: rule.charge });
        }
        break;

      case 'TIME':
        if (!timeApplied && rule.condition?.hoursBeforeDeparture != null && hoursUntilDeparture <= rule.condition.hoursBeforeDeparture) {
          lateBookingCharge += rule.charge;
          timeApplied = true;
          appliedRules.push({ name: rule.name, type: rule.type, charge: rule.charge });
        }
        break;

      case 'SEAT_TYPE':
        for (const seat of seatsArr) {
          if (rule.condition?.seatType && seat.seatType === rule.condition.seatType) {
            perSeat[seat.seatNumber].seatTypeCharge += rule.charge;
            appliedRules.push({ name: `${rule.name} (${seat.seatNumber})`, type: rule.type, charge: rule.charge });
          } else if (rule.condition?.seatClass && seat.seatClass === rule.condition.seatClass) {
            perSeat[seat.seatNumber].seatClassCharge += rule.charge;
            appliedRules.push({ name: `${rule.name} (${seat.seatNumber})`, type: rule.type, charge: rule.charge });
          }
        }
        break;

      case 'CLASS':
        for (const seat of seatsArr) {
          if (rule.condition?.class && seat.seatClass === rule.condition.class) {
            perSeat[seat.seatNumber].seatClassCharge += rule.charge;
            appliedRules.push({ name: `${rule.name} (${seat.seatNumber})`, type: rule.type, charge: rule.charge });
          }
        }
        break;

      default:
        break;
    }
  }

  // Fallback defaults when no rules exist in the DB yet
  if (rules.length === 0) {
    if (occupancyPercent >= 70) {
      demandCharge = 1000;
      appliedRules.push({ name: 'High Demand Surcharge', type: 'DEMAND', charge: 1000 });
    }
    if (hoursUntilDeparture <= 48) {
      lateBookingCharge = 1500;
      appliedRules.push({ name: 'Last-Minute Surcharge', type: 'TIME', charge: 1500 });
    }
    for (const seat of seatsArr) {
      if (seat.seatType === 'WINDOW') {
        perSeat[seat.seatNumber].seatTypeCharge += 300;
        appliedRules.push({ name: `Window Seat (${seat.seatNumber})`, type: 'SEAT_TYPE', charge: 300 });
      } else if (seat.seatType === 'AISLE') {
        perSeat[seat.seatNumber].seatTypeCharge += 150;
        appliedRules.push({ name: `Aisle Seat (${seat.seatNumber})`, type: 'SEAT_TYPE', charge: 150 });
      }
      if (seat.seatClass === 'BUSINESS') {
        perSeat[seat.seatNumber].seatClassCharge += 12000;
        appliedRules.push({ name: `Business Class (${seat.seatNumber})`, type: 'CLASS', charge: 12000 });
      }
    }
  }

  const seatTypeCharge = Object.values(perSeat).reduce((s, v) => s + v.seatTypeCharge, 0);
  const seatClassCharge = Object.values(perSeat).reduce((s, v) => s + v.seatClassCharge, 0);

  const subtotal = basePrice + demandCharge + lateBookingCharge + seatTypeCharge + seatClassCharge;
  const taxes = Math.round(subtotal * 0.18);
  const finalPrice = subtotal + taxes;

  return {
    basePrice,
    demandCharge,
    lateBookingCharge,
    seatTypeCharge,
    seatClassCharge,
    taxes,
    finalPrice,
    appliedRules,
    perSeat,
    occupancyPercent: Math.round(occupancyPercent),
    hoursUntilDeparture: Math.round(hoursUntilDeparture)
  };
};

/**
 * Split an integer total across n buckets so the parts sum back to the
 * total exactly (remainder goes to the first buckets). Used to attribute
 * flight-level charges (demand/late/taxes) across per-seat Booking docs.
 */
const splitEven = (total, n, i) => {
  if (n <= 0) return 0;
  const base = Math.floor(total / n);
  const remainder = total % n;
  return base + (i < remainder ? 1 : 0);
};

module.exports = { calculatePrice, splitEven };
