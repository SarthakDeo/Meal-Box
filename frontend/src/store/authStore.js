import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  
  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, access_token, refresh_token } = res.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ user, loading: false });
      toast.success(`Welcome back, ${user.name}!`);
      return user;
    } catch (error) {
      set({ loading: false });
      const msg = error.response?.data?.error || 'Login failed';
      toast.error(msg);
      throw error;
    }
  },

  register: async (data) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', data);
      const { user, access_token, refresh_token } = res.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ user, loading: false });
      toast.success('Registration successful!');
      return user;
    } catch (error) {
      set({ loading: false });
      const msg = error.response?.data?.error || 'Registration failed';
      toast.error(msg);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null });
    toast.success('Logged out');
  },

  refreshProfile: async () => {
    try {
      const res = await api.get('/auth/me');
      const user = res.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch (error) {
      // Ignore refresh failures
    }
  },
}));
