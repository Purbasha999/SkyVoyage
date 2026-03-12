import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [mode, setMode] = useState('user');
  const [form, setForm] = useState({ name: '', email: '', password: '', adminCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (isAdmin && !form.adminCode.trim()) { setError('Admin code is required to create an admin account.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await register({ ...form, role: mode });
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
    setForm({ name: '', email: '', password: '', adminCode: '' });
  };

  const isAdmin = mode === 'admin';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: 24,
      background: isAdmin
        ? 'linear-gradient(155deg, #1a4460 0%, #4b799b 50%, #8fbddc 100%)'
        : 'linear-gradient(to bottom, #f0f9ff 0%, #bbd9ee 50%, #7ec2ef 100%)',
      transition: 'background 0.5s ease'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Toggle */}
        <div style={{
          display: 'flex',
          background: isAdmin ? 'rgba(8, 24, 43, 0.4)' : 'rgba(255,255,255,0.7)',
          borderRadius: 14,
          padding: 4,
          marginBottom: 24,
          border: isAdmin ? '1px solid rgba(255, 255, 255, 0.46)' : '1px solid #e2e8f0',
          backdropFilter: 'blur(8px)'
        }}>
          {[
            { key: 'user', label: 'User Sign Up' },
            { key: 'admin', label: 'Admin Sign Up' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleModeSwitch(key)}
              style={{
                flex: 1, padding: '10px 16px',
                borderRadius: 10, border: 'none',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                background: mode === key
                  ? (key === 'admin' ? 'linear-gradient(135deg, #5cade2, #418fc4)' : 'white')
                  : 'transparent',
                color: mode === key
                  ? (key === 'admin' ? 'white' : '#0f172a')
                  : (isAdmin ? 'rgba(255,255,255,0.45)' : '#94a3b8'),
                boxShadow: mode === key ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{
            fontSize: 26, marginBottom: 4, fontFamily: 'Syne, sans-serif',
            color: isAdmin ? 'white' : '#0f172a',
            transition: 'color 0.4s'
          }}>
            {isAdmin ? 'Admin Registration' : 'Create account'}
          </h1>
          <p style={{ color: isAdmin ? 'rgba(255, 255, 255, 0.69)' : '#64748b', fontSize: 14, transition: 'color 0.4s' }}>
            {isAdmin ? 'Register an admin account for SkyVoyage' : 'Join SkyVoyage today'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: isAdmin ? '#12364d' : 'white',
          border: isAdmin ? '1px solid rgba(18, 38, 71, 0.23)' : '1px solid #e2e8f0',
          borderRadius: 20,
          padding: 32,
          backdropFilter: isAdmin ? 'blur(16px)' : 'none',
          boxShadow: isAdmin
            ? '0 24px 48px rgba(0,0,0,0.4)'
            : '0 4px 24px rgba(0,0,0,0.06)',
          transition: 'all 0.4s ease'
        }}>
          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fca5a5',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#991b1b', fontSize: 13
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ ...labelS, color: isAdmin ? 'rgba(255,255,255,0.9)' : '#64748b' }}>Full Name</label>
              <input
                value={form.name} required
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                style={{
                  ...inputS,
                  background: isAdmin ? 'rgba(255,255,255,0.07)' : 'white',
                  border: `1.5px solid ${isAdmin ? 'rgba(255,255,255,0.8)' : '#e2e8f0'}`,
                  color: isAdmin ? 'white' : '#0f172a',
                }}
              />
            </div>
            <div>
              <label style={{ ...labelS, color: isAdmin ? 'rgba(255,255,255,0.9)' : '#64748b' }}>Email</label>
              <input
                type="email" value={form.email} required
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                style={{
                  ...inputS,
                  background: isAdmin ? 'rgba(255,255,255,0.07)' : 'white',
                  border: `1.5px solid ${isAdmin ? 'rgba(255,255,255,0.8)' : '#e2e8f0'}`,
                  color: isAdmin ? 'white' : '#0f172a',
                }}
              />
            </div>
            <div>
              <label style={{ ...labelS, color: isAdmin ? 'rgba(255,255,255,0.9)' : '#64748b' }}>Password</label>
              <input
                type="password" value={form.password} required
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                style={{
                  ...inputS,
                  background: isAdmin ? 'rgba(255,255,255,0.07)' : 'white',
                  border: `1.5px solid ${isAdmin ? 'rgba(255,255,255,0.8)' : '#e2e8f0'}`,
                  color: isAdmin ? 'white' : '#0f172a',
                }}
              />
            </div>

            {/* Admin Code */}
            {isAdmin && (
              <div>
                <label style={{ ...labelS, color: 'rgba(255,255,255,0.9)' }}>Admin Code</label>
                <input
                  type="password" 
                  value={form.adminCode}
                  onChange={e => setForm({ ...form, adminCode: e.target.value })}
                  placeholder="Enter your admin code"
                  style={{
                    ...inputS,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1.5px solid rgba(255,255,255,0.8)',
                    color: 'white',
                  }}
                />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  Required to create an admin account
                </p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: 13, fontSize: 15,
                borderRadius: 10, marginTop: 4, border: 'none',
                fontFamily: 'inherit', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading
                  ? '#94a3b8'
                  : isAdmin
                    ? 'linear-gradient(135deg, #5cade2, #418fc4)'
                    : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: 'white',
                boxShadow: loading ? 'none' : isAdmin
                  ? '0 4px 16px rgba(108, 169, 222, 0.28)'
                  : '0 4px 16px rgba(14,165,233,0.35)',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading
                ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> Creating account...</>
                : isAdmin ? 'Create Admin Account' : 'Create Account →'
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: isAdmin ? 'rgba(255,255,255,0.4)' : '#64748b' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: isAdmin ? '#80bae0' : '#0ea5e9', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const labelS = {
  display: 'block', fontSize: 12, fontWeight: 600,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
  transition: 'color 0.3s'
};
const inputS = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  fontSize: 14, outline: 'none', transition: 'all 0.3s ease',
  boxSizing: 'border-box'
};

export default Register;