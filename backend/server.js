const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/addons', require('./routes/addons'));
app.use('/api/promo', require('./routes/promo'));

app.get('/api/health', (req, res) => res.json({ status: 'SkyVoyage API running' }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');

    // Sweep every flight for expired seat locks once a minute, so seats
    // free up even if nobody happens to reload that flight's seat map.
    const Seat = require('./models/Seat');
    cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const result = await Seat.updateMany(
          { status: 'LOCKED', lockExpiry: { $lt: now } },
          { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
        );
        if (result.modifiedCount > 0) {
          console.log(`Released ${result.modifiedCount} expired seat lock(s)`);
        }
      } catch (err) {
        console.error('Expired lock sweep failed:', err.message);
      }
    });

    const PORT = process.env.PORT;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
