import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import '../dashboard/Dashboard.css';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', customer_type: 'daywise'
  });

  useEffect(() => { loadCustomers(); }, [search]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?search=${search}`);
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/customers', form);
      toast.success('Customer created');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', password: '', customer_type: 'daywise' });
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deactivated');
      loadCustomers();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleReactivate = async (id) => {
    if (!confirm('Reactivate this customer?')) return;
    try {
      await api.put(`/customers/${id}`, { is_active: true });
      toast.success('Customer reactivated');
      loadCustomers();
    } catch (err) {
      toast.error('Failed to reactivate');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer accounts</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Customer</Button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
        />
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">👥</div>
          <h3 className="empty-state__title">No customers found</h3>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td><span className={`badge badge--${c.customer_type || 'daywise'}`}>{c.customer_type || 'daywise'}</span></td>
                  <td className={c.balance > 0 ? 'balance-card__value--error' : ''}>
                    <strong>₹{(c.balance || 0).toLocaleString()}</strong>
                  </td>
                  <td><span className={`badge badge--${c.is_active ? 'active' : 'expired'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="action-btns">
                      {c.is_active ? (
                        <Button size="sm" variant="ghost" onClick={() => handleDeactivate(c.id)} style={{ color: 'var(--error-500)' }}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleReactivate(c.id)} style={{ color: 'var(--success-500)' }}>
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Customer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Customer Type</label>
            <select className="form-select" value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
              <option value="daywise">Day-wise</option>
              <option value="mess">Mess</option>
            </select>
          </div>
          <Button onClick={handleCreate} fullWidth>Create Customer</Button>
        </div>
      </Modal>
    </div>
  );
}
