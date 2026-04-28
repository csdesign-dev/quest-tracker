import React, { useState, useRef, useCallback } from 'react';
import { Plus, Pencil, Trash2, Settings, X, Save, Copy, Pause, Play, GripVertical } from 'lucide-react';
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
  finalBonusPoints: 10,
  finalBonusThreshold: 10,
  completions: {},
  daysOfWeek: [],
  bonusDate: null,
};

export default function TaskManager({ tasks, addTask, updateTask, deleteTask, reorderTasks }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({ ...emptyTask });
  const [filterType, setFilterType] = useState('all');
  const [quickAddText, setQuickAddText] = useState('');

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
  const [sortKey, setSortKey] = useState(null); // null = manual order
  const [sortDir, setSortDir] = useState('asc');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Drag and Drop — Pointer Events (працює в Safari, Chrome, Firefox)
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const ghostRef = useRef(null);
  const draggingIdRef = useRef(null);

  const canDragAndDrop = !sortKey && filterType === 'all' && filterCategory === 'all';

  const startDrag = useCallback((e, taskId) => {
    if (!canDragAndDrop) return;
    e.preventDefault(); // забороняємо виділення тексту

    draggingIdRef.current = taskId;
    setDraggedTaskId(taskId);

    // Створюємо ghost-елемент
    const task = tasks.find(t => t.id === taskId);
    const ghost = document.createElement('div');
    ghost.textContent = '\u2630  ' + (task?.name || 'Задача');
    ghost.style.cssText = [
      'position:fixed',
      `top:${(e.clientY ?? e.touches?.[0]?.clientY ?? 0) - 20}px`,
      `left:${(e.clientX ?? e.touches?.[0]?.clientX ?? 0) + 12}px`,
      'background:rgba(124,58,237,0.95)',
      'color:#fff',
      'padding:6px 14px',
      'border-radius:8px',
      'font-size:13px',
      'font-weight:600',
      'pointer-events:none',
      'z-index:99999',
      'box-shadow:0 4px 24px rgba(0,0,0,0.5)',
      'white-space:nowrap',
      'user-select:none',
    ].join(';');
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    const onMove = (ev) => {
      const cx = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0;
      const cy = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0;
      // Рухаємо ghost
      ghost.style.left = `${cx + 12}px`;
      ghost.style.top = `${cy - 20}px`;
      // Знаходимо рядок під курсором
      ghost.style.display = 'none';
      const el = document.elementFromPoint(cx, cy);
      ghost.style.display = '';
      const tr = el?.closest('tr[data-task-id]');
      setDragOverTaskId(tr ? tr.getAttribute('data-task-id') : null);
    };

    const onEnd = (ev) => {
      const cx = ev.clientX ?? ev.changedTouches?.[0]?.clientX ?? 0;
      const cy = ev.clientY ?? ev.changedTouches?.[0]?.clientY ?? 0;
      // Видаляємо ghost
      if (ghostRef.current) { document.body.removeChild(ghostRef.current); ghostRef.current = null; }
      // Визначаємо місце падіння
      const el = document.elementFromPoint(cx, cy);
      const tr = el?.closest('tr[data-task-id]');
      const targetId = tr ? tr.getAttribute('data-task-id') : null;
      const srcId = draggingIdRef.current;
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      draggingIdRef.current = null;
      if (targetId && targetId !== srcId) {
        const srcIdx = tasks.findIndex(t => t.id === srcId);
        const tgtIdx = tasks.findIndex(t => t.id === targetId);
        if (srcIdx !== -1 && tgtIdx !== -1) reorderTasks(srcIdx, tgtIdx);
      }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onEnd);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onEnd);
  }, [canDragAndDrop, tasks, reorderTasks]);

  let mainTasks = tasks.filter(t => {
    if (t.status === 'archived') return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (t.type === 'draft') return false; // Hide drafts from main list
    return true;
  });

  let draftTasks = tasks.filter(t => {
    if (t.status === 'archived') return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (t.type !== 'draft') return false;
    return true;
  });

  const applySort = (list) => {
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';
      if (sortKey === 'status') {
        aVal = a.status === 'paused' ? 1 : 0;
        bVal = b.status === 'paused' ? 1 : 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), 'uk');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  };

  mainTasks = applySort(mainTasks);
  draftTasks = applySort(draftTasks);

  const handleSortHeader = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); } // 3rd click — reset to manual
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

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

  const handleQuickAdd = () => {
    if (!quickAddText.trim()) return;
    addTask({
      ...emptyTask,
      name: quickAddText.trim(),
      type: 'draft',
      category: 'Інше',
      icon: 'Star',
      rewardPoints: 0,
      penaltyPoints: 0,
      targetType: 'count',
      target: 1
    });
    setQuickAddText('');
  };

  const handleDeleteConfirm = () => {
    if (!confirmDelete) return;
    deleteTask(confirmDelete);
    setConfirmDelete(null);
  };

  const handleArchiveConfirm = () => {
    if (!confirmDelete) return;
    const taskToArchive = tasks.find(t => t.id === confirmDelete);
    if (taskToArchive) {
      updateTask(taskToArchive.id, { ...taskToArchive, status: 'archived' });
    }
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

        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200, maxWidth: 400 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Швидко записати ідею..." 
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          />
          <button className="btn btn-secondary" onClick={handleQuickAdd} disabled={!quickAddText.trim()}>
            Додати
          </button>
        </div>

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

        {/* Випадаюче меню сортування видалено. Сортування через натиск на заголовок таблиці */}

        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', marginLeft: 'auto' }}>
          {mainTasks.length + draftTasks.length} задач
        </span>
      </div>

      {/* Draft Tasks Card */}
      {draftTasks.length > 0 && filterType === 'all' && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <span className="card-title">💡 Швидко записані ідеї</span>
            <span className="card-subtitle">{draftTasks.length} ідей</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th style={{ width: 40 }}></th>
                  <th
                    onClick={() => handleSortHeader('name')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >Назва <SortIcon col="name" /></th>
                  <th
                    onClick={() => handleSortHeader('type')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >Тип <SortIcon col="type" /></th>
                  <th
                    onClick={() => handleSortHeader('category')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >Категорія <SortIcon col="category" /></th>
                  <th
                    onClick={() => handleSortHeader('target')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >Таргет <SortIcon col="target" /></th>
                  <th
                    onClick={() => handleSortHeader('rewardPoints')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >Нагорода <SortIcon col="rewardPoints" /></th>
                  <th
                    onClick={() => handleSortHeader('penaltyPoints')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >Штраф <SortIcon col="penaltyPoints" /></th>
                  <th>Бонуси</th>
                  <th
                    onClick={() => handleSortHeader('status')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >Статус <SortIcon col="status" /></th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {draftTasks.map((task) => (
                  <tr 
                    key={task.id}
                    data-task-id={task.id}
                    style={{ 
                      opacity: task.status === 'paused' ? 0.5 : (draggedTaskId === task.id ? 0.3 : 1),
                      backgroundColor: dragOverTaskId === task.id ? 'var(--bg-card-hover)' : '',
                      borderTop: dragOverTaskId === task.id ? '2px solid var(--color-primary)' : '',
                      transition: 'background-color 0.15s ease',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                  >
                    {/* Grip handle — Pointer Events (Safari + Chrome + Firefox) */}
                    <td
                      onPointerDown={(e) => startDrag(e, task.id)}
                      style={{
                        width: 36,
                        textAlign: 'center',
                        cursor: canDragAndDrop ? 'grab' : 'not-allowed',
                        color: canDragAndDrop ? 'var(--text-secondary)' : 'var(--text-muted)',
                        opacity: canDragAndDrop ? 1 : 0.35,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        touchAction: 'none',
                      }}
                      title={canDragAndDrop ? 'Перетягни для зміни порядку' : 'Вимкні фільтри/сортування для DnD'}
                    >
                      <GripVertical size={16} />
                    </td>
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th style={{ width: 40 }}></th>
                <th
                  onClick={() => handleSortHeader('name')}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >Назва <SortIcon col="name" /></th>
                <th
                  onClick={() => handleSortHeader('type')}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >Тип <SortIcon col="type" /></th>
                <th
                  onClick={() => handleSortHeader('category')}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >Категорія <SortIcon col="category" /></th>
                <th
                  onClick={() => handleSortHeader('target')}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >Таргет <SortIcon col="target" /></th>
                <th
                  onClick={() => handleSortHeader('rewardPoints')}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >Нагорода <SortIcon col="rewardPoints" /></th>
                <th
                  onClick={() => handleSortHeader('penaltyPoints')}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >Штраф <SortIcon col="penaltyPoints" /></th>
                <th>Бонуси</th>
                <th
                  onClick={() => handleSortHeader('status')}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >Статус <SortIcon col="status" /></th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {mainTasks.map((task) => (
                <tr 
                  key={task.id}
                  data-task-id={task.id}
                  style={{ 
                    opacity: task.status === 'paused' ? 0.5 : (draggedTaskId === task.id ? 0.3 : 1),
                    backgroundColor: dragOverTaskId === task.id ? 'var(--bg-card-hover)' : '',
                    borderTop: dragOverTaskId === task.id ? '2px solid var(--color-primary)' : '',
                    transition: 'background-color 0.15s ease',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  {/* Grip handle — Pointer Events (Safari + Chrome + Firefox) */}
                  <td
                    onPointerDown={(e) => startDrag(e, task.id)}
                    style={{
                      width: 36,
                      textAlign: 'center',
                      cursor: canDragAndDrop ? 'grab' : 'not-allowed',
                      color: canDragAndDrop ? 'var(--text-secondary)' : 'var(--text-muted)',
                      opacity: canDragAndDrop ? 1 : 0.35,
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      touchAction: 'none',
                    }}
                    title={canDragAndDrop ? 'Перетягни для зміни порядку' : 'Вимкні фільтри/сортування для DnD'}
                  >
                    <GripVertical size={16} />
                  </td>
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
              {mainTasks.length === 0 && (
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

                {formData.type === 'bonus' && (
                  <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">На який день? (Необов'язково)</label>
                    <input
                      className="form-input"
                      type="date"
                      value={formData.bonusDate || ''}
                      onChange={(e) => setFormData({ ...formData, bonusDate: e.target.value || null })}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      Якщо обрати день, задача з'явиться лише в цей день. Якщо ні — буде доступна щодня.
                    </div>
                  </div>
                )}

                {formData.type === 'weekly' && (
                  <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">У які дні виконувати? (Необов'язково)</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                      {[
                        { val: 1, label: 'Пн' },
                        { val: 2, label: 'Вт' },
                        { val: 3, label: 'Ср' },
                        { val: 4, label: 'Чт' },
                        { val: 5, label: 'Пт' },
                        { val: 6, label: 'Сб' },
                        { val: 0, label: 'Нд' }
                      ].map(day => {
                        const isSelected = (formData.daysOfWeek || []).includes(day.val);
                        return (
                          <button
                            key={day.val}
                            type="button"
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : ''}`}
                            style={{ 
                              flex: 1, 
                              minWidth: 36, 
                              padding: '4px 0',
                              background: isSelected ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)',
                              color: isSelected ? 'white' : 'var(--text-secondary)',
                              border: 'none'
                            }}
                            onClick={() => {
                              const current = formData.daysOfWeek || [];
                              if (isSelected) {
                                setFormData({ ...formData, daysOfWeek: current.filter(d => d !== day.val) });
                              } else {
                                setFormData({ ...formData, daysOfWeek: [...current, day.val] });
                              }
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      Якщо не обрати жодного дня, задача буде доступна всі дні тижня.
                    </div>
                  </div>
                )}

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

                    {formData.rewardStrategy === 'per_completion' && (
                      <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.1)', borderRadius: 8 }}>
                        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Фінальний бонус (за загальний успіх)</div>
                        <div className="form-row">
                          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>
                              {formData.targetType === 'time' ? 'Скільки всього хвилин треба?' : 'Скільки всього разів треба?'}
                            </label>
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              max={
                                formData.challengeType === 'daily_streak'
                                  ? (formData.target || 1) * (formData.durationDays || 30)
                                  : formData.challengeType === 'weekly_recurrent'
                                  ? (formData.target || 1) * (formData.durationWeeks || 4)
                                  : (formData.target || 1)
                              }
                              value={formData.finalBonusThreshold || 10}
                              onChange={(e) => {
                                let val = Number(e.target.value);
                                let maxVal = formData.target || 1;
                                if (formData.challengeType === 'daily_streak') maxVal *= (formData.durationDays || 30);
                                else if (formData.challengeType === 'weekly_recurrent') maxVal *= (formData.durationWeeks || 4);
                                
                                if (val > maxVal) val = maxVal;
                                setFormData({ ...formData, finalBonusThreshold: val });
                              }}
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Скільки балів дати?</label>
                            <input
                              className="form-input"
                              type="number"
                              min="0"
                              value={formData.finalBonusPoints || 0}
                              onChange={(e) => setFormData({ ...formData, finalBonusPoints: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Видалити задачу?</h3>
              <button className="btn-icon" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>Що зробити з історією виконання цієї задачі?</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '12px 16px' }}
                  onClick={handleArchiveConfirm}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Видалити, але зберегти історію</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Задача зникне зі списків, але зароблені бали залишаться в статистиці.</div>
                  </div>
                </button>
                
                <button 
                  className="btn btn-danger" 
                  style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)' }}
                  onClick={handleDeleteConfirm}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Видалити повністю</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Всі бали та історія, пов'язана з цією задачею, будуть назавжди видалені.</div>
                  </div>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button className="btn" onClick={() => setConfirmDelete(null)}>Скасувати</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
