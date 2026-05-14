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
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [extraChapatiMorning, setExtraChapatiMorning] = useState(0);
  const [extraChapatiDinner, setExtraChapatiDinner] = useState(0);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const res = await api.get('/menu/today');
      setMenu(res.data.menus || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const bookOrder = async (mealTime, mealType, extraChapati = 0) => {
    if (extraChapati === 0) {
      const proceed = window.confirm("You have 0 extra chapatis. Do you want to proceed with booking? Click OK to book now, or Cancel to go back and add extra chapatis.");
      if (!proceed) return;
    }

    setBooking(true);
    try {
      await api.post('/orders', {
        meal_time: mealTime,
        meal_type: mealType,
        extra_chapati: extraChapati
      });
      toast.success(`${mealTime === 'morning' ? 'Morning' : 'Dinner'} tiffin booked!`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Booking failed';
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  };

  const morningMenu = menu.find(m => m.meal_time === 'morning');
  const dinnerMenu = menu.find(m => m.meal_time === 'dinner');

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

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      ) : (
        <div className="menu-cards stagger-children">
          {/* Morning Menu */}
          <div className="menu-card menu-card--morning">
            <div className="menu-card__header">
              <span className="menu-card__icon">🌅</span>
              <div>
                <h2 className="menu-card__title">Morning Tiffin</h2>
                <p className="menu-card__cutoff">Order before 10:30 AM</p>
              </div>
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
                <div className="menu-card__actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: 'bold', padding: '8px', backgroundColor: 'rgba(255, 140, 0, 0.1)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--primary-color)', flex: 1 }}>Extra chapati (₹10/each):</span>
                    <button onClick={() => setExtraChapatiMorning(Math.max(0, extraChapatiMorning - 1))} 
                      style={{ padding: '4px 16px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <strong style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{extraChapatiMorning}</strong>
                    <button onClick={() => setExtraChapatiMorning(extraChapatiMorning + 1)}
                      style={{ padding: '4px 16px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" onClick={() => bookOrder('morning', 'full', extraChapatiMorning)} loading={booking} style={{ flex: 1 }}>
                      Full ₹{80 + (extraChapatiMorning * 10)}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => bookOrder('morning', 'half', extraChapatiMorning)} loading={booking} style={{ flex: 1 }}>
                      Half ₹{60 + (extraChapatiMorning * 10)}
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
              <div>
                <h2 className="menu-card__title">Dinner Tiffin</h2>
                <p className="menu-card__cutoff">Order before 7:30 PM</p>
              </div>
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
                <div className="menu-card__actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: 'bold', padding: '8px', backgroundColor: 'rgba(255, 140, 0, 0.1)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--primary-color)', flex: 1 }}>Extra chapati (₹10/each):</span>
                    <button onClick={() => setExtraChapatiDinner(Math.max(0, extraChapatiDinner - 1))} 
                      style={{ padding: '4px 16px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <strong style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{extraChapatiDinner}</strong>
                    <button onClick={() => setExtraChapatiDinner(extraChapatiDinner + 1)}
                      style={{ padding: '4px 16px', borderRadius: '6px', border: '2px solid var(--primary-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" onClick={() => bookOrder('dinner', 'full', extraChapatiDinner)} loading={booking} style={{ flex: 1 }}>
                      Full ₹{80 + (extraChapatiDinner * 10)}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => bookOrder('dinner', 'half', extraChapatiDinner)} loading={booking} style={{ flex: 1 }}>
                      Half ₹{60 + (extraChapatiDinner * 10)}
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
