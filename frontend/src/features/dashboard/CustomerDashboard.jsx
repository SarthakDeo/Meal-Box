import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [menu, setMenu] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [quantityMorning, setQuantityMorning] = useState(1);
  const [quantityDinner, setQuantityDinner] = useState(1);
  const [extraChapatiMorning, setExtraChapatiMorning] = useState(0);
  const [extraChapatiDinner, setExtraChapatiDinner] = useState(0);
  const [deliveryLocation, setDeliveryLocation] = useState(() => localStorage.getItem('saved_delivery_location') || '');
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [menuRes, historyRes] = await Promise.all([
        api.get('/menu/today'),
        api.get('/orders/history?per_page=50')
      ]);
      setMenu(menuRes.data.menus || []);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayList = (historyRes.data.orders || []).filter(
        o => o.order_date === todayStr && o.status !== 'cancelled'
      );
      setTodayOrders(todayList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getOrderedCount = (mealTime) => {
    return todayOrders
      .filter(o => o.meal_time === mealTime)
      .reduce((sum, o) => sum + (o.quantity || 1), 0);
  };

  const handleBookClick = (mealTime, mealType, quantity, extraChapati) => {
    if (!deliveryLocation.trim()) {
      toast.error('Please enter your delivery location before ordering!');
      return;
    }

    const existingCount = getOrderedCount(mealTime);
    if (existingCount > 0) {
      // Show confirmation popup modal
      setConfirmModal({
        mealTime,
        mealType,
        quantity,
        extraChapati,
        existingCount
      });
    } else {
      executeBooking(mealTime, mealType, quantity, extraChapati);
    }
  };

  const executeBooking = async (mealTime, mealType, quantity, extraChapati) => {
    setBooking(true);
    setConfirmModal(null);
    try {
      localStorage.setItem('saved_delivery_location', deliveryLocation.trim());
      await api.post('/orders', {
        meal_time: mealTime,
        meal_type: mealType,
        quantity: quantity,
        extra_chapati: extraChapati,
        delivery_location: deliveryLocation.trim()
      });
      const chapatiText = extraChapati > 0 ? ` with ${extraChapati} total extra chapati(s)` : '';
      toast.success(`${quantity} ${mealTime === 'morning' ? 'Morning' : 'Dinner'} tiffin(s)${chapatiText} booked!`);
      loadDashboardData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Booking failed';
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  };

  const morningMenu = menu.find(m => m.meal_time === 'morning');
  const dinnerMenu = menu.find(m => m.meal_time === 'dinner');

  const calcTotal = (mealType, qty, extra) => {
    const base = mealType === 'full' ? 80 : 60;
    return (qty * base) + (extra * 10);
  };

  const morningOrderedCount = getOrderedCount('morning');
  const dinnerOrderedCount = getOrderedCount('dinner');

  return (
    <div className="customer-dash">
      <div className="customer-dash__greeting animate-fade-in-up">
        <h1>Hello, {user?.name}! 👋</h1>
        <h2 style={{ 
          color: 'var(--primary-color)', 
          fontSize: '1.8rem', 
          fontWeight: '800', 
          marginTop: '8px', 
          marginBottom: '8px',
          letterSpacing: '0.5px',
          background: 'linear-gradient(90deg, #F97316, #EAB308)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0px 2px 4px rgba(0,0,0,0.05)'
        }}>
          Welcome to Dalavi's Kitchen 👨‍🍳
        </h2>
        <p>Here's today's menu</p>
      </div>

      {/* Location Input Section */}
      <div className="animate-fade-in-up" style={{
        background: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1.5px solid var(--border-light)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        marginBottom: '20px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
          <span>📍</span> Delivery Location / Address:
        </label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Hostel Block B - Room 204, or Flat 301, Sunshine Heights"
          value={deliveryLocation}
          onChange={(e) => setDeliveryLocation(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '1rem' }}
        />
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      ) : (
        <div className="menu-cards stagger-children">
          {/* Morning Menu */}
          <div className="menu-card menu-card--morning">
            <div className="menu-card__header">
              <span className="menu-card__icon">🌅</span>
              <div style={{ flex: 1 }}>
                <h2 className="menu-card__title">Morning Tiffin</h2>
                <p className="menu-card__cutoff">Order before 10:30 AM</p>
              </div>
              {morningOrderedCount > 0 && (
                <span style={{
                  backgroundColor: 'var(--primary-color)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 6px rgba(249, 115, 22, 0.3)'
                }}>
                  Ordered Today: {morningOrderedCount}
                </span>
              )}
            </div>
            {morningMenu ? (
              <>
                <ul className="menu-card__items">
                  {(morningMenu.items || []).map((item, i) => (
                    <li key={i} className="menu-card__item">
                      <span className="menu-card__dot" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="menu-card__actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Quantity selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: 'bold', padding: '8px 12px', backgroundColor: 'rgba(255, 140, 0, 0.08)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--primary-color)', flex: 1 }}>🍱 Number of Tiffins:</span>
                    <button onClick={() => setQuantityMorning(Math.max(1, quantityMorning - 1))} 
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <strong style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{quantityMorning}</strong>
                    <button onClick={() => setQuantityMorning(quantityMorning + 1)}
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>

                  {/* Total Extra Chapati */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: 'bold', padding: '8px 12px', backgroundColor: 'rgba(255, 140, 0, 0.08)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--primary-color)', flex: 1 }}>🫓 Total Extra Chapati (₹10/ea):</span>
                    <button onClick={() => setExtraChapatiMorning(Math.max(0, extraChapatiMorning - 1))} 
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <strong style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{extraChapatiMorning}</strong>
                    <button onClick={() => setExtraChapatiMorning(extraChapatiMorning + 1)}
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Button size="sm" onClick={() => handleBookClick('morning', 'full', quantityMorning, extraChapatiMorning)} loading={booking} style={{ flex: 1 }}>
                      Full ₹{calcTotal('full', quantityMorning, extraChapatiMorning)} ({quantityMorning} tiffins)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBookClick('morning', 'half', quantityMorning, extraChapatiMorning)} loading={booking} style={{ flex: 1 }}>
                      Half ₹{calcTotal('half', quantityMorning, extraChapatiMorning)} ({quantityMorning} tiffins)
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="menu-card__empty">Menu not published yet</p>
            )}
          </div>

          {/* Dinner Menu */}
          <div className="menu-card menu-card--dinner">
            <div className="menu-card__header">
              <span className="menu-card__icon">🌙</span>
              <div style={{ flex: 1 }}>
                <h2 className="menu-card__title">Dinner Tiffin</h2>
                <p className="menu-card__cutoff">Order before 7:30 PM</p>
              </div>
              {dinnerOrderedCount > 0 && (
                <span style={{
                  backgroundColor: 'var(--primary-color)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 6px rgba(249, 115, 22, 0.3)'
                }}>
                  Ordered Today: {dinnerOrderedCount}
                </span>
              )}
            </div>
            {dinnerMenu ? (
              <>
                <ul className="menu-card__items">
                  {(dinnerMenu.items || []).map((item, i) => (
                    <li key={i} className="menu-card__item">
                      <span className="menu-card__dot" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="menu-card__actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Quantity selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: 'bold', padding: '8px 12px', backgroundColor: 'rgba(255, 140, 0, 0.08)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--primary-color)', flex: 1 }}>🍱 Number of Tiffins:</span>
                    <button onClick={() => setQuantityDinner(Math.max(1, quantityDinner - 1))} 
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <strong style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{quantityDinner}</strong>
                    <button onClick={() => setQuantityDinner(quantityDinner + 1)}
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>

                  {/* Total Extra Chapati */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: 'bold', padding: '8px 12px', backgroundColor: 'rgba(255, 140, 0, 0.08)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--primary-color)', flex: 1 }}>🫓 Total Extra Chapati (₹10/ea):</span>
                    <button onClick={() => setExtraChapatiDinner(Math.max(0, extraChapatiDinner - 1))} 
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <strong style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{extraChapatiDinner}</strong>
                    <button onClick={() => setExtraChapatiDinner(extraChapatiDinner + 1)}
                      style={{ padding: '4px 14px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Button size="sm" onClick={() => handleBookClick('dinner', 'full', quantityDinner, extraChapatiDinner)} loading={booking} style={{ flex: 1 }}>
                      Full ₹{calcTotal('full', quantityDinner, extraChapatiDinner)} ({quantityDinner} tiffins)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBookClick('dinner', 'half', quantityDinner, extraChapatiDinner)} loading={booking} style={{ flex: 1 }}>
                      Half ₹{calcTotal('half', quantityDinner, extraChapatiDinner)} ({quantityDinner} tiffins)
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="menu-card__empty">Menu not published yet</p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="animate-scale-in" style={{
            background: 'var(--bg-card)',
            padding: '24px 28px',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-light)'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Additional Order Confirmation
            </h3>
            <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '20px' }}>
              You have already ordered <strong>{confirmModal.existingCount}</strong> {confirmModal.mealTime} tiffin(s) today.
              <br /><br />
              Do you want to order <strong>{confirmModal.quantity} more</strong> {confirmModal.mealTime} tiffin(s)?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setConfirmModal(null)}>
                Cancel
              </Button>
              <Button onClick={() => executeBooking(confirmModal.mealTime, confirmModal.mealType, confirmModal.quantity, confirmModal.extraChapati)}>
                Yes, Order {confirmModal.quantity} More
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Balance */}
      {user && (
        <BalanceCard userId={user.id} />
      )}
    </div>
  );
}

function BalanceCard({ userId }) {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    api.get(`/payments/balance/${userId}`).then(res => setBalance(res.data)).catch(() => {});
  }, [userId]);

  if (!balance) return null;

  return (
    <div className="balance-card animate-fade-in-up">
      <h3 className="balance-card__title">💰 Payment Summary</h3>
      <div className="balance-card__grid">
        <div className="balance-card__item">
          <span className="balance-card__label">Total Consumed</span>
          <span className="balance-card__value">₹{balance.total_cost?.toLocaleString()}</span>
        </div>
        <div className="balance-card__item">
          <span className="balance-card__label">Total Paid</span>
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
  );
}
