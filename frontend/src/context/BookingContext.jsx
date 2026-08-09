import React, { createContext, useContext, useState } from 'react';

// Holds round-trip selection state across the Flights -> Seats -> Summary ->
// Payment pages (one-way bookings keep passing state via router location
// state, which is enough for a single flight).
const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const [selectedOutboundFlight, setSelectedOutboundFlight] = useState(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
  const [roundTripSeats, setRoundTripSeats] = useState({ outbound: [], return: [] });
  const [roundTripSearch, setRoundTripSearch] = useState({ source: '', destination: '', date: '', returnDate: '', passengers: 1 });

  const clearRoundTrip = () => {
    setSelectedOutboundFlight(null);
    setSelectedReturnFlight(null);
    setRoundTripSeats({ outbound: [], return: [] });
  };

  return (
    <BookingContext.Provider value={{
      selectedOutboundFlight, setSelectedOutboundFlight,
      selectedReturnFlight, setSelectedReturnFlight,
      roundTripSeats, setRoundTripSeats,
      roundTripSearch, setRoundTripSearch,
      clearRoundTrip
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};
