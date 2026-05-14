import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import '../dashboard/Dashboard.css';

export default function PaymentRecorder() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    user_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [payRes, custRes, sumRes] = await Promise.all([
        api.get('/payments?per_page=50'),
        api.get('/customers'),
        api.get('/payments/summary')
      ]);
      setPayments(payRes.data.payments || []);
      setCustomers(custRes.data.customers || []);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecord = async () => {
    try {
      await api.post('/payments', form);
      toast.success('Payment recorded');
      setShowModal(false);
      setForm({ user_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', notes: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Record and track payments</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Record Payment</Button>
      </div>

      {/* Payment Summary */}
      {summary && (
        <div className="stats-grid stagger-children">
          <div className="stat-card stat-card--primary">
            <div className="stat-card__info">
              <span className="stat-card__label">Total Revenue</span>
              <span className="stat-card__value">₹{summary.total_revenue?.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card stat-card--success">
            <div className="stat-card__info">
              <span className="stat-card__label">Collected</span>
              <span className="stat-card__value">₹{summary.total_collected?.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card stat-card--error">
            <div className="stat-card__info">
              <span className="stat-card__label">Pending</span>
              <span className="stat-card__value">₹{summary.total_pending?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Method</th>
                <th>Notes</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.user_name}</strong></td>
                  <td><strong style={{ color: 'var(--success-600)' }}>₹{p.amount}</strong></td>
                  <td>{new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td><span className={`badge badge--${p.payment_method === 'cash' ? 'manual' : 'auto'}`}>{p.payment_method}</span></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.notes || '—'}</td>
                  <td>{p.recorder_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Customer</label>
            <select className="form-select" value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — Balance: ₹{(c.balance || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" className="form-input" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={handleRecord} fullWidth>Record Payment</Button>
        </div>
      </Modal>
    </div>
  );
}
