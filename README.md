# ✈ SkyVoyage

A full-stack flight booking web application with real-time seat locking, dynamic pricing, round-trip search, add-ons, promo codes, and downloadable e-tickets.

---

## Features

### For Travelers
- **Flight Search** — search by source, destination, date, and passenger count; one-way or round-trip
- **Round-Trip Booking** — search and select outbound + return flights in a single flow, booked together
- **Interactive Seat Map** — economy/business cabin layout with live seat status (available, locked by another user, booked)
- **Seat Locking** — selecting seats locks them for **10 minutes** so two people can't book the same seat; locks auto-release on expiry (swept every minute) or when you navigate away
- **Dynamic Pricing** — live price breakdown driven by admin-configurable rules (demand, last-minute, seat type, cabin class) plus 18% GST, computed once per booking party (not duplicated per seat)
- **Add-Ons** — meal (veg/non-veg) and excess baggage add-ons at checkout
- **Promo Codes** — flat or percentage discounts, with optional student-only codes and a max-discount cap
- **Payment** — pick UPI / Card / Net Banking and pay to confirm; no real payment gateway is wired up, this is a simulated checkout step
- **Booking History** — grouped by checkout (multi-seat and round-trip bookings show as one card), with per-booking cancellation
- **E-Tickets** — download a PDF boarding pass with a QR code per flight leg

### For Admins
- **Flight Management** — create, edit, and delete flights with a custom seat layout (rows × columns); seats are auto-generated
- **Pricing Rules** — create/edit/enable/disable rules for `DEMAND`, `TIME`, `SEAT_TYPE`, and `CLASS` surcharges without touching code
- **Booking Overview** — view every booking across all users
- **Dashboard Stats** — confirmed bookings, cancelled bookings, registered users, total revenue, active flights

