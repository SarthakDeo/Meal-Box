import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import '../dashboard/Dashboard.css';

export default function SubscriptionList() {
  const [subs, setSubs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    user_id: '', start_date: '', end_date: '', meal_type: 'full', meal_time: 'both', price_per_day: 80, is_paid: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subRes, custRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/customers')
      ]);
      setSubs(subRes.data.subscriptions || []);
      setCustomers(custRes.data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/subscriptions', form);
      toast.success('Subscription created');
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handlePause = async (id) => {
    try {
      await api.post(`/subscriptions/${id}/pause`, { reason: 'Paused by admin' });
      toast.success('Subscription paused');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleResume = async (id) => {
    try {
      await api.post(`/subscriptions/${id}/resume`);
      toast.success('Subscription resumed');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.post(`/subscriptions/${id}/mark-paid`);
      toast.success('Subscription marked as paid');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage mess subscriptions</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Subscription</Button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      ) : subs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📅</div>
          <h3 className="empty-state__title">No subscriptions yet</h3>
          <p className="empty-state__text">Create one to enable auto-ordering</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Period</th>
                <th>Meal</th>
                <th>Time</th>
                <th>Price/Day</th>
                <th>Days Left</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.user_name}</strong></td>
                  <td>{s.start_date} → {s.end_date}</td>
                  <td><span className={`badge badge--${s.meal_type}`}>{s.meal_type}</span></td>
                  <td>{s.meal_time}</td>
                  <td>₹{s.price_per_day}</td>
                  <td>{s.days_remaining}</td>
                  <td><span className={`badge badge--${s.status}`}>{s.status}</span></td>
                  <td>
                    {s.is_paid ? (
                      <span className="badge badge--success">Paid</span>
                    ) : (
                      <span className="badge badge--warning">Unpaid</span>
                    )}
                  </td>
                  <td>
                    <div className="action-btns">
                      {s.status === 'active' && (
                        <Button size="sm" variant="ghost" onClick={() => handlePause(s.id)}>⏸ Pause</Button>
                      )}
                      {s.status === 'paused' && (
                        <Button size="sm" variant="ghost" onClick={() => handleResume(s.id)}>▶ Resume</Button>
                      )}
                      {!s.is_paid && (
                        <Button size="sm" variant="ghost" onClick={() => handleMarkPaid(s.id)}>💰 Mark Paid</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Subscription" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Customer</label>
            <select className="form-select" value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="date" className="form-input" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Meal Type</label>
              <select className="form-select" value={form.meal_type}
                onChange={(e) => setForm({ ...form, meal_type: e.target.value,
                  price_per_day: e.target.value === 'full' ? 80 : 60 })}>
                <option value="full">Full (₹80)</option>
                <option value="half">Half (₹60)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Meal Time</label>
              <select className="form-select" value={form.meal_time}
                onChange={(e) => setForm({ ...form, meal_time: e.target.value })}>
                <option value="both">Both</option>
                <option value="morning">Morning Only</option>
                <option value="dinner">Dinner Only</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price Per Day (₹)</label>
              <input type="number" className="form-input" value={form.price_per_day}
                onChange={(e) => setForm({ ...form, price_per_day: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_paid} 
                  onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} 
                  style={{ width: 18, height: 18 }} />
                <span>Mark as Paid (Records Payment)</span>
              </label>
            </div>
          </div>
          <Button onClick={handleCreate} fullWidth>Create Subscription</Button>
        </div>
      </Modal>
    </div>
  );
}
