import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import './Auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard');
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
          <h1 className="auth-card__title">Meal Box</h1>
          <p className="auth-card__subtitle">Sign in to your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" fullWidth loading={loading} size="lg">
            Sign In
          </Button>
        </form>

        <div className="auth-card__footer">
          <p>Don't have an account? <Link to="/register" className="auth-link">Register</Link></p>
        </div>
      </div>
    </div>
  );
}
