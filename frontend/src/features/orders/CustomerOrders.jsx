import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../dashboard/Dashboard.css';

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/history?per_page=50')
      .then(res => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">My Orders</h1>
      <p className="page-subtitle">Your order history</p>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <h3 className="empty-state__title">No orders yet</h3>
          <p className="empty-state__text">Book your first tiffin from the dashboard</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Meal</th>
                <th>Type</th>
                <th>Extra</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>{o.meal_time === 'morning' ? '🌅' : '🌙'} {o.meal_time}</td>
                  <td><span className={`badge badge--${o.meal_type}`}>{o.meal_type}</span></td>
                  <td>{o.extra_chapati > 0 ? `+${o.extra_chapati}` : '—'}</td>
                  <td>₹{o.amount}</td>
                  <td><span className={`badge badge--${o.status}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
