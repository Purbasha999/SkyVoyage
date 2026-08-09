import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const { loginUser } = useAuth();
  const [mode, setMode] = useState('user');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const redirect = urlParams.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(form);
      const role = res.data.user.role;
      if (mode === 'admin' && role !== 'admin') {
        setError('This account is not an admin. Please use the User Login.');
        setLoading(false);
        return;
      }
      if (mode === 'user' && role === 'admin') {
        setError('Admin accounts must sign in via Admin Login.');
        setLoading(false);
        return;
      }
      loginUser(res.data.token, res.data.user);
      navigate(role === 'admin' ? '/admin' : redirect);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (which) => {
    if (which === 'user') { setMode('user'); setForm({ email: 'user@skyvoyage.com', password: 'user1234' }); }
    else { setMode('admin'); setForm({ email: 'admin@skyvoyage.com', password: 'admin123' }); }
  };

  return (
    <div className="sky-page auth-page">
      <div className="clouds-wrap">
        <div className="cloud c1" style={{ left: '5%' }} />
        <div className="cloud c2" style={{ left: '60%' }} />
      </div>
      <div className="auth-wrap">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="white"/>
            </svg>
          </div>
          <span>SkyVoyage</span>
        </div>

        <div className="card-glass auth-card">
          <div className="auth-mode-toggle">
            {[['user', 'User Login'], ['admin', 'Admin Login']].map(([key, label]) => (
              <button key={key} type="button" className={`auth-mode-btn${mode === key ? ` active${key === 'admin' ? ' admin' : ''}` : ''}`} onClick={() => { setMode(key); setError(''); }}>
                {label}
              </button>
            ))}
          </div>

          <h2 className="auth-title">{mode === 'admin' ? 'Admin Portal' : 'Welcome back'}</h2>
          <p className="auth-sub">{mode === 'admin' ? 'Sign in to manage SkyVoyage' : 'Sign in to manage your bookings'}</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required autoComplete="current-password" />
            </div>
            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : mode === 'admin' ? 'Sign In as Admin' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <div className="demo-accounts">
            <p className="demo-label">Demo Accounts</p>
            <div className="demo-btns">
              <button className="demo-btn" onClick={() => fillDemo('user')}>
                <span className="demo-role">User</span>
                user@skyvoyage.com
              </button>
              <button className="demo-btn admin" onClick={() => fillDemo('admin')}>
                <span className="demo-role">Admin</span>
                admin@skyvoyage.com
              </button>
            </div>
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
