import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import '../dashboard/Dashboard.css';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ date: new Date().toISOString().split('T')[0], status: '', meal_time: '' });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadOrders(); }, [filters]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.status) params.append('status', filters.status);
      if (filters.meal_time) params.append('meal_time', filters.meal_time);

      const res = await api.get(`/orders?${params}`);
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}`, { status });
      toast.success(`Order ${status}`);
      loadOrders();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const generateOrders = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/orders/generate', { date: filters.date });
      toast.success(`Generated ${res.data.count} orders`);
      loadOrders();
    } catch (err) {
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Track and manage daily orders</p>
        </div>
        <Button onClick={generateOrders} loading={generating} variant="outline">
          ⚡ Generate Auto Orders
        </Button>
      </div>

      <div className="filters-bar">
        <input type="date" className="form-input" value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <select className="form-select" value={filters.meal_time}
          onChange={(e) => setFilters({ ...filters, meal_time: e.target.value })}>
          <option value="">All Meals</option>
          <option value="morning">Morning</option>
          <option value="dinner">Dinner</option>
        </select>
        <select className="form-select" value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="booked">Booked</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📦</div>
          <h3 className="empty-state__title">No orders found</h3>
          <p className="empty-state__text">Try changing the filters</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Meal</th>
                <th>Type</th>
                <th>Extra</th>
                <th>Amount</th>
                <th>Source</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td><strong>{order.user_name}</strong></td>
                  <td>{order.meal_time === 'morning' ? '🌅 Morning' : '🌙 Dinner'}</td>
                  <td><span className={`badge badge--${order.meal_type}`}>{order.meal_type}</span></td>
                  <td>{order.extra_chapati > 0 ? `+${order.extra_chapati}` : '—'}</td>
                  <td><strong>₹{order.amount}</strong></td>
                  <td><span className={`badge badge--${order.source}`}>{order.source}</span></td>
                  <td><span className={`badge badge--${order.status}`}>{order.status}</span></td>
                  <td>
                    <div className="action-btns">
                      {order.status === 'booked' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => updateStatus(order.id, 'delivered')}>✓</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(order.id, 'cancelled')} style={{ color: 'var(--error-500)' }}>✕</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
