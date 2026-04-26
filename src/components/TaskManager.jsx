import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Settings, X, Save, Copy, Pause, Play } from 'lucide-react';
import { CATEGORIES, TASK_TYPES, ICON_OPTIONS } from '../data/defaultTasks';
import DynamicIcon from './DynamicIcon';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { formatTime, formatTarget } from '../utils/formatters';

const timeOptions = Array.from({ length: 120 }, (_, i) => (i + 1) * 5);

const emptyTask = {
  name: '',
  type: 'daily',
  icon: 'Star',
  category: "Здоров'я",
  status: 'active',
  pauseHistory: [],
  enabled: true,
  targetType: 'count',
  target: 1,
  rewardPoints: 1,
  penaltyPoints: -1,
  bonusTiers: [],
  deadline: null,
  challengeType: 'date',
  rewardStrategy: 'per_completion',
  durationDays: 30,
  durationWeeks: 4,
  completions: {},
};

export default function TaskManager({ tasks, addTask, updateTask, deleteTask }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({ ...emptyTask });
  const [filterType, setFilterType] = useState('all');

  const handleTogglePause = (task) => {
    const isPausing = task.status !== 'paused';
    
    let evaluateCurrentPeriod = false;
    if (isPausing && ['weekly', 'monthly', 'limit'].includes(task.type)) {
      evaluateCurrentPeriod = window.confirm(
        "Ви ставите задачу на паузу.\n\nЧи хочете ви оцінити її результати за цей період (тиждень/місяць) на основі вже виконаної роботи?\n\n- Натисніть 'OK' щоб зарахувати/оштрафувати поточний прогрес.\n- Натисніть 'Cancel' щоб взагалі скасувати задачу на цей період."
      );
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let newPauseHistory = [...(task.pauseHistory || [])];

    if (isPausing) {
      newPauseHistory.push({ start: todayStr, end: null, evaluateCurrentPeriod });
    } else {
      if (newPauseHistory.length > 0 && !newPauseHistory[newPauseHistory.length - 1].end) {
        newPauseHistory[newPauseHistory.length - 1].end = todayStr;
      }
    }

    updateTask(task.id, {
      status: isPausing ? 'paused' : 'active',
      pauseHistory: newPauseHistory
    });
  };
  const [filterCategory, setFilterCategory] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filteredTasks = tasks.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  });

  const openCreateForm = () => {
    setFormData({ ...emptyTask });
    setEditingTask(null);
    setShowForm(true);
  };

  const openEditForm = (task) => {
    setFormData({ ...task });
    setEditingTask(task.id);
    setShowForm(true);
  };

  const duplicateTask = (task) => {
    const dup = {
      ...task,
      id: uuidv4(),
      name: task.name + ' (копія)',
      createdAt: format(new Date(), 'yyyy-MM-dd'),
      completions: {},
    };
    addTask(dup);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingTask) {
      updateTask(editingTask, formData);
    } else {
      addTask(formData);
    }
    setShowForm(false);
    setEditingTask(null);
  };

  const handleDeleteConfirm = (id) => {
    deleteTask(id);
    setConfirmDelete(null);
  };

  const addBonusTier = () => {
    setFormData(prev => ({
      ...prev,
      bonusTiers: [...(prev.bonusTiers || []), { threshold: prev.target + (prev.targetType === 'time' ? 15 : 1), points: 1 }],
    }));
  };

  const updateBonusTier = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      bonusTiers: prev.bonusTiers.map((tier, i) =>
        i === index ? { ...tier, [field]: Number(value) } : tier
      ),
    }));
  };

  const removeBonusTier = (index) => {
    setFormData(prev => ({
      ...prev,
      bonusTiers: prev.bonusTiers.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>
          <Settings size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Управління задачами
        </h2>
        <p>Створюй, редагуй та налаштовуй свої задачі</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={openCreateForm}>
          <Plus size={18} /> Нова задача
        </button>

        <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
          value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Всі типи</option>
          {TASK_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
          value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">Всі категорії</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', marginLeft: 'auto' }}>
          {filteredTasks.length} задач
        </span>
      </div>

      {/* Task Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Назва</th>
                <th>Тип</th>
                <th>Категорія</th>
                <th>Таргет</th>
                <th>Нагорода</th>
                <th>Штраф</th>
                <th>Бонуси</th>
                <th>Статус</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id} style={{ opacity: task.status === 'paused' ? 0.5 : 1 }}>
                  <td>
                    <div className={`task-item-icon ${task.type}`} style={{ width: 32, height: 32 }}>
                      <DynamicIcon name={task.icon} size={16} />
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{task.name}</td>
                  <td><span className={`badge badge-${task.type}`}>{
                    TASK_TYPES.find(t => t.value === task.type)?.label || task.type
                  }</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{task.category}</td>
                  <td>{formatTarget(task.target, task.targetType)}</td>
                  <td><span className="points-badge points-positive">+{task.rewardPoints}</span></td>
                  <td>
                    {task.penaltyPoints < 0 ? (
                      <span className="points-badge points-negative">{task.penaltyPoints}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {task.bonusTiers && task.bonusTiers.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {task.bonusTiers.map((tier, i) => (
                          <span key={i} className="points-badge points-positive" style={{ fontSize: 10 }}>
                            {formatTarget(tier.threshold, task.targetType)}{task.targetType === 'time' ? ' →' : '× →'} +{tier.points}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <span
                      className={`badge ${task.status === 'paused' ? 'badge-secondary' : 'badge-success'}`}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      {task.status === 'paused' ? 'На паузі' : 'Активна'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" style={{ width: 28, height: 28, color: task.status === 'paused' ? 'var(--color-success)' : 'var(--color-warning)' }} onClick={() => handleTogglePause(task)} title={task.status === 'paused' ? 'Відновити' : 'Поставити на паузу'}>
                        {task.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                      <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => openEditForm(task)} title="Редагувати">
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => duplicateTask(task)} title="Дублювати">
                        <Copy size={14} />
                      </button>
                      <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--color-danger)' }}
                        onClick={() => setConfirmDelete(task.id)} title="Видалити">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <p>Задач не знайдено</p>
                      <button className="btn btn-primary btn-sm" onClick={openCreateForm}>
                        <Plus size={16} /> Створити задачу
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? 'Редагувати задачу' : 'Нова задача'}</h3>
              <button className="btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Назва задачі *</label>
                  <input
                    className="form-input"
                    placeholder="Наприклад: Почистити зуби"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Тип</label>
                    <select className="form-select" value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value, penaltyPoints: e.target.value === 'bonus' ? 0 : formData.penaltyPoints })}>
                      {TASK_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Категорія</label>
                    <select className="form-select" value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Іконка</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ICON_OPTIONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className="btn-icon"
                        style={{
                          width: 36, height: 36,
                          background: formData.icon === icon ? 'var(--color-primary)' : undefined,
                          color: formData.icon === icon ? 'white' : undefined,
                          borderColor: formData.icon === icon ? 'var(--color-primary)' : undefined,
                        }}
                        onClick={() => setFormData({ ...formData, icon })}
                        title={icon}
                      >
                        <DynamicIcon name={icon} size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Вимірювання</label>
                    </div>
                    <div className="target-type-toggle" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 4 }}>
                      <button type="button" className={`btn btn-sm ${formData.targetType !== 'time' ? 'btn-primary' : ''}`} style={{ flex: 1, background: formData.targetType !== 'time' ? 'var(--color-primary)' : 'transparent', border: 'none', color: formData.targetType !== 'time' ? 'white' : 'var(--text-muted)' }} onClick={() => setFormData({...formData, targetType: 'count', target: formData.targetType === 'time' ? 1 : formData.target})}>Кількість</button>
                      <button type="button" className={`btn btn-sm ${formData.targetType === 'time' ? 'btn-primary' : ''}`} style={{ flex: 1, background: formData.targetType === 'time' ? 'var(--color-primary)' : 'transparent', border: 'none', color: formData.targetType === 'time' ? 'white' : 'var(--text-muted)' }} onClick={() => setFormData({...formData, targetType: 'time', target: formData.targetType !== 'time' ? 15 : formData.target})}>Час</button>
                    </div>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">
                      {formData.targetType === 'time' ? 'Таргет' : formData.type === 'limit' ? 'Ліміт (макс. на тиждень)' : `Таргет (${formData.type === 'daily' ? 'на день' : formData.type === 'weekly' ? 'на тиждень' : formData.type === 'monthly' ? 'на місяць' : 'разів'})`}
                    </label>
                    {formData.targetType === 'time' ? (
                      <select
                        className="form-select"
                        value={formData.target}
                        onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) })}
                      >
                        {timeOptions.map(mins => (
                          <option key={mins} value={mins}>{formatTime(mins)}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        step="1"
                        value={formData.target}
                        onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) })}
                      />
                    )}
                  </div>
                </div>

                <div className="form-row">

                  <div className="form-group">
                    <label className="form-label">
                      {formData.type === 'limit' ? 'Бали за дотримання ліміту' : 'Бали за досягнення'}
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={formData.rewardPoints}
                      onChange={(e) => setFormData({ ...formData, rewardPoints: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>

                  {formData.type !== 'bonus' && (
                    <div className="form-group">
                      <label className="form-label">
                        {formData.type === 'limit' ? 'Штраф за перевищення' : 'Штраф за невиконання'}
                      </label>
                      <input
                        className="form-input"
                        type="number"
                        max="0"
                        value={formData.penaltyPoints}
                        onChange={(e) => setFormData({ ...formData, penaltyPoints: Math.min(0, Number(e.target.value)) })}
                      />
                    </div>
                  )}
                </div>

                {formData.type === 'challenge' && (
                  <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                    <div style={{ marginBottom: 12 }}>
                      <label className="form-label">Тип челленджу</label>
                      <select
                        className="form-select"
                        value={formData.challengeType}
                        onChange={(e) => setFormData({ ...formData, challengeType: e.target.value })}
                      >
                        <option value="date">До конкретної дати</option>
                        <option value="daily_streak">Щоденне виконання (X днів)</option>
                        <option value="weekly_recurrent">Тижневе виконання (X тижнів)</option>
                      </select>
                    </div>

                    {formData.challengeType === 'date' && (
                      <div className="form-group">
                        <label className="form-label">Дедлайн</label>
                        <input
                          className="form-input"
                          type="date"
                          value={formData.deadline || ''}
                          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                      </div>
                    )}

                    {formData.challengeType === 'daily_streak' && (
                      <div className="form-group">
                        <label className="form-label">Тривалість (днів)</label>
                        <input
                          className="form-input"
                          type="number"
                          min="1"
                          value={formData.durationDays}
                          onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                        />
                      </div>
                    )}

                    {formData.challengeType === 'weekly_recurrent' && (
                      <div className="form-group">
                        <label className="form-label">Тривалість (тижнів)</label>
                        <input
                          className="form-input"
                          type="number"
                          min="1"
                          value={formData.durationWeeks}
                          onChange={(e) => setFormData({ ...formData, durationWeeks: Number(e.target.value) })}
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                      <label className="form-label">Коли нараховувати бали?</label>
                      <select
                        className="form-select"
                        value={formData.rewardStrategy}
                        onChange={(e) => setFormData({ ...formData, rewardStrategy: e.target.value })}
                      >
                        <option value="per_completion">За кожне проміжне виконання + Бонус в кінці</option>
                        <option value="end_only">Лише в кінці за весь челлендж</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Bonus Tiers */}
                <div className="form-group">
                  <label className="form-label">Бонусні рівні (за перевиконання)</label>
                  {formData.bonusTiers && formData.bonusTiers.map((tier, i) => (
                    <div key={i} className="bonus-tier-row">
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        Якщо ≥
                      </span>
                        {formData.targetType === 'time' ? (
                          <select
                            className="form-select"
                            value={tier.threshold}
                            onChange={(e) => updateBonusTier(i, 'threshold', Number(e.target.value))}
                            style={{ width: 110 }}
                          >
                            {timeOptions.map(mins => (
                              <option key={mins} value={mins}>{formatTime(mins)}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="form-input"
                            type="number"
                            min="1"
                            value={tier.threshold}
                            onChange={(e) => updateBonusTier(i, 'threshold', Number(e.target.value))}
                            style={{ width: 70 }}
                          />
                        )}
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                          {formData.targetType === 'time' ? '→' : '→'}
                        </span>
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>+</span>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        value={tier.points}
                        onChange={(e) => updateBonusTier(i, 'points', e.target.value)}
                        style={{ width: 70 }}
                      />
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>балів</span>
                      <button type="button" className="btn-icon" style={{ width: 28, height: 28, color: 'var(--color-danger)' }}
                        onClick={() => removeBonusTier(i)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addBonusTier}>
                    <Plus size={14} /> Додати бонусний рівень
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Скасувати</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> {editingTask ? 'Зберегти' : 'Створити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Видалити задачу?</h3>
              <button className="btn-icon" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <p>Ця дія видалить задачу та всю її історію. Це не можна скасувати.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Скасувати</button>
              <button className="btn btn-danger" onClick={() => handleDeleteConfirm(confirmDelete)}>
                <Trash2 size={16} /> Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