Admin accounts are separate from traveler accounts (see [Demo Accounts](#demo-accounts)) and only see the Admin panel in the nav — not the traveler search/booking flow.

---

## Tech Stack

**Frontend**
- React 18, React Router v6
- Axios
- `jspdf` + `html2canvas` (PDF ticket generation), `qrcode.react` (QR codes)
- Plain CSS (design tokens in `index.css`, no component library)

**Backend**
- Node.js, Express
- MongoDB, Mongoose
- JWT authentication (`jsonwebtoken` + `bcryptjs`)
- `express-rate-limit` (200 req / 15 min), `morgan` (request logging)
- `node-cron` — sweeps expired seat locks every minute

**Deployment**
- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas

---

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB connection string (local or Atlas)

### Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env   # then fill in the values below
npm run seed            # wipes and re-seeds flights, seats, pricing rules, add-ons, promo codes, demo users
npm run dev              # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm start                 # http://localhost:3000
```

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skyvoyage
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
ADMIN_CODE=your_admin_code
CLIENT_URL=http://localhost:3000
```
`ADMIN_CODE` gates self-service admin signup — a user must know this code to register with the `admin` role (see [`Register`](frontend/src/pages/Register.jsx)).

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Demo Accounts
Created by `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@skyvoyage.com` | `admin123` |
| User | `user@skyvoyage.com` | `user1234` |

---

## Project Structure

```
skyvoyage/
├── frontend/
│   └── src/
│       ├── components/       # Navbar, FlightCard, SeatMap, AddOnsSection (+ .css per component)
│       ├── context/          # AuthContext, BookingContext (round-trip selection state)
│       ├── constants/        # cities.js — searchable city list
│       ├── pages/            # Home, FlightResults, SeatSelection (+ RoundTrip variants),
│       │                     # BookingSummary (+ RoundTrip variant), PaymentPage, BookingHistory,
│       │                     # AdminDashboard, Login, Register
│       ├── services/         # api.jsx — all Axios calls
│       ├── App.jsx           # routes, ProtectedRoute / AdminRoute guards
│       └── index.css         # design tokens (colors, type, buttons, cards, badges)
│
└── backend/
    ├── controllers/          # auth, flight, seat, booking, admin, addon, promo
    ├── middleware/           # auth.js — JWT protect + adminOnly
    ├── models/                # User, Flight, Seat, Booking, PricingRule, AddOn, PromoCode
    ├── routes/
    ├── services/               # pricingService.js — dynamic price calculation
    ├── seed.js
    └── server.js
```

---

## How Booking Works

1. **Search** (`GET /api/flights/search`) — filters flights by route/date/passenger capacity and returns each with an indicative `dynamicPrice`.
2. **Lock seats** (`POST /api/seats/lock`) — reserves chosen seats for 10 minutes; blocked if another user already holds them.
3. **Price preview** (`POST /api/flights/:id/price`) — combined price for the whole party in one calculation, so surcharges like demand/last-minute apply once per booking, not once per seat.
4. **Add-ons & promo** — optional meal/baggage add-ons and a promo code discount are attached at checkout.
5. **Confirm** (`POST /api/bookings/confirm`) — requires the seats to still be locked by you; creates one `Booking` document per seat, all sharing a `groupId` so multi-seat and round-trip checkouts display and cancel together, then marks the seats `BOOKED`.
6. **Cancel** (`POST /api/bookings/cancel`) — releases the seat back to `AVAILABLE` and marks the booking `CANCELLED`.

Round-trip bookings run this same flow twice (outbound + return flight) under one shared `groupId`.

---

## Dynamic Pricing Rules

Prices are calculated by [`pricingService.calculatePrice`](backend/services/pricingService.js) from whatever active rules exist in the `PricingRule` collection:

| Type | Trigger | Applies |
|------|---------|---------|
| `DEMAND` | Occupancy ≥ threshold % | Once per booking |
| `TIME` | Booking within N hours of departure | Once per booking |
| `SEAT_TYPE` | Seat is `WINDOW` / `MIDDLE` / `AISLE` | Per matching seat |
| `CLASS` | Seat class is `ECONOMY` / `BUSINESS` | Per matching seat |

18% GST is added on top of the subtotal. If no rules exist yet, sensible hardcoded fallbacks apply (₹1,000 demand surcharge at 70%+ occupancy, ₹1,500 within 48 hours, ₹300/₹150 window/aisle, ₹12,000 business class) — but the seeded database always ships with a full rule set already active. Admins manage rules live from the dashboard.

---

## API Reference

All routes are prefixed with `/api`. 🔒 = requires `Authorization: Bearer <token>`. 🔐 = requires an admin token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create an account (`role: 'admin'` requires `adminCode`) |
| POST | `/auth/login` | Log in, returns a JWT |
| GET | `/auth/me` 🔒 | Current user |
| GET | `/flights/search` | Search flights by `source`, `destination`, `date`, `passengers` |
| GET | `/flights` | List all flights |
| GET | `/flights/:id` | Flight details + its seat map |
| POST | `/flights/:id/price` 🔒 | Combined price preview for a set of seats |
| POST | `/seats/lock` 🔒 | Lock seats for 10 minutes |
| POST | `/seats/release` 🔒 | Release seats you're holding |
| GET | `/seats/price` 🔒 | Price for a single seat |
| POST | `/bookings/confirm` 🔒 | Confirm a booking for currently-locked seats |
| POST | `/bookings/cancel` 🔒 | Cancel a booking |
| GET | `/bookings/user` 🔒 | Your booking history |
| GET | `/bookings/:id` 🔒 | Single booking (owner or admin) |
| GET | `/addons` | List meal/baggage add-ons |
| POST | `/promo/apply` | Validate a promo code and get the discount |
| POST | `/admin/flights` 🔐 | Create a flight (seats auto-generated) |
| PUT | `/admin/flights/:id` 🔐 | Update a flight |
| DELETE | `/admin/flights/:id` 🔐 | Delete a flight (cascades to its seats/bookings) |
| GET | `/admin/bookings` 🔐 | All bookings, paginated |
| GET | `/admin/stats` 🔐 | Dashboard stats |
| GET/POST/PUT/DELETE | `/admin/pricing-rules` 🔐 | Manage pricing rules |

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
- Environment variables: all vars from the backend `.env` above
