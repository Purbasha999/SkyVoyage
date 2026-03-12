import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('skyvoyage_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

export const searchFlights = (params) => API.get('/flights/search', { params });
export const getFlightById = (id) => API.get(`/flights/${id}`);
export const getAllFlights = () => API.get('/flights');

export const lockSeat = (data) => API.post('/seats/lock', data);
export const releaseSeat = (data) => API.post('/seats/release', data);
export const getSeatPrice = (params) => API.get('/seats/price', { params });

export const bookSeats = (data) => API.post('/bookings/confirm', data);
export const confirmBooking = (data) => API.post('/bookings/confirm', data);
export const cancelBooking = (data) => API.post('/bookings/cancel', data);
export const getUserBookings = () => API.get('/bookings/user');
export const getBookingById = (id) => API.get(`/bookings/${id}`);

export const adminCreateFlight = (data) => API.post('/admin/flights', data);
export const adminUpdateFlight = (id, data) => API.put(`/admin/flights/${id}`, data);
export const adminDeleteFlight = (id) => API.delete(`/admin/flights/${id}`);
export const adminGetAllBookings = (params) => API.get('/admin/bookings', { params });
export const adminGetStats = () => API.get('/admin/stats');
export const adminGetPricingRules = () => API.get('/admin/pricing-rules');
export const adminCreatePricingRule = (data) => API.post('/admin/pricing-rules', data);
export const adminUpdatePricingRule = (id, data) => API.put(`/admin/pricing-rules/${id}`, data);
export const adminDeletePricingRule = (id) => API.delete(`/admin/pricing-rules/${id}`);

export default API;