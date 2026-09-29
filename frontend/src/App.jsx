import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { setupForegroundHandler } from './services/notifications';
import NotificationBanner from './components/ui/NotificationBanner';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import AdminLayout from './components/layout/AdminLayout';
import CustomerLayout from './components/layout/CustomerLayout';
import AdminDashboard from './features/dashboard/AdminDashboard';
import MenuManager from './features/menu/MenuManager';
import OrderList from './features/orders/OrderList';
import SubscriptionList from './features/subscriptions/SubscriptionList';
import CustomerListPage from './features/customers/CustomerListPage';
import PaymentRecorder from './features/payments/PaymentRecorder';
import AnalyticsDashboard from './features/analytics/AnalyticsDashboard';
import CustomerDashboard from './features/dashboard/CustomerDashboard';
import CustomerOrders from './features/orders/CustomerOrders';
import CustomerSubscription from './features/subscriptions/CustomerSubscription';
import CustomerPayments from './features/payments/CustomerPayments';
import ProtectedRoute from './components/layout/ProtectedRoute';
import './App.css';

function App() {
  const { user } = useAuthStore();

  // Wire up foreground push handler whenever a user is logged in
  useEffect(() => {
    if (!user) return;
    let unsubscribe;
    setupForegroundHandler().then((fn) => { unsubscribe = fn; });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: 'var(--font-size-sm)',
          },
        }}
      />

      {/* Notification opt-in banner — shown only to logged-in users */}
      {user && <NotificationBanner />}

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          user ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard'} /> : <LoginPage />
        } />
        <Route path="/register" element={
          user ? <Navigate to="/customer/dashboard" /> : <RegisterPage />
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="subscriptions" element={<SubscriptionList />} />
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="payments" element={<PaymentRecorder />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={
          <ProtectedRoute role="customer"><CustomerLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="subscription" element={<CustomerSubscription />} />
          <Route path="payments" element={<CustomerPayments />} />
        </Route>

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
