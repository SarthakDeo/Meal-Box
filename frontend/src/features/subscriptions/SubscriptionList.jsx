import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import TiffinLoader from '../../components/ui/TiffinLoader';
import toast from 'react-hot-toast';
import '../dashboard/Dashboard.css';

export default function SubscriptionList() {
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'holidays'
  const [subs, setSubs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscription form state
  const [form, setForm] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    meal_type: 'full',
    meal_time: 'both',
    price_per_day: 80,
    is_paid: false,
    leave_dates: []
  });
  const [tempLeaveDate, setTempLeaveDate] = useState('');

  // Holiday form state
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    title: '',
    description: '',
    meal_time: 'both'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, custRes, holRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/customers'),
        api.get('/subscriptions/holidays').catch(() => ({ data: { holidays: [] } }))
      ]);
      setSubs(subRes.data.subscriptions || []);
      setCustomers(custRes.data.customers || []);
      setHolidays(holRes.data.holidays || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLeaveDate = () => {
    if (!tempLeaveDate) return;
    if (form.leave_dates.includes(tempLeaveDate)) {
      toast.error('Date already added to leaves list');
      return;
    }
    setForm({ ...form, leave_dates: [...form.leave_dates, tempLeaveDate] });
    setTempLeaveDate('');
  };

  const handleRemoveLeaveDate = (dateToRemove) => {
    setForm({
      ...form,
      leave_dates: form.leave_dates.filter(d => d !== dateToRemove)
    });
  };

  const handleCreateSubscription = async () => {
    if (!form.user_id || !form.start_date || !form.end_date) {
      toast.error('Please fill in Customer, Start Date, and End Date');
      return;
    }
    try {
      const res = await api.post('/subscriptions', form);
      const leaveMsg = res.data.recorded_leaves ? ` (${res.data.recorded_leaves} leave meal(s) pre-recorded)` : '';
      toast.success(`Subscription created successfully${leaveMsg}`);
      setShowModal(false);
      setForm({
        user_id: '', start_date: '', end_date: '', meal_type: 'full', meal_time: 'both', price_per_day: 80, is_paid: false, leave_dates: []
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create subscription');
    }
  };

  const handleCreateHoliday = async () => {
    if (!holidayForm.date || !holidayForm.title) {
      toast.error('Please enter Date and Holiday Title');
      return;
    }
    try {
      const res = await api.post('/subscriptions/holidays', holidayForm);
      toast.success(res.data.message || 'Holiday added successfully!');
      setShowHolidayModal(false);
      setHolidayForm({ date: '', title: '', description: '', meal_time: 'both' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete holiday "${title}"?`)) return;
    try {
      await api.delete(`/subscriptions/holidays/${id}`);
      toast.success('Holiday deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete holiday');
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
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Subscriptions & Holidays</h1>
          <p className="page-subtitle">Manage mess subscriptions and kitchen holidays</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'subscriptions' ? (
            <Button onClick={() => setShowModal(true)}>+ New Subscription</Button>
          ) : (
            <Button onClick={() => setShowHolidayModal(true)} style={{ background: '#EAB308', color: '#000', fontWeight: 'bold' }}>
              🏝️ + Add Kitchen Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('subscriptions')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'subscriptions' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'subscriptions' ? '#FFF' : 'var(--text-secondary)',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📋 Mess Subscriptions ({subs.length})
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'holidays' ? '#EAB308' : 'transparent',
            color: activeTab === 'holidays' ? '#000' : 'var(--text-secondary)',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🏝️ Kitchen Holidays ({holidays.length})
        </button>
      </div>

      {loading ? (
        <TiffinLoader text="Loading subscriptions & holidays..." />
      ) : activeTab === 'subscriptions' ? (
        /* Subscriptions Tab */
        subs.length === 0 ? (
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
        )
      ) : (
        /* Holidays Tab */
        holidays.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🏝️</div>
            <h3 className="empty-state__title">No kitchen holidays scheduled</h3>
            <p className="empty-state__text">Add a holiday to automatically inform customers and skip daily orders</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday Title / Event</th>
                  <th>Description</th>
                  <th>Affected Meal Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map(h => (
                  <tr key={h.id}>
                    <td>
                      <strong style={{ color: '#EAB308', fontSize: '1rem' }}>
                        📅 {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </strong>
                    </td>
                    <td><strong>{h.title}</strong></td>
                    <td>{h.description || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                    <td>
                      <span className="badge" style={{ textTransform: 'capitalize', background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.4)' }}>
                        {h.meal_time === 'both' ? '🌅 & 🌙 Both Meals' : h.meal_time === 'morning' ? '🌅 Morning Only' : '🌙 Dinner Only'}
                      </span>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteHoliday(h.id, h.title)}
                        style={{ color: 'var(--error-500)', borderColor: 'var(--error-500)' }}
                      >
                        🗑️ Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal: New Subscription */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Mess Subscription" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Customer *</label>
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
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
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
                <option value="both">Both (Morning & Dinner)</option>
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
                <span>Mark as Paid (Upfront Payment)</span>
              </label>
            </div>
          </div>

          {/* Pre-record Customer Leaves */}
          <div style={{
            background: 'rgba(255, 140, 0, 0.05)',
            border: '1px dashed var(--primary-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <label className="form-label" style={{ fontWeight: 'bold', color: 'var(--primary-color)', margin: 0 }}>
              🚪 Customer Leave / Not Taken Tiffins (Optional)
            </label>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Add dates where customer took leave or did not receive tiffins. These will be automatically marked as <strong>Cancelled (₹0 cost)</strong>.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                className="form-input"
                value={tempLeaveDate}
                min={form.start_date || ''}
                max={form.end_date || ''}
                onChange={(e) => setTempLeaveDate(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddLeaveDate}>
                + Add Date
              </Button>
            </div>

            {form.leave_dates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {form.leave_dates.map(d => (
                  <span
                    key={d}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: 'var(--error-500)',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    📅 {d}
                    <button
                      type="button"
                      onClick={() => handleRemoveLeaveDate(d)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--error-500)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        padding: 0,
                        marginLeft: '4px'
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleCreateSubscription} fullWidth size="lg">Create Subscription</Button>
        </div>
      </Modal>

      {/* Modal: Add Kitchen Holiday */}
      <Modal isOpen={showHolidayModal} onClose={() => setShowHolidayModal(false)} title="Add Kitchen Holiday" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Holiday Date *</label>
            <input
              type="date"
              className="form-input"
              value={holidayForm.date}
              onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Holiday Title / Event *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Diwali Festival, Kitchen Maintenance, Sunday Off"
              value={holidayForm.title}
              onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Affected Meal Time</label>
            <select
              className="form-select"
              value={holidayForm.meal_time}
              onChange={(e) => setHolidayForm({ ...holidayForm, meal_time: e.target.value })}
            >
              <option value="both">Both Meals (Full Day Holiday)</option>
              <option value="morning">Morning Meal Only</option>
              <option value="dinner">Dinner Meal Only</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Note (Optional)</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Kitchen will remain closed for all deliveries on this day."
              value={holidayForm.description}
              onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
            />
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            fontSize: '0.85rem',
            color: 'var(--text-primary)'
          }}>
            ℹ️ Adding a holiday will automatically cancel any active orders for that date and prevent users from placing new bookings.
          </div>

          <Button onClick={handleCreateHoliday} fullWidth size="lg" style={{ background: '#EAB308', color: '#000', fontWeight: 'bold' }}>
            Confirm & Add Holiday
          </Button>
        </div>
      </Modal>
    </div>
  );
}
