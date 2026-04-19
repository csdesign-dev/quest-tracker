import React, { useState } from 'react';
import { UserPlus, LogIn, Trash2, X, Zap, User } from 'lucide-react';

const PROFILE_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#6366f1', '#8b5cf6', '#f97316',
];

export default function ProfileSelector({ profiles, onSelect, onCreate, onDelete }) {
  const [showCreate, setShowCreate] = useState(profiles.length === 0);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROFILE_COLORS[0]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), color);
    setName('');
    setShowCreate(false);
  };

  return (
    <div className="profile-selector-backdrop">
      <div className="profile-selector-container animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--gradient-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-md)',
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.3)',
          }}>
            <Zap size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 900, color: 'var(--text-primary)' }}>
            Quest Tracker
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            Обери свій профіль або створи новий
          </p>
        </div>

        {/* Profiles List */}
        {profiles.length > 0 && !showCreate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'var(--space-lg)' }}>
            {profiles.map(profile => (
              <div
                key={profile.id}
                className="profile-card"
                onClick={() => onSelect(profile.id)}
              >
                <div className="profile-avatar" style={{ background: profile.color }}>
                  <User size={24} color="white" />
                </div>
                <div className="profile-card-info">
                  <div className="profile-card-name">{profile.name}</div>
                  <div className="profile-card-date">
                    Створено: {new Date(profile.createdAt).toLocaleDateString('uk')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => { e.stopPropagation(); onSelect(profile.id); }}
                  >
                    <LogIn size={14} /> Увійти
                  </button>
                  <button
                    className="btn-icon"
                    style={{ width: 32, height: 32, color: 'var(--color-danger)' }}
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(profile.id); }}
                    title="Видалити"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Profile Form */}
        {showCreate ? (
          <form onSubmit={handleCreate} className="card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>
              {profiles.length === 0 ? 'Створи свій перший профіль' : 'Новий профіль'}
            </h3>
            <div className="form-group">
              <label className="form-label">Ім'я</label>
              <input
                className="form-input"
                placeholder="Як тебе звати?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Колір</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROFILE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: c, border: color === c ? '3px solid white' : '3px solid transparent',
                      cursor: 'pointer', transition: 'transform 0.15s',
                      transform: color === c ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: color === c ? `0 0 16px ${c}50` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-md)' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <UserPlus size={16} /> Створити
              </button>
              {profiles.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                  Скасувати
                </button>
              )}
            </div>
          </form>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() => setShowCreate(true)}
          >
            <UserPlus size={16} /> Створити новий профіль
          </button>
        )}

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h3>Видалити профіль?</h3>
                <button className="btn-icon" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)' }}>
                  Це видалить профіль та всю його історію задач. Цю дію не можна скасувати.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Скасувати</button>
                <button className="btn btn-danger" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}>
                  <Trash2 size={16} /> Видалити
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
