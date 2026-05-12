import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import '../dashboard/Dashboard.css';

export default function MenuManager() {
  const [menus, setMenus] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState({ meal_time: 'morning', items: '', is_published: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMenu(); }, [selectedDate]);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/menu?date=${selectedDate}`);
      setMenus(res.data.menus || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const items = editData.items.split('\n').map(i => i.trim()).filter(Boolean);
    if (items.length === 0) {
      toast.error('Add at least one menu item');
      return;
    }
    try {
      await api.post('/menu', {
        menu_date: selectedDate,
        meal_time: editData.meal_time,
        items,
        is_published: editData.is_published
      });
      toast.success('Menu saved!');
      setShowModal(false);
      loadMenu();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleEdit = (menu) => {
    setEditData({
      meal_time: menu.meal_time,
      items: (menu.items || []).join('\n'),
      is_published: menu.is_published
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu?')) return;
    try {
      await api.delete(`/menu/${id}`);
      toast.success('Menu deleted');
      loadMenu();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu Management</h1>
          <p className="page-subtitle">Set daily menus for morning and dinner</p>
        </div>
        <div className="filters-bar">
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Button onClick={() => {
            setEditData({ meal_time: 'morning', items: '', is_published: true });
            setShowModal(true);
          }}>+ Add Menu</Button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      ) : menus.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🍽️</div>
          <h3 className="empty-state__title">No menu for this date</h3>
          <p className="empty-state__text">Click "Add Menu" to create one</p>
        </div>
      ) : (
        <div className="delivery-grid">
          {menus.map(menu => (
            <div key={menu.id} className={`delivery-card delivery-card--${menu.meal_time === 'morning' ? 'morning' : 'dinner'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 className="delivery-card__title">
                  {menu.meal_time === 'morning' ? '🌅 Morning' : '🌙 Dinner'}
                </h3>
                <span className={`badge badge--${menu.is_published ? 'active' : 'paused'}`}>
                  {menu.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {(menu.items || []).map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="action-btns">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(menu)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(menu.id)} style={{ color: 'var(--error-500)' }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Set Menu">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Meal Time</label>
            <select className="form-select" value={editData.meal_time}
              onChange={(e) => setEditData({ ...editData, meal_time: e.target.value })}>
              <option value="morning">Morning</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Menu Items (one per line)</label>
            <textarea
              className="form-input"
              rows={6}
              placeholder={"Dal Fry\nRice\nChapati x3\nSabzi\nSalad"}
              value={editData.items}
              onChange={(e) => setEditData({ ...editData, items: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={editData.is_published}
              onChange={(e) => setEditData({ ...editData, is_published: e.target.checked })} />
            Publish immediately
          </label>
          <Button onClick={handleSave} fullWidth>Save Menu</Button>
        </div>
      </Modal>
    </div>
  );
}
