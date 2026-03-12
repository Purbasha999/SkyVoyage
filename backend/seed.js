const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Flight = require('./models/Flight');
const Seat = require('./models/Seat');
const PricingRule = require('./models/PricingRule');
const Booking = require('./models/Booking');

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
    type: 'SEAT_TYPE',
    condition: { seatClass: 'BUSINESS' },
    charge: 12000
  }  
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
      Booking.deleteMany({})
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

    console.log('\nSeeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();