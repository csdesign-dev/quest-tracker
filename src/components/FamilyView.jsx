import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Copy, Check, ChevronRight, ChevronLeft,
  Crown, Baby, User, RefreshCw, Trash2, LogOut, X, Shield
} from 'lucide-react';
import { createFamily, joinFamily, getMyFamilies, getMemberTasks, updateMemberRole, removeMember, leaveFamily, deleteFamily } from '../utils/family';
import { getAllPeriodScores } from '../utils/scoring';
import DynamicIcon from './DynamicIcon';

const ROLE_LABELS = {
  parent: { label: 'Батько/Мати', icon: Crown, color: '#f59e0b' },
  child: { label: 'Дитина', icon: Baby, color: '#60a5fa' },
  member: { label: 'Член сім\'ї', icon: User, color: '#a78bfa' },
};

export default function FamilyView({ session }) {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState('child');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTasks, setMemberTasks] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const loadFamilies = useCallback(async () => {
    setLoading(true);
    const { data } = await getMyFamilies();
    setFamilies(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFamilies();
  }, [loadFamilies]);

  const handleCreateFamily = async () => {
    setError('');
    if (!familyName.trim()) { setError('Введіть назву сім\'ї'); return; }
    const { data, error: err } = await createFamily(familyName.trim());
    if (err) { setError(err); return; }
    setSuccess(`Сім'ю "${data.name}" створено! Код запрошення: ${data.invite_code}`);
    setShowCreate(false);
    setFamilyName('');
    loadFamilies();
  };

  const handleJoinFamily = async () => {
    setError('');
    if (!joinCode.trim()) { setError('Введіть код запрошення'); return; }
    const { data, error: err } = await joinFamily(joinCode.trim(), joinRole);
    if (err) { setError(err); return; }
    setSuccess(`Ви приєдналися до сім'ї "${data.name}"!`);
    setShowJoin(false);
    setJoinCode('');
    loadFamilies();
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleViewMember = async (member) => {
    setSelectedMember(member);
    setLoadingTasks(true);
    const tasks = await getMemberTasks(member.user_id);
    setMemberTasks(tasks);
    setLoadingTasks(false);
  };

  const handleUpdateRole = async (memberId, newRole) => {
    await updateMemberRole(memberId, newRole);
    loadFamilies();
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Видалити цього члена зі сім\'ї?')) return;
    await removeMember(memberId);
    loadFamilies();
    setSelectedMember(null);
  };

  const handleLeaveFamily = async (familyId) => {
    if (!window.confirm('Ви впевнені, що хочете покинути сім\'ю?')) return;
    await leaveFamily(familyId);
    loadFamilies();
  };

  const handleDeleteFamily = async (familyId) => {
    if (!window.confirm('Видалити сім\'ю? Всі дані буде втрачено.')) return;
    await deleteFamily(familyId);
    loadFamilies();
  };

  if (!session) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h3>Система «Сім'я»</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          Для використання сімейних функцій потрібно увійти через Email-акаунт (Supabase Auth).
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Локальні профілі не підтримують сімейний режим.
        </p>
      </div>
    );
  }

  // ---- Member detail view ----
  if (selectedMember) {
    const roleInfo = ROLE_LABELS[selectedMember.role] || ROLE_LABELS.member;
    const memberScores = memberTasks ? getAllPeriodScores(memberTasks) : null;

    return (
      <div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setSelectedMember(null); setMemberTasks(null); }}
          style={{ marginBottom: 16 }}
        >
          <ChevronLeft size={16} /> Назад
        </button>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: selectedMember.profile?.color || '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: 'white', fontWeight: 700
            }}>
              {(selectedMember.nickname || selectedMember.profile?.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{selectedMember.nickname || selectedMember.profile?.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <roleInfo.icon size={14} style={{ color: roleInfo.color }} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{roleInfo.label}</span>
              </div>
            </div>
            {memberScores && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Загальний рахунок</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: (memberScores.all?.score || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {(memberScores.all?.score || 0) >= 0 ? '+' : ''}{memberScores.all?.score || 0}
                </div>
              </div>
            )}
          </div>
        </div>

        {loadingTasks ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Завантаження задач...</p>
          </div>
        ) : memberTasks && memberTasks.length > 0 ? (
          <>
            {/* Active tasks */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 Задачі ({memberTasks.filter(t => t.enabled && t.status !== 'archived').length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {memberTasks
                  .filter(t => t.enabled && t.status !== 'archived')
                  .map(task => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const todayCompletions = task.completions?.[todayStr] || 0;
                    const target = task.target || 1;
                    const isDone = todayCompletions >= target;

                    return (
                      <div key={task.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8,
                        background: isDone ? 'rgba(16,185,129,0.08)' : 'var(--bg-secondary)',
                        border: isDone ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent'
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'
                        }}>
                          <DynamicIcon name={task.icon} size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{task.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {task.type === 'daily' ? 'Щоденна' : task.type === 'weekly' ? 'Тижнева' : task.type}
                            {' · '}+{task.rewardPoints} бал{task.rewardPoints > 1 ? 'ів' : ''}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: isDone ? 'var(--color-success)' : 'var(--text-muted)'
                        }}>
                          {isDone ? '✅' : `${todayCompletions}/${target}`}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Today's summary */}
            {memberScores && (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-header">
                  <span className="card-title">📊 Статистика</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Сьогодні', value: memberScores.day?.score || 0, max: memberScores.day?.maxPossible || 0 },
                    { label: 'Тиждень', value: memberScores.week?.score || 0, max: memberScores.week?.maxPossible || 0 },
                    { label: 'Місяць', value: memberScores.month?.score || 0, max: memberScores.month?.maxPossible || 0 },
                  ].map(s => (
                    <div key={s.label} style={{
                      textAlign: 'center', padding: 12, borderRadius: 8,
                      background: 'var(--bg-secondary)'
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.value >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {s.value >= 0 ? '+' : ''}{s.value}
                      </div>
                      {s.max > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          з {s.max} можливих
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <p>Задач не знайдено або дані ще не синхронізовано.</p>
          </div>
        )}
      </div>
    );
  }

  // ---- Main family list view ----
  return (
    <div>
      {/* Notifications */}
      {error && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--color-danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button className="btn-icon" onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          color: 'var(--color-success-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>{success}</span>
          <button className="btn-icon" onClick={() => setSuccess('')}><X size={16} /></button>
        </div>
      )}

      {/* Header actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); setShowJoin(false); }}>
          <Users size={16} /> Створити сім'ю
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setShowJoin(true); setShowCreate(false); }}>
          <UserPlus size={16} /> Приєднатися
        </button>
        <button className="btn-icon" onClick={loadFamilies} title="Оновити" style={{ marginLeft: 'auto' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Create family form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Нова сім'я</span>
            <button className="btn-icon" onClick={() => setShowCreate(false)}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Назва сім'ї (наприклад: Родина Петренків)"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFamily()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleCreateFamily}>Створити</button>
          </div>
        </div>
      )}

      {/* Join family form */}
      {showJoin && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Приєднатися до сім'ї</span>
            <button className="btn-icon" onClick={() => setShowJoin(false)}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              placeholder="Код запрошення (6 символів)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinFamily()}
              maxLength={6}
              style={{ letterSpacing: 4, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: joinRole === 'child' ? 'rgba(96,165,250,0.15)' : 'var(--bg-secondary)', border: joinRole === 'child' ? '1px solid rgba(96,165,250,0.3)' : '1px solid transparent' }}>
                <input type="radio" name="joinRole" value="child" checked={joinRole === 'child'} onChange={() => setJoinRole('child')} style={{ display: 'none' }} />
                <Baby size={14} /> Я — дитина
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: joinRole === 'member' ? 'rgba(167,139,250,0.15)' : 'var(--bg-secondary)', border: joinRole === 'member' ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent' }}>
                <input type="radio" name="joinRole" value="member" checked={joinRole === 'member'} onChange={() => setJoinRole('member')} style={{ display: 'none' }} />
                <User size={14} /> Я — дорослий
              </label>
            </div>
            <button className="btn btn-primary" onClick={handleJoinFamily}>Приєднатися</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <RefreshCw size={24} className="spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      )}

      {/* Family list */}
      {!loading && families.length === 0 && !showCreate && !showJoin && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>У вас ще немає сім'ї</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Створіть нову сім'ю або приєднайтеся за кодом запрошення.
          </p>
        </div>
      )}

      {families.map(family => (
        <div key={family.id} className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div>
              <span className="card-title">👨‍👩‍👧‍👦 {family.name}</span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Ваша роль: {ROLE_LABELS[family.myRole]?.label || family.myRole}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Invite code */}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopyCode(family.invite_code)}
                title="Скопіювати код запрошення"
                style={{ fontSize: 12 }}
              >
                {copiedCode === family.invite_code ? <Check size={14} /> : <Copy size={14} />}
                {' '}{family.invite_code}
              </button>
              {/* Family actions */}
              {family.myRole === 'parent' ? (
                <button className="btn-icon" onClick={() => handleDeleteFamily(family.id)} title="Видалити сім'ю" style={{ color: 'var(--color-danger)' }}>
                  <Trash2 size={16} />
                </button>
              ) : (
                <button className="btn-icon" onClick={() => handleLeaveFamily(family.id)} title="Покинути сім'ю" style={{ color: 'var(--color-warning)' }}>
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Members list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {family.members.map(member => {
              const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.member;
              const isMe = member.user_id === session?.user?.id;

              return (
                <div
                  key={member.id}
                  onClick={() => !isMe && handleViewMember(member)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    background: isMe ? 'rgba(124,58,237,0.08)' : 'var(--bg-secondary)',
                    border: isMe ? '1px solid rgba(124,58,237,0.15)' : '1px solid transparent',
                    cursor: isMe ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!isMe) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: member.profile?.color || '#7c3aed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0
                  }}>
                    {(member.nickname || member.profile?.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {member.nickname || member.profile?.name || 'Користувач'}
                      {isMe && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(Ви)</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: roleInfo.color }}>
                      <roleInfo.icon size={12} />
                      {roleInfo.label}
                    </div>
                  </div>

                  {/* Role change (for parents) */}
                  {family.myRole === 'parent' && !isMe && (
                    <select
                      value={member.role}
                      onChange={e => { e.stopPropagation(); handleUpdateRole(member.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className="input"
                      style={{ width: 'auto', fontSize: 11, padding: '4px 8px', background: 'var(--bg-tertiary)' }}
                    >
                      <option value="parent">Батько/Мати</option>
                      <option value="child">Дитина</option>
                      <option value="member">Член сім'ї</option>
                    </select>
                  )}

                  {!isMe && <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
