import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../dashboard/Dashboard.css';

export default function CustomerSubscription() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/subscriptions/me')
      .then(res => setSubs(res.data.subscriptions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">My Subscription</h1>
      <p className="page-subtitle">Your mess subscription details</p>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      ) : subs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📅</div>
          <h3 className="empty-state__title">No active subscription</h3>
          <p className="empty-state__text">Contact admin to set up a mess subscription</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {subs.map(s => (
            <div key={s.id} className="delivery-card" style={{ borderTop: `3px solid ${s.status === 'active' ? 'var(--success-500)' : 'var(--warning-500)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Mess Subscription</h3>
                <span className={`badge badge--${s.status}`}>{s.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.9rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>Start:</span> <strong>{s.start_date}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>End:</span> <strong>{s.end_date}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Meal:</span> <strong className={`badge badge--${s.meal_type}`}>{s.meal_type}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Time:</span> <strong>{s.meal_time}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Price/Day:</span> <strong>₹{s.price_per_day}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Days Left:</span> <strong>{s.days_remaining}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Payment:</span> <strong className={`badge badge--${s.is_paid ? 'success' : 'warning'}`}>{s.is_paid ? 'PAID' : 'UNPAID'}</strong></div>
              </div>
              {s.status === 'paused' && s.pause_reason && (
                <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--warning-600)', fontStyle: 'italic' }}>
                  Pause reason: {s.pause_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
