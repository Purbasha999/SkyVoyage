const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Flight = require('./models/Flight');
const Seat = require('./models/Seat');
const PricingRule = require('./models/PricingRule');
const Booking = require('./models/Booking');
const AddOn = require('./models/AddOn');
const PromoCode = require('./models/PromoCode');

const MONGODB_URI = process.env.MONGODB_URI;

const createSeats = async (flightId, rows, columnLabels) => {
  const businessRows = rows < 35 ? 2 : 3;
  const seats = [];
  for (let row = 1; row <= rows; row++) {
    for (let colIdx = 0; colIdx < columnLabels.length; colIdx++) {
      const col = columnLabels[colIdx];
      let seatType = 'MIDDLE';
      if (col === 'A' || col === columnLabels[columnLabels.length - 1]) seatType = 'WINDOW';
      else if (col === 'C' || col === 'D') seatType = 'AISLE';
      const seatClass = row <= businessRows ? 'BUSINESS' : 'ECONOMY';
      seats.push({ flightId, seatNumber: `${row}${col}`, row, column: col, seatType, seatClass });
    }
  }
  return Seat.insertMany(seats);
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const flightsData = [
  {
    flightNumber: 'ID101', airline: 'Indigo',
    source: 'DEL', destination: 'BOM',
    departureTime: new Date(addDays(today, 1).setHours(6, 0)),
    arrivalTime: new Date(addDays(today, 1).setHours(8, 15)),
    basePrice: 4500
  },
  {
    flightNumber: 'ID102', airline: 'Indigo',
    source: 'DEL', destination: 'BOM',
    departureTime: new Date(addDays(today, 1).setHours(14, 30)),
    arrivalTime: new Date(addDays(today, 1).setHours(16, 45)),
    basePrice: 3800
  },
  {
    flightNumber: 'AI201', airline: 'Air India',
    source: 'BOM', destination: 'BLR',
    departureTime: new Date(addDays(today, 1).setHours(9, 0)),
    arrivalTime: new Date(addDays(today, 1).setHours(11, 0)),
    basePrice: 3200
  },
  {
    flightNumber: 'AI202', airline: 'Air India',
    source: 'BOM', destination: 'BLR',
    departureTime: new Date(addDays(today, 2).setHours(18, 0)),
    arrivalTime: new Date(addDays(today, 2).setHours(20, 0)),
    basePrice: 2900
  },
  {
    flightNumber: 'VS301', airline: 'Vistara',
    source: 'DEL', destination: 'CCU',
    departureTime: new Date(addDays(today, 1).setHours(7, 30)),
    arrivalTime: new Date(addDays(today, 1).setHours(10, 0)),
    basePrice: 5500
  },
  {
    flightNumber: 'VS302', airline: 'Vistara',
    source: 'CCU', destination: 'DEL',
    departureTime: new Date(addDays(today, 2).setHours(11, 0)),
    arrivalTime: new Date(addDays(today, 2).setHours(13, 30)),
    basePrice: 5200
  },
  {
    flightNumber: 'AK401', airline: 'Akasa Air',
    source: 'BLR', destination: 'HYD',
    departureTime: new Date(addDays(today, 1).setHours(15, 0)),
    arrivalTime: new Date(addDays(today, 1).setHours(16, 15)),
    basePrice: 2200
  },
  {
    flightNumber: 'ID501', airline: 'Indigo',
    source: 'DEL', destination: 'MAA',
    departureTime: new Date(addDays(today, 3).setHours(8, 0)),
    arrivalTime: new Date(addDays(today, 3).setHours(11, 0)),
    basePrice: 6000
  }
];

const pricingRulesData = [
  {
    name: 'High Demand',
    description: 'Add surcharge when 70%+ seats are booked',
    type: 'DEMAND',
    condition: { threshold: 70 },
    charge: 1000
  },
  {
    name: 'Late Booking',
    description: 'Surcharge for bookings within 48 hours of departure',
    type: 'TIME',
    condition: { hoursBeforeDeparture: 48 },
    charge: 1500
  },
  {
    name: 'Window Seat',
    description: 'Extra charge for window seats',
    type: 'SEAT_TYPE',
    condition: { seatType: 'WINDOW' },
    charge: 300
  },
  {
    name: 'Business Class',
    description: 'Premium for Business class seats',
    type: 'CLASS',
    condition: { class: 'BUSINESS' },
    charge: 12000
  }
];

const addOnsData = [
  { name: 'Veg Thali', price: 350, type: 'meal', veg: true, description: 'Dal, sabzi, rice, roti & dessert', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=60' },
  { name: 'Paneer Tikka Wrap', price: 300, type: 'meal', veg: true, description: 'Grilled paneer wrap with mint chutney', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&auto=format&fit=crop&q=60' },
  { name: 'Chicken Biryani', price: 420, type: 'meal', veg: false, description: 'Hyderabadi-style dum biryani', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&auto=format&fit=crop&q=60' },
  { name: 'Grilled Chicken Sandwich', price: 380, type: 'meal', veg: false, description: 'Grilled chicken breast with lettuce & mayo', image: 'https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=400&auto=format&fit=crop&q=60' },
  { name: '5 kg Extra Baggage', price: 800, type: 'baggage', baggageWeight: 5, description: 'Additional check-in baggage allowance' },
  { name: '10 kg Extra Baggage', price: 1500, type: 'baggage', baggageWeight: 10, description: 'Additional check-in baggage allowance' },
  { name: '15 kg Extra Baggage', price: 2100, type: 'baggage', baggageWeight: 15, description: 'Additional check-in baggage allowance' }
];

const promoCodesData = [
  { code: 'STUDENT10', discountType: 'PERCENT', discountValue: 10, maxDiscount: 1000, isStudentOnly: true },
  { code: 'FLY500', discountType: 'FLAT', discountValue: 500, isStudentOnly: false },
  { code: 'WELCOME15', discountType: 'PERCENT', discountValue: 15, maxDiscount: 2000, isStudentOnly: false }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Flight.deleteMany({}),
      Seat.deleteMany({}),
      PricingRule.deleteMany({}),
      Booking.deleteMany({}),
      AddOn.deleteMany({}),
      PromoCode.deleteMany({})
    ]);

    for (const flightData of flightsData) {
      const flight = await Flight.create({
        ...flightData,
        totalSeats: 60,
        seatLayout: { rows: 10, columns: 6, columnLabels: ['A', 'B', 'C', 'D', 'E', 'F'] }
      });
      await createSeats(flight._id, 10, ['A', 'B', 'C', 'D', 'E', 'F']);
    }

    await PricingRule.insertMany(pricingRulesData);
    await AddOn.insertMany(addOnsData);
    await PromoCode.insertMany(promoCodesData);

    // Demo accounts
    await User.create({ name: 'Admin User', email: 'admin@skyvoyage.com', password: 'admin123', role: 'admin' });
    await User.create({ name: 'Test User', email: 'user@skyvoyage.com', password: 'user1234', role: 'user' });

    console.log('\nSeeding completed successfully!');
    console.log('Admin: admin@skyvoyage.com / admin123');
    console.log('User:  user@skyvoyage.com / user1234');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();