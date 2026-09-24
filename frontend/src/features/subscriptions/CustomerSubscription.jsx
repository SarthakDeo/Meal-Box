import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import TiffinLoader from '../../components/ui/TiffinLoader';
import toast from 'react-hot-toast';
import { getLocalDateString } from '../../utils/dateUtils';
import '../dashboard/Dashboard.css';

export default function CustomerSubscription() {
  const [subs, setSubs] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingMeal, setCancelingMeal] = useState(null);
  const [confirmCancelModal, setConfirmCancelModal] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subRes, historyRes, holRes] = await Promise.all([
        api.get('/subscriptions/me'),
        api.get('/orders/history?per_page=50'),
        api.get('/subscriptions/holidays').catch(() => ({ data: { holidays: [] } }))
      ]);

      const activeSubs = subRes.data.subscriptions || [];
      setSubs(activeSubs);

      const allOrders = historyRes.data.orders || [];
      const localTodayStr = getLocalDateString();
      const utcTodayStr = new Date().toISOString().split('T')[0];
      const todayList = allOrders.filter(o => {
        const orderDateStr = o.order_date ? o.order_date.slice(0, 10) : '';
        return (orderDateStr === localTodayStr || orderDateStr === utcTodayStr);
      });
      setTodayOrders(todayList);

      setHolidays(holRes.data.holidays || []);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTodayMeal = async (mealTime) => {
    setCancelingMeal(mealTime);
    try {
      await api.post('/orders/cancel-today', { meal_time: mealTime });
      toast.success(`${mealTime === 'morning' ? 'Morning' : 'Dinner'} tiffin cancelled for today!`);
      setConfirmCancelModal(null);
      loadSubscriptionData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel today's meal");
    } finally {
      setCancelingMeal(null);
    }
  };

  const activeSub = subs.find(s => s.status === 'active');
  const todayStr = getLocalDateString();

  // Check if today is a kitchen holiday
  const todayHoliday = holidays.find(h => h.date === todayStr);

  // Check status of today's morning and dinner orders
  const morningOrder = todayOrders.find(o => o.meal_time === 'morning');
  const dinnerOrder = todayOrders.find(o => o.meal_time === 'dinner');

  const isMorningCancelled = morningOrder?.status === 'cancelled' || (todayHoliday && (todayHoliday.meal_time === 'both' || todayHoliday.meal_time === 'morning'));
  const isDinnerCancelled = dinnerOrder?.status === 'cancelled' || (todayHoliday && (todayHoliday.meal_time === 'both' || todayHoliday.meal_time === 'dinner'));

  return (
    <div className="page-container">
      <h1 className="page-title">My Subscription</h1>
      <p className="page-subtitle">Your mess subscription details & daily tiffin status</p>

      {loading ? (
        <TiffinLoader text="Loading subscription details..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Today's Tiffin Quick Action Section */}
          {activeSub && (
            <div className="delivery-card animate-fade-in-up" style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(234, 179, 8, 0.08) 100%)',
              border: '2px solid var(--primary-color)',
              borderRadius: '20px',
              padding: '20px 24px',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🍱</span> Today's Tiffin Status ({new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })})
                </h3>
                <span className="badge badge--active">Active Mess Subscription</span>
              </div>

              {todayHoliday && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(234, 179, 8, 0.18)',
                  border: '1px solid #EAB308',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  color: '#92400E',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🏝️</span>
                  <span>Kitchen Holiday Today: <strong>{todayHoliday.title}</strong> ({todayHoliday.meal_time === 'both' ? 'Kitchen closed all day' : `${todayHoliday.meal_time} meal closed`})</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {/* Morning Tiffin Card */}
                {(activeSub.meal_time === 'morning' || activeSub.meal_time === 'both') && (
                  <div style={{
                    background: 'var(--bg-card)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        🌅 Morning Tiffin
                      </span>
                      {isMorningCancelled ? (
                        <span className="badge badge--cancelled">Cancelled / Holiday</span>
                      ) : morningOrder?.status === 'delivered' ? (
                        <span className="badge badge--success">Delivered</span>
                      ) : (
                        <span className="badge badge--booked">Active (Booked)</span>
                      )}
                    </div>

                    {!isMorningCancelled && morningOrder?.status !== 'delivered' ? (
                      <Button
                        size="sm"
                        onClick={() => setConfirmCancelModal({ mealTime: 'morning' })}
                        disabled={cancelingMeal === 'morning'}
                        style={{
                          width: '100%',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: 'var(--error-500)',
                          borderColor: 'var(--error-500)',
                          borderWidth: '1.5px',
                          borderStyle: 'solid',
                          fontWeight: 'bold'
                        }}
                      >
                        🚫 Cancel Morning Tiffin
                      </Button>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center' }}>
                        {isMorningCancelled ? 'No morning tiffin will be delivered today' : 'Morning tiffin already delivered'}
                      </div>
                    )}
                  </div>
                )}

                {/* Dinner Tiffin Card */}
                {(activeSub.meal_time === 'dinner' || activeSub.meal_time === 'both') && (
                  <div style={{
                    background: 'var(--bg-card)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        🌙 Dinner Tiffin
                      </span>
                      {isDinnerCancelled ? (
                        <span className="badge badge--cancelled">Cancelled / Holiday</span>
                      ) : dinnerOrder?.status === 'delivered' ? (
                        <span className="badge badge--success">Delivered</span>
                      ) : (
                        <span className="badge badge--booked">Active (Booked)</span>
                      )}
                    </div>

                    {!isDinnerCancelled && dinnerOrder?.status !== 'delivered' ? (
                      <Button
                        size="sm"
                        onClick={() => setConfirmCancelModal({ mealTime: 'dinner' })}
                        disabled={cancelingMeal === 'dinner'}
                        style={{
                          width: '100%',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: 'var(--error-500)',
                          borderColor: 'var(--error-500)',
                          borderWidth: '1.5px',
                          borderStyle: 'solid',
                          fontWeight: 'bold'
                        }}
                      >
                        🚫 Cancel Dinner Tiffin
                      </Button>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center' }}>
                        {isDinnerCancelled ? 'No dinner tiffin will be delivered today' : 'Dinner tiffin already delivered'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscriptions List */}
          {subs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📅</div>
              <h3 className="empty-state__title">No active subscription</h3>
              <p className="empty-state__text">Contact admin to set up a mess subscription</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {subs.map(s => (
                <div key={s.id} className="delivery-card" style={{ borderTop: `3px solid ${s.status === 'active' ? 'var(--success-500)' : 'var(--warning-500)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🍱</span> Mess Subscription #{s.id}
                    </h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge badge--${s.status}`}>{s.status.toUpperCase()}</span>
                      <span className={`badge badge--${s.is_paid ? 'success' : 'warning'}`}>
                        {s.is_paid ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Validity Period</span>
                      <strong>📅 {s.start_date}</strong> to <strong>{s.end_date}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Meal Options</span>
                      <strong style={{ textTransform: 'capitalize' }}>{s.meal_type} Meal</strong> ({s.meal_time})
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Daily & Meal Rate</span>
                      <strong>₹{s.price_per_day} / day</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>(₹{s.price_per_meal}/meal)</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Days Left</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--primary-color)' }}>
                        {s.effective_days_remaining || s.days_remaining} Days
                      </strong>
                      {s.leave_count > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--success-600)', fontWeight: 'bold' }}>
                          ({s.days_remaining} calendar + {s.leave_count} leave days added)
                        </div>
                      )}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Active Tiffin Days</span>
                      <strong>{s.net_active_days} Days</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>(out of {s.total_calendar_days})</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Net Total Amount</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>₹{s.total_amount}</strong>
                    </div>
                  </div>

                  {/* Leave / Not Taken Tiffin Section */}
                  {s.leave_details && s.leave_details.length > 0 && (
                    <div style={{
                      marginTop: 16,
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: 'rgba(249, 115, 22, 0.06)',
                      border: '1px dashed var(--primary-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          🚪 Leaves & Not Taken Tiffins ({s.leave_details.length})
                        </strong>
                        <span style={{ fontSize: '0.78rem', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success-600)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                          +{s.leave_count} Days Credited Back
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {s.leave_details.map((l, idx) => (
                          <div key={idx} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: '16px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            <span>📅</span>
                            <span>{l.date}</span>
                            <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({l.meal_time})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.status === 'paused' && s.pause_reason && (
                    <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--warning-600)', fontStyle: 'italic' }}>
                      Pause reason: {s.pause_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Holidays Section */}
          {holidays.length > 0 && (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid var(--border-light)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏝️ Upcoming Kitchen Holidays
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {holidays.map(h => (
                  <div key={h.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.2)',
                    fontSize: '0.9rem'
                  }}>
                    <div>
                      <strong style={{ color: '#D97706' }}>📅 {h.date}</strong> — <strong>{h.title}</strong>
                      {h.description && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>({h.description})</span>}
                    </div>
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#B45309' }}>
                      {h.meal_time === 'both' ? 'Full Day Off' : `${h.meal_time} Off`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Today's Tiffin Confirmation Modal */}
      {confirmCancelModal && (
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
              ⚠️ Cancel Today's Tiffin Confirmation
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Are you sure you want to cancel your <strong>{confirmCancelModal.mealTime}</strong> tiffin for today?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setConfirmCancelModal(null)}>
                No, Keep Tiffin
              </Button>
              <Button
                onClick={() => handleCancelTodayMeal(confirmCancelModal.mealTime)}
                loading={cancelingMeal === confirmCancelModal.mealTime}
                style={{ background: 'var(--error-500)', color: '#fff' }}
              >
                Yes, Cancel Tiffin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
