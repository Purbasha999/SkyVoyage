import React from 'react';
import CITIES from '../constants/cities';
import './FlightCard.css';

const fmt = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const formatDur = (dep, arr) => {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
const cityName = (code) => CITIES.find(c => c.code === code)?.name || code;

const ICON_COLORS = ['#185FA5', '#1D9E75', '#D85A30', '#7B1FA2', '#0F6E56', '#B5451B'];
const airlineInitials = (airline = '') =>
  airline.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const airlineColor = (airline = '') => {
  let hash = 0;
  for (let i = 0; i < airline.length; i++) hash = airline.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
};

const AirlineIcon = ({ airline }) => (
  <div className="airline-icon" style={{ background: airlineColor(airline) }}>
    {airlineInitials(airline)}
  </div>
);

const FlightCard = ({ flight, onSelect, isSelected = false, buttonLabel = 'Select Flight →' }) => {
  const price = flight.dynamicPrice || flight.basePrice;
  const pb = flight.priceBreakdown;
  const hasSurcharge = pb && (pb.demandCharge > 0 || pb.lateBookingCharge > 0);

  return (
    <div className={`flight-card${isSelected ? ' flight-card--selected' : ''}`}>
      <div className="fc-airline">
        <AirlineIcon airline={flight.airline} />
        <div>
          <div className="fc-airline-name">{flight.airline}</div>
          <div className="fc-flight-num">{flight.flightNumber}</div>
        </div>
      </div>

      <div className="fc-route">
        <div className="fc-time-block">
          <div className="fc-date-pill">{fmtDate(flight.departureTime)}</div>
          <div className="fc-time">{fmt(flight.departureTime)}</div>
          <div className="fc-city">{flight.source}</div>
          <div className="fc-city-name">{cityName(flight.source)}</div>
        </div>

        <div className="fc-middle">
          <div className="fc-duration">{formatDur(flight.departureTime, flight.arrivalTime)}</div>
          <div className="fc-line">
            <div className="fc-dot" />
            <div className="fc-dashes" />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="var(--blue-400)" />
            </svg>
          </div>
          <div className="fc-nonstop">Non-stop</div>
        </div>

        <div className="fc-time-block right">
          <div className="fc-date-pill">{fmtDate(flight.arrivalTime)}</div>
          <div className="fc-time">{fmt(flight.arrivalTime)}</div>
          <div className="fc-city">{flight.destination}</div>
          <div className="fc-city-name">{cityName(flight.destination)}</div>
        </div>
      </div>

      <div className="fc-right">
        <div className="fc-price-block">
          <div className="fc-price">₹{price?.toLocaleString('en-IN')}</div>
          <div className="fc-price-note">per person · incl. taxes</div>
          {hasSurcharge && (
            <div className="fc-surcharge-tags">
              {pb.demandCharge > 0 && <span className="badge badge-amber">High Demand</span>}
              {pb.lateBookingCharge > 0 && <span className="badge badge-red">Last Minute</span>}
            </div>
          )}
        </div>

        <div className="fc-meta">
          <span className={`badge ${flight.availableSeats < 10 ? 'badge-red' : 'badge-green'}`}>
            {flight.availableSeats} seats left
          </span>
        </div>

        <button className={`btn ${isSelected ? 'btn-success' : 'btn-primary'} fc-select-btn`} onClick={() => onSelect(flight)}>
          {isSelected ? '✓ Selected' : buttonLabel}
        </button>
      </div>
    </div>
  );
};

export default FlightCard;
