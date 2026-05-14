import { useState, useEffect } from 'react';
import api from '../../services/api';
import { StatCard } from '../../components/ui/Card';
import {
  HiOutlineCurrencyRupee, HiOutlineShoppingCart,
  HiOutlineUsers, HiOutlineCalendar
} from 'react-icons/hi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './Dashboard.css';

const PIE_COLORS = ['#F97316', '#14B8A6', '#8B5CF6', '#EAB308'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, trendRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/trends')
      ]);
      setData(dashRes.data);
      setTrends(trendRes.data.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard__header">
          <h1 className="page-title">Dalavi's Kitchen Dashboard</h1>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const todayData = data?.today || {};
  const customerPieData = (data?.customer_stats || []).map(s => ({
    name: s.type === 'mess' ? 'Mess' : s.type === 'daywise' ? 'Day-wise' : 'Unassigned',
    value: s.count
  }));

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="page-title">Dalavi's Kitchen Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger-children">
        <StatCard
          icon={<HiOutlineCurrencyRupee />}
          label="Monthly Revenue"
          value={`₹${(data?.monthly_revenue || 0).toLocaleString()}`}
          color="primary"
        />
        <StatCard
          icon={<HiOutlineShoppingCart />}
          label="Today's Orders"
          value={todayData.total_orders || 0}
          sub={`₹${(todayData.total_revenue || 0).toLocaleString()}`}
          color="secondary"
        />
        <StatCard
          icon={<HiOutlineUsers />}
          label="Active Customers"
          value={data?.total_customers || 0}
          color="success"
        />
        <StatCard
          icon={<HiOutlineCalendar />}
          label="Active Subscriptions"
          value={data?.active_subscriptions || 0}
          color="warning"
        />
      </div>

      {/* Today's Delivery Summary */}
      <div className="dashboard__section animate-fade-in-up">
        <h2 className="section-title">Today's Delivery Summary</h2>
        <div className="delivery-grid">
          <div className="delivery-card delivery-card--morning">
            <h3 className="delivery-card__title">🌅 Morning</h3>
            <div className="delivery-card__stats">
              <div className="delivery-stat">
                <span className="delivery-stat__value">{todayData.morning?.full || 0}</span>
                <span className="delivery-stat__label">Full (₹80)</span>
              </div>
              <div className="delivery-stat">
                <span className="delivery-stat__value">{todayData.morning?.half || 0}</span>
                <span className="delivery-stat__label">Half (₹60)</span>
              </div>
              <div className="delivery-stat">
                <span className="delivery-stat__value">{todayData.morning?.extras || 0}</span>
                <span className="delivery-stat__label">Extra Chapati</span>
              </div>
            </div>
            <div className="delivery-card__revenue">
              ₹{(todayData.morning?.revenue || 0).toLocaleString()}
            </div>
          </div>

          <div className="delivery-card delivery-card--dinner">
            <h3 className="delivery-card__title">🌙 Dinner</h3>
            <div className="delivery-card__stats">
              <div className="delivery-stat">
                <span className="delivery-stat__value">{todayData.dinner?.full || 0}</span>
                <span className="delivery-stat__label">Full (₹80)</span>
              </div>
              <div className="delivery-stat">
                <span className="delivery-stat__value">{todayData.dinner?.half || 0}</span>
                <span className="delivery-stat__label">Half (₹60)</span>
              </div>
              <div className="delivery-stat">
                <span className="delivery-stat__value">{todayData.dinner?.extras || 0}</span>
                <span className="delivery-stat__label">Extra Chapati</span>
              </div>
            </div>
            <div className="delivery-card__revenue">
              ₹{(todayData.dinner?.revenue || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Revenue Trend */}
        <div className="chart-card animate-fade-in-up">
          <h2 className="section-title">Revenue Trend (30 Days)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    fontSize: 13
                  }}
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2}
                  fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Distribution */}
        <div className="chart-card animate-fade-in-up">
          <h2 className="section-title">Customer Distribution</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={customerPieData} cx="50%" cy="50%" outerRadius={100}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {customerPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
