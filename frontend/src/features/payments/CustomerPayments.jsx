import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import '../dashboard/Dashboard.css';

export default function CustomerPayments() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/payments/my'),
      api.get(`/payments/balance/${user.id}`)
    ]).then(([payRes, balRes]) => {
      setPayments(payRes.data.payments || []);
      setBalance(balRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="page-container">
      <h1 className="page-title">Payments</h1>
      <p className="page-subtitle">Your payment history and balance</p>

      {balance && (
        <div className="balance-card animate-fade-in-up">
          <h3 className="balance-card__title">💰 Balance Summary</h3>
          <div className="balance-card__grid">
            <div className="balance-card__item">
              <span className="balance-card__label">Total Cost</span>
              <span className="balance-card__value">₹{balance.total_cost?.toLocaleString()}</span>
            </div>
            <div className="balance-card__item">
              <span className="balance-card__label">Paid</span>
              <span className="balance-card__value balance-card__value--success">₹{balance.total_paid?.toLocaleString()}</span>
            </div>
            <div className="balance-card__item balance-card__item--highlight">
              <span className="balance-card__label">Remaining</span>
              <span className={`balance-card__value ${balance.balance > 0 ? 'balance-card__value--error' : 'balance-card__value--success'}`}>
                ₹{balance.balance?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">💳</div>
          <h3 className="empty-state__title">No payments recorded</h3>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td><strong style={{ color: 'var(--success-600)' }}>₹{p.amount}</strong></td>
                  <td><span className={`badge badge--${p.payment_method === 'cash' ? 'manual' : 'auto'}`}>{p.payment_method}</span></td>
                  <td>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
