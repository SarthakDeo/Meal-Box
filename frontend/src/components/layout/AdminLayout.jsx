import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  HiOutlineHome, HiOutlineClipboardList, HiOutlineShoppingCart,
  HiOutlineUsers, HiOutlineCreditCard, HiOutlineChartBar,
  HiOutlineCalendar, HiOutlineLogout, HiOutlineSun, HiOutlineMoon,
  HiOutlineMenu, HiOutlineX
} from 'react-icons/hi';
import './AdminLayout.css';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { path: '/admin/menu', label: 'Menu', icon: HiOutlineClipboardList },
  { path: '/admin/orders', label: 'Orders', icon: HiOutlineShoppingCart },
  { path: '/admin/subscriptions', label: 'Subscriptions', icon: HiOutlineCalendar },
  { path: '/admin/customers', label: 'Customers', icon: HiOutlineUsers },
  { path: '/admin/payments', label: 'Payments', icon: HiOutlineCreditCard },
  { path: '/admin/analytics', label: 'Analytics', icon: HiOutlineChartBar },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { initTheme(); }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <span className="sidebar__logo-icon">🍱</span>
            <span className="sidebar__logo-text">Meal Box</span>
          </div>
          <button className="sidebar__close" onClick={() => setSidebarOpen(false)}>
            <HiOutlineX />
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="sidebar__link-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button className="sidebar__theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? <HiOutlineMoon /> : <HiOutlineSun />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button className="sidebar__logout-btn" onClick={handleLogout}>
            <HiOutlineLogout />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-header">
          <button className="admin-header__menu" onClick={() => setSidebarOpen(true)}>
            <HiOutlineMenu />
          </button>
          <div className="admin-header__info">
            <span className="admin-header__greeting">
              Hello, <strong>{user?.name || 'Admin'}</strong>
            </span>
            <span className="admin-header__badge">Admin</span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
