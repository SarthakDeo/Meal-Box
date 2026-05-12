import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import './Auth.css';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        customer_type: 'daywise'
      });
      navigate('/customer/dashboard');
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg__circle auth-bg__circle--1" />
        <div className="auth-bg__circle auth-bg__circle--2" />
        <div className="auth-bg__circle auth-bg__circle--3" />
      </div>

      <div className="auth-card animate-scale-in">
        <div className="auth-card__header">
          <span className="auth-card__logo">🍱</span>
          <h1 className="auth-card__title">Create Account</h1>
          <p className="auth-card__subtitle">Join Meal Box today</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              className="form-input"
              name="name"
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              className="form-input"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Phone</label>
            <input
              id="reg-phone"
              className="form-input"
              name="phone"
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="form-input"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm</label>
              <input
                id="reg-confirm"
                className="form-input"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <Button type="submit" fullWidth loading={loading} size="lg">
            Create Account
          </Button>
        </form>

        <div className="auth-card__footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
