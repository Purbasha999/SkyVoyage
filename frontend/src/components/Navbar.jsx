import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const PlaneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="white"/>
  </svg>
);

const Navbar = () => {
  const { user, logoutUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const navLinks = [
    { label: 'Flights', path: '/' },
    { label: 'My Bookings', path: '/bookings', auth: true },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon"><PlaneIcon /></div>
          <span>SkyVoyage</span>
        </Link>

        <ul className="navbar-links hide-mobile">
          {navLinks.filter(l => !l.auth || (user && !isAdmin)).map(l => (
            <li key={l.path}>
              <Link to={l.path} className={location.pathname === l.path ? 'active' : ''}>{l.label}</Link>
            </li>
          ))}
          {isAdmin && <li><Link to="/admin" className={location.pathname.startsWith('/admin') ? 'active' : ''}>Admin</Link></li>}
        </ul>

        <div className="navbar-actions hide-mobile">
          {user ? (
            <div className="user-menu">
              <div className="user-avatar" onClick={() => setMenuOpen(!menuOpen)}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  {!isAdmin && <Link to="/bookings" onClick={() => setMenuOpen(false)}>My Bookings</Link>}
                  {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
                  <button onClick={handleLogout} className="logout-btn">Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Log In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>

        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.filter(l => !l.auth || (user && !isAdmin)).map(l => (
            <Link key={l.path} to={l.path} onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
          {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>}
          {user
            ? <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Sign Out</button>
            : <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn btn-outline btn-sm">Log In</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn btn-primary btn-sm">Sign Up</Link>
              </>
          }
        </div>
      )}
    </nav>
  );
};

export default Navbar;
