import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import TiffinLoader from '../../components/ui/TiffinLoader';
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
  const [noteMorning, setNoteMorning] = useState('');
  const [noteDinner, setNoteDinner] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(() => localStorage.getItem('saved_delivery_location') || '');
  const [confirmModal, setConfirmModal] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [cancelingMeal, setCancelingMeal] = useState(null);
  const [confirmCancelModal, setConfirmCancelModal] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadDashboardData = async () => {
    try {
      const [menuRes, historyRes, subRes] = await Promise.all([
        api.get('/menu/today'),
        api.get('/orders/history?per_page=50'),
        api.get('/subscriptions/me').catch(() => ({ data: { subscriptions: [] } }))
      ]);
      setMenu(menuRes.data.menus || []);
      
      const allOrders = historyRes.data.orders || [];
      const localTodayStr = getLocalDateString();
      const utcTodayStr = new Date().toISOString().split('T')[0];
      const todayList = allOrders.filter(o => {
        const orderDateStr = o.order_date ? o.order_date.slice(0, 10) : '';
        return (orderDateStr === localTodayStr || orderDateStr === utcTodayStr) && o.status !== 'cancelled';
      });
      setTodayOrders(todayList);

      const subs = subRes.data?.subscriptions || [];
      const active = subs.find(s => s.status === 'active');
      setActiveSub(active || null);

      // Auto pre-fill last used address if not already set in state
      if (!deliveryLocation) {
        const lastOrderWithLoc = allOrders.find(o => o.delivery_location && o.delivery_location.trim());
        if (lastOrderWithLoc) {
          setDeliveryLocation(lastOrderWithLoc.delivery_location.trim());
          localStorage.setItem('saved_delivery_location', lastOrderWithLoc.delivery_location.trim());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTodayMeal = async (mealTime) => {
    setCancelingMeal(mealTime);
    try {
      await api.post('/orders/cancel-today', { meal_time: mealTime });
      toast.success(`${mealTime === 'morning' ? 'Morning' : 'Dinner'} meal cancelled for today!`);
      setConfirmCancelModal(null);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel today\'s meal');
    } finally {
      setCancelingMeal(null);
    }
  };

  const getOrderedCount = (mealTime) => {
    return todayOrders
      .filter(o => o.meal_time === mealTime)
      .reduce((sum, o) => sum + (o.quantity || 1), 0);
  };

  const handleBookClick = (mealTime, mealType, quantity, extraChapati, note) => {
    if (!deliveryLocation.trim()) {
      toast.error('Please enter your delivery location before ordering!');
      return;
    }

    const existingCount = getOrderedCount(mealTime);
    setConfirmModal({
      mealTime,
      mealType,
      quantity,
      extraChapati,
      note,
      existingCount
    });
  };

  const executeBooking = async (mealTime, mealType, quantity, extraChapati, note) => {
    setBooking(true);
    setConfirmModal(null);
    try {
      localStorage.setItem('saved_delivery_location', deliveryLocation.trim());
      await api.post('/orders', {
        meal_time: mealTime,
        meal_type: mealType,
        quantity: quantity,
        extra_chapati: extraChapati,
        delivery_location: deliveryLocation.trim(),
        note: note ? note.trim() : ''
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            <span>📍</span> Delivery Location / Address:
          </label>
          {deliveryLocation && (
            <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Saved (auto-filled)
            </span>
          )}
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Hostel Block B - Room 204, or Flat 301, Sunshine Heights"
          value={deliveryLocation}
          onChange={(e) => {
            const newLoc = e.target.value;
            setDeliveryLocation(newLoc);
            localStorage.setItem('saved_delivery_location', newLoc);
          }}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '1rem' }}
        />
      </div>

      {loading ? (
        <TiffinLoader text="Loading today's tiffin menu..." />
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
                <span className="ordered-today-badge">
                  Today's Orders: {morningOrderedCount}
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

                  {/* Note for Kitchen Owner */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      📝 Note for Kitchen Owner (Optional):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Less spicy, extra curry, deliver early..."
                      value={noteMorning}
                      onChange={(e) => setNoteMorning(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <Button 
                      size="lg" 
                      onClick={() => handleBookClick('morning', 'full', quantityMorning, extraChapatiMorning, noteMorning)} 
                      loading={booking} 
                      style={{ 
                        flex: 1, 
                        padding: '14px 16px', 
                        fontSize: '1.05rem', 
                        fontWeight: '800',
                        borderRadius: '12px',
                        boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      🍱 Full ₹{calcTotal('full', quantityMorning, extraChapatiMorning)} ({quantityMorning} tiffin{quantityMorning > 1 ? 's' : ''})
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => handleBookClick('morning', 'half', quantityMorning, extraChapatiMorning, noteMorning)} 
                      loading={booking} 
                      style={{ 
                        flex: 1, 
                        padding: '14px 16px', 
                        fontSize: '1.05rem', 
                        fontWeight: '800',
                        borderRadius: '12px',
                        borderWidth: '2px',
                        borderColor: '#F97316',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      🥗 Half ₹{calcTotal('half', quantityMorning, extraChapatiMorning)} ({quantityMorning} tiffin{quantityMorning > 1 ? 's' : ''})
                    </Button>
                  </div>

                  {(morningOrderedCount > 0 || (activeSub && (activeSub.meal_time === 'morning' || activeSub.meal_time === 'both'))) && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-light)' }}>
                      <button 
                        onClick={() => setConfirmCancelModal({ mealTime: 'morning' })}
                        disabled={cancelingMeal === 'morning'}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid var(--error-500)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: 'var(--error-500)',
                          fontWeight: 'bold',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        🚫 Cancel Today's Morning Meal
                      </button>
                    </div>
                  )}
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
                <span className="ordered-today-badge">
                  Today's Orders: {dinnerOrderedCount}
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

                  {/* Note for Kitchen Owner */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      📝 Note for Kitchen Owner (Optional):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Less spicy, extra curry, deliver early..."
                      value={noteDinner}
                      onChange={(e) => setNoteDinner(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <Button 
                      size="lg" 
                      onClick={() => handleBookClick('dinner', 'full', quantityDinner, extraChapatiDinner, noteDinner)} 
                      loading={booking} 
                      style={{ 
                        flex: 1, 
                        padding: '14px 16px', 
                        fontSize: '1.05rem', 
                        fontWeight: '800',
                        borderRadius: '12px',
                        boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      🍱 Full ₹{calcTotal('full', quantityDinner, extraChapatiDinner)} ({quantityDinner} tiffin{quantityDinner > 1 ? 's' : ''})
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => handleBookClick('dinner', 'half', quantityDinner, extraChapatiDinner, noteDinner)} 
                      loading={booking} 
                      style={{ 
                        flex: 1, 
                        padding: '14px 16px', 
                        fontSize: '1.05rem', 
                        fontWeight: '800',
                        borderRadius: '12px',
                        borderWidth: '2px',
                        borderColor: '#F97316',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      🥗 Half ₹{calcTotal('half', quantityDinner, extraChapatiDinner)} ({quantityDinner} tiffin{quantityDinner > 1 ? 's' : ''})
                    </Button>
                  </div>

                  {(dinnerOrderedCount > 0 || (activeSub && (activeSub.meal_time === 'dinner' || activeSub.meal_time === 'both'))) && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-light)' }}>
                      <button 
                        onClick={() => setConfirmCancelModal({ mealTime: 'dinner' })}
                        disabled={cancelingMeal === 'dinner'}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid var(--error-500)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: 'var(--error-500)',
                          fontWeight: 'bold',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        🚫 Cancel Today's Dinner Meal
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="menu-card__empty">Menu not published yet</p>
            )}
          </div>
        </div>
      )}

      {/* Cancel Today's Meal Modal */}
      {confirmCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="animate-scale-in" style={{
            background: 'var(--bg-card)',
            padding: '28px 30px',
            borderRadius: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            border: '1.5px solid var(--border-light)'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--error-500)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Cancel Today's Meal
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to cancel your <strong>{confirmCancelModal.mealTime === 'morning' ? '🌅 Morning' : '🌙 Dinner'}</strong> meal for today?
              <br /><br />
              This will cancel your booking/subscription meal for today and update your account summary.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setConfirmCancelModal(null)} style={{ flex: 1, borderRadius: '12px' }}>
                No, Keep Meal
              </Button>
              <Button 
                onClick={() => handleCancelTodayMeal(confirmCancelModal.mealTime)} 
                loading={cancelingMeal === confirmCancelModal.mealTime}
                style={{ flex: 1.2, background: 'var(--error-500)', color: '#fff', fontWeight: 'bold', borderRadius: '12px' }}
              >
                Yes, Cancel Meal
              </Button>
            </div>
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
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="animate-scale-in" style={{
            background: 'var(--bg-card)',
            padding: '28px 30px',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            border: '1.5px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(249, 115, 22, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                flexShrink: 0
              }}>
                🛒
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  Confirm Your Order
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Please review your booking details below
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-tertiary)',
              padding: '16px 20px',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Meal Time:</span>
                <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {confirmModal.mealTime === 'morning' ? '🌅 Morning Tiffin' : '🌙 Dinner Tiffin'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tiffin Size:</span>
                <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {confirmModal.mealType === 'full' ? '🍱 Full Tiffin' : '🥗 Half Tiffin'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Quantity:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{confirmModal.quantity} Tiffin(s)</strong>
              </div>

              {confirmModal.extraChapati > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Extra Chapatis:</span>
                  <strong style={{ color: '#F97316' }}>+{confirmModal.extraChapati} Chapati(s)</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Delivery Location:</span>
                <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                  📍 {deliveryLocation}
                </strong>
              </div>

              {confirmModal.note && confirmModal.note.trim() && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kitchen Note:</span>
                  <strong style={{ color: '#F97316', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                    📝 {confirmModal.note.trim()}
                  </strong>
                </div>
              )}

              <div style={{
                borderTop: '1px dashed var(--border-medium)',
                paddingTop: '10px',
                marginTop: '4px',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                fontSize: '1.15rem'
              }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Total Amount:</span>
                <strong style={{ fontSize: '1.35rem', color: '#F97316', fontWeight: '900' }}>
                  ₹{calcTotal(confirmModal.mealType, confirmModal.quantity, confirmModal.extraChapati)}
                </strong>
              </div>
            </div>

            {confirmModal.existingCount > 0 && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>ℹ️</span>
                <span>You already ordered <strong>{confirmModal.existingCount}</strong> {confirmModal.mealTime} tiffin(s) today. This will add to your order.</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                variant="outline" 
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '12px', fontSize: '1rem', borderRadius: '12px' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => executeBooking(confirmModal.mealTime, confirmModal.mealType, confirmModal.quantity, confirmModal.extraChapati, confirmModal.note)}
                loading={booking}
                style={{ 
                  flex: 1.4, 
                  padding: '12px', 
                  fontSize: '1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)'
                }}
              >
                Confirm & Book Order
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
