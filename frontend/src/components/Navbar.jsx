import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logoutUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 18
          }}>✈</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#0f172a' }}>
            Sky<span style={{ color: '#0ea5e9' }}>Voyage</span>
          </span>
        </Link>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!isAdmin && (
          <Link to="/" className="btn btn-ghost" style={{ color: isActive('/') ? '#0ea5e9' : '#64748b' }}>Home</Link>
          )}
          {user && !isAdmin && (
            <Link to="/bookings" className="btn btn-ghost" style={{ color: isActive('/bookings') ? '#0ea5e9' : '#64748b' }}>My Bookings</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="btn btn-ghost" style={{ color: isActive('/admin') ? '#0ea5e9' : '#64748b' }}>Admin</Link>
          )}
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{user.role === 'admin' ? 'Admin' : 'Traveler'}</div>
              </div>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '7px 14px', fontSize: 13 }}>Logout</button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" style={{ fontSize: 14 }}>Login</Link>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: 14 }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
