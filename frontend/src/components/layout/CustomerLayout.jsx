import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  HiOutlineHome, HiOutlineShoppingCart,
  HiOutlineCalendar, HiOutlineCreditCard,
  HiOutlineLogout, HiOutlineSun, HiOutlineMoon
} from 'react-icons/hi';
import './CustomerLayout.css';

const navItems = [
  { path: '/customer/dashboard', label: 'Home', icon: HiOutlineHome },
  { path: '/customer/orders', label: 'Orders', icon: HiOutlineShoppingCart },
  { path: '/customer/subscription', label: 'Subscription', icon: HiOutlineCalendar },
  { path: '/customer/payments', label: 'Payments', icon: HiOutlineCreditCard },
];

export default function CustomerLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => { initTheme(); }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="customer-layout">
      {/* Top header */}
      <header className="customer-header">
        <div className="customer-header__left">
          <span className="customer-header__logo">🍱</span>
          <span className="customer-header__title">Meal Box</span>
        </div>
        <div className="customer-header__right">
          <button className="customer-header__theme" onClick={toggleTheme}>
            {theme === 'light' ? <HiOutlineMoon /> : <HiOutlineSun />}
          </button>
          <span className="customer-header__name">{user?.name}</span>
          <button className="customer-header__logout" onClick={handleLogout}>
            <HiOutlineLogout />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="customer-content">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile-first) */}
      <nav className="customer-bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`
            }
          >
            <item.icon className="bottom-nav__icon" />
            <span className="bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
