import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import '../dashboard/Dashboard.css';

const COLORS = ['#F97316', '#14B8A6', '#8B5CF6', '#EAB308', '#EF4444'];

export default function AnalyticsDashboard() {
  const [revenue, setRevenue] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [trends, setTrends] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revRes, distRes, trendRes] = await Promise.all([
        api.get(`/analytics/revenue?period=${period}`),
        api.get('/analytics/orders'),
        api.get('/analytics/trends')
      ]);
      setRevenue(revRes.data.data || []);
      setDistribution(distRes.data.data || []);
      setTrends(trendRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pieData = distribution.map(d => ({
    name: d.type === 'full' ? 'Full Meal' : d.type === 'half' ? 'Half Meal' : 'Extra Chapati',
    value: d.count,
    revenue: d.revenue
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Business insights and trends</p>
        </div>
        <div className="filters-bar">
          <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 500, borderRadius: 16 }} />
      ) : (
        <>
          {/* Revenue Chart */}
          <div className="chart-card animate-fade-in-up">
            <h2 className="section-title">Revenue Overview ({period})</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey={period === 'monthly' ? 'month' : 'date'}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => period === 'daily' ? v.slice(5) : v} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8 }}
                    formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="charts-grid">
            {/* Order Distribution */}
            <div className="chart-card animate-fade-in-up">
              <h2 className="section-title">Order Distribution</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                      dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name, props) => [`${v} orders (₹${props.payload.revenue})`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Trends */}
            <div className="chart-card animate-fade-in-up">
              <h2 className="section-title">Full vs Half (30 Days)</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(8)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                    <Bar dataKey="full" stackId="a" fill="#F97316" name="Full" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="half" stackId="a" fill="#14B8A6" name="Half" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
