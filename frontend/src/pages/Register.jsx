import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [mode, setMode] = useState('user');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', adminCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = mode === 'admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (isAdmin && !form.adminCode.trim()) { setError('Admin code is required to create an admin account.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await register({ name: form.name, email: form.email, password: form.password, role: mode, adminCode: form.adminCode });
      if (mode === 'admin' && res.data.user.role !== 'admin') {
        setError('Invalid admin code. Account was not created as admin.');
        setLoading(false);
        return;
      }
      loginUser(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="sky-page auth-page">
      <div className="clouds-wrap">
        <div className="cloud c1" style={{ left: '8%' }} />
        <div className="cloud c3" style={{ left: '55%' }} />
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
            {[['user', 'User Sign Up'], ['admin', 'Admin Sign Up']].map(([key, label]) => (
              <button key={key} type="button" className={`auth-mode-btn${mode === key ? ` active${key === 'admin' ? ' admin' : ''}` : ''}`} onClick={() => handleModeSwitch(key)}>
                {label}
              </button>
            ))}
          </div>

          <h2 className="auth-title">{isAdmin ? 'Admin Registration' : 'Create account'}</h2>
          <p className="auth-sub">{isAdmin ? 'Register an admin account for SkyVoyage' : 'Join SkyVoyage and start flying smart'}</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Rahul Sharma" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="auth-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min. 6 chars" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
              </div>
            </div>
            {isAdmin && (
              <div className="form-group">
                <label className="form-label">Admin Code</label>
                <input className="form-input" type="password" placeholder="Enter your admin code" value={form.adminCode} onChange={e => setForm(f => ({ ...f, adminCode: e.target.value }))} />
              </div>
            )}
            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : isAdmin ? 'Create Admin Account' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
