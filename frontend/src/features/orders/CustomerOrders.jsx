import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import '../dashboard/Dashboard.css';

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    api.get('/orders/history?per_page=50')
      .then(res => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    setCancelingId(orderId);
    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Order cancelled successfully');
      setConfirmCancelOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">My Orders</h1>
      <p className="page-subtitle">Your order history and active bookings</p>

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
                <th>Location</th>
                <th>Note</th>
                <th>Qty</th>
                <th>Type</th>
                <th>Extra Chapati</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>{o.meal_time === 'morning' ? '🌅' : '🌙'} {o.meal_time}</td>
                  <td><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📍 {o.delivery_location || '—'}</span></td>
                  <td>
                    {o.note ? (
                      <span style={{ fontSize: '0.85rem', color: '#F97316', fontWeight: '600' }}>
                        📝 {o.note}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td><strong>{o.quantity || 1}</strong></td>
                  <td><span className={`badge badge--${o.meal_type}`}>{o.meal_type}</span></td>
                  <td>{o.extra_chapati > 0 ? `+${o.extra_chapati} total` : '—'}</td>
                  <td>₹{o.amount}</td>
                  <td><span className={`badge badge--${o.status}`}>{o.status}</span></td>
                  <td>
                    {o.status === 'booked' ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setConfirmCancelOrder(o)}
                        style={{ borderColor: 'var(--error-500)', color: 'var(--error-500)' }}
                      >
                        Cancel Order
                      </Button>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {confirmCancelOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="animate-scale-in" style={{
            background: 'var(--bg-card)',
            padding: '24px 28px',
            borderRadius: '20px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-light)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--error-500)', marginBottom: '12px' }}>
              ⚠️ Cancel Order Confirmation
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Are you sure you want to cancel your <strong>{confirmCancelOrder.meal_time}</strong> tiffin order for ({new Date(confirmCancelOrder.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setConfirmCancelOrder(null)}>
                No, Keep Order
              </Button>
              <Button 
                onClick={() => handleCancelOrder(confirmCancelOrder.id)} 
                loading={cancelingId === confirmCancelOrder.id}
                style={{ background: 'var(--error-500)', color: '#fff' }}
              >
                Yes, Cancel Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
