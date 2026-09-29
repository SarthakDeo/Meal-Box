/**
 * BroadcastPanel — Admin widget to send a push notification to all users.
 * Drop this anywhere in the admin UI (currently used in AdminDashboard).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBell } from 'react-icons/hi';
import api from '../../services/api';

export default function BroadcastPanel() {
  const [form, setForm]       = useState({ title: '', body: '', url: '' });
  const [sending, setSending] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/push/broadcast', {
        title: form.title.trim(),
        body:  form.body.trim(),
        url:   form.url.trim() || '/',
      });
      const { sent, removed } = res.data;
      toast.success(`✅ Sent to ${sent} device${sent !== 1 ? 's' : ''}${removed ? ` (${removed} stale tokens removed)` : ''}`);
      setForm({ title: '', body: '', url: '' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Broadcast failed';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HiOutlineBell /> Send Push Notification
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <input
          className="form-input"
          name="title"
          placeholder="Title  (e.g. Today's Menu Ready 🍱)"
          value={form.title}
          onChange={handleChange}
          maxLength={100}
        />
        <textarea
          className="form-input"
          name="body"
          placeholder="Message body  (e.g. Morning tiffin is ready for pickup!)"
          value={form.body}
          onChange={handleChange}
          maxLength={300}
          rows={3}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
        <input
          className="form-input"
          name="url"
          placeholder="Link URL (optional, e.g. /customer/orders)"
          value={form.url}
          onChange={handleChange}
        />
        <button
          className="btn btn--primary"
          onClick={handleSend}
          disabled={sending}
          style={{ alignSelf: 'flex-start' }}
        >
          {sending ? 'Sending…' : '🔔 Broadcast to All Users'}
        </button>
      </div>
    </div>
  );
}
