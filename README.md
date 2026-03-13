# ✈ SkyVoyage

A full-stack flight booking web application with real-time seat selection, dynamic pricing, and instant confirmations.

**Live Demo:** [sky-voyage-lac.vercel.app](https://sky-voyage-lac.vercel.app)

---

## Features

### For Users
- **Flight Search** — Search flights by route, date, and passenger count
- **Seat Selection** — Interactive seat map with business and economy class
- **Dynamic Pricing** — Real-time price breakdown based on demand, booking time, seat type, and class
- **Passenger Details** — Per-seat passenger name and phone number at checkout
- **Instant Booking** — Confirm multiple seats in one transaction
- **Booking History** — View, group, and cancel bookings

### For Admins
- **Flight Management** — Create and delete flights with custom seat layouts
- **Pricing Rules** — Add and remove dynamic pricing rules (demand, time, seat type, business class)
- **Booking Overview** — View all bookings across all users with live stats
- **Dashboard Stats** — Total flights, revenue, confirmed and cancelled bookings

---

## Tech Stack

**Frontend**
- React, React Router
- Material UI Icons
- Axios

**Backend**
- Node.js, Express
- MongoDB, Mongoose
- JSON Web Tokens (JWT)
- bcryptjs

**Deployment**
- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Clone the repo
```bash
git clone https://github.com/your-username/skyvoyage.git
cd skyvoyage
```

### 2. Set up the backend
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
MONGODB_URI=mongodb://localhost:27017/skyvoyage
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
PORT=5000
ADMIN_CODE=your_admin_code
CLIENT_URL=http://localhost:3000
```

Seed the database:
```bash
node seed.js
```

Start the server:
```bash
npm run dev
```

### 3. Set up the frontend
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the app:
```bash
npm start
```

---

## Default Credentials (after seeding)

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@gmail.com | admin123 |
| User  | user@gmail.com | user123 |

---

## Project Structure

```
skyvoyage/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/        # AuthContext
│   │   ├── constants/      # cities.js
│   │   ├── pages/          # Home, Login, Register, SeatSelection, etc.
│   │   └── services/       # api.js (Axios)
│   └── .env
│
└── backend/
    ├── controllers/        # auth, booking, seat, admin
    ├── middleware/         # auth.js (JWT protect, adminOnly)
    ├── models/             # User, Flight, Seat, Booking, PricingRule
    ├── routes/
    ├── services/           # pricingService.js
    ├── seed.js
    └── .env
```

---

## Dynamic Pricing Rules

Prices are calculated at seat selection time based on active rules in the database:

| Type | Trigger | Example |
|------|---------|---------|
| `DEMAND` | Occupancy exceeds threshold % | +₹1,000 when 70%+ seats booked |
| `TIME` | Booking within X hours of departure | +₹1,500 within 48 hours |
| `SEAT_TYPE` | Window / Aisle / Middle seat | +₹300 for window |
| `SEAT_TYPE` | Business class | +₹12,000 for business |

Admins can add, remove, and configure rules from the dashboard without touching code.

---

## Deployment

### Frontend (Vercel)
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `build`
- Environment variable: `REACT_APP_API_URL=https://your-render-url.onrender.com/api`

### Backend (Render)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables: all vars from backend `.env`
