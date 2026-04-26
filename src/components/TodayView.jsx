import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Minus, Plus } from 'lucide-react';
import TaskItem from './TaskItem';
import DynamicIcon from './DynamicIcon';
import { getCompletionsInRange } from '../utils/scoring';
import { formatTime, formatTarget } from '../utils/formatters';

export default function TodayView({ tasks, logCompletion }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dateLabel = format(selectedDate, "EEEE, d MMMM yyyy", { locale: uk });
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const isValidForDate = (task, dateToCheck) => {
    if (!task.enabled || task.status === 'paused') return false;
    if (!task.createdAt) return true;
    return dateStr >= task.createdAt; // Both are 'yyyy-MM-dd' strings, safe to compare
  };

  const isValidForPeriod = (task, periodEnd) => {
    if (!task.enabled || task.status === 'paused') return false;
    if (!task.createdAt) return true;
    return format(periodEnd, 'yyyy-MM-dd') >= task.createdAt;
  };

  const dailyTasks = tasks.filter(t => isValidForDate(t, selectedDate) && t.type === 'daily');
  const weeklyTasks = tasks.filter(t => isValidForPeriod(t, weekEnd) && t.type === 'weekly');
  const monthlyTasks = tasks.filter(t => isValidForPeriod(t, monthEnd) && t.type === 'monthly');
  const bonusTasks = tasks.filter(t => isValidForDate(t, selectedDate) && t.type === 'bonus');
  const deadlineTasks = tasks.filter(t => isValidForDate(t, selectedDate) && t.type === 'deadline');
  const limitTasks = tasks.filter(t => isValidForPeriod(t, weekEnd) && t.type === 'limit');

  // Generate week days for mini calendar
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const prevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const nextDay = () => setSelectedDate(prev => {
    const next = new Date(prev);
    next.setDate(next.getDate() + 1);
    if (next > new Date()) return prev;
    return next;
  });
  const goToday = () => setSelectedDate(new Date());

  const handleLog = (task, delta) => {
    if (task.targetType === 'time') {
      const isAdd = delta > 0;
      const val = window.prompt(`Скільки хвилин ${isAdd ? 'додати' : 'відняти'}?`, '15');
      if (val && !isNaN(val)) {
        logCompletion(task.id, dateStr, isAdd ? Math.abs(Number(val)) : -Math.abs(Number(val)));
      }
    } else {
      logCompletion(task.id, dateStr, delta);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>
          <Calendar size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Задачі на день
        </h2>
        <p style={{ textTransform: 'capitalize' }}>{dateLabel}</p>
      </div>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-lg)' }}>
        <button className="btn-icon" onClick={prevDay}><ChevronLeft size={18} /></button>
        
        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
          {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const isSelected = dayKey === dateStr;
            const dayIsToday = dayKey === format(new Date(), 'yyyy-MM-dd');
            return (
              <button
                key={dayKey}
                className="btn"
                onClick={() => {
                  if (day <= new Date()) setSelectedDate(day);
                }}
                style={{
                  flex: '0 0 auto',
                  minWidth: 48,
                  flexDirection: 'column',
                  padding: '8px 6px',
                  background: isSelected ? 'var(--gradient-primary)' : 'transparent',
                  border: dayIsToday && !isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                  color: isSelected ? 'white' : day > new Date() ? 'var(--text-muted)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: day > new Date() ? 'not-allowed' : 'pointer',
                  opacity: day > new Date() ? 0.4 : 1,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' }}>
                  {format(day, 'EEE', { locale: uk })}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>

        <button className="btn-icon" onClick={nextDay}><ChevronRight size={18} /></button>
        {!isToday && (
          <button className="btn btn-secondary btn-sm" onClick={goToday}>Сьогодні</button>
        )}
      </div>

      {/* Daily Tasks */}
      {dailyTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <span className="card-title">🔁 Щоденні задачі</span>
            <span className="card-subtitle">{dailyTasks.length} задач</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dailyTasks.map(task => (
              <TaskItem key={task.id} task={task} dateStr={dateStr} onLog={logCompletion} />
            ))}
          </div>
        </div>
      )}

      {/* Weekly Tasks */}
      {weeklyTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <span className="card-title">📅 Тижневі задачі</span>
            <span className="card-subtitle">
              {format(weekStart, 'dd.MM')} — {format(weekEnd, 'dd.MM')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weeklyTasks.map(task => {
              const weeklyCompletions = getCompletionsInRange(task, weekStart, weekEnd);
              const todayCompletions = task.completions?.[dateStr] || 0;
              return (
                <div key={task.id} className="task-item">
                  <div className={`task-item-icon weekly`}>
                    <DynamicIcon name={task.icon} size={20} />
                  </div>
                  <div className="task-item-info">
                    <div className="task-item-name">{task.name}</div>
                    <div className="task-item-meta">
                      <span className="badge badge-weekly">Тижнева</span>
                      <span>За тиждень: {task.targetType === 'time' ? formatTime(weeklyCompletions) : weeklyCompletions} / {formatTarget(task.target, task.targetType)}</span>
                      {task.rewardPoints > 0 && <span className="points-badge points-positive">+{task.rewardPoints}</span>}
                      {task.penaltyPoints < 0 && <span className="points-badge points-negative">{task.penaltyPoints}</span>}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="progress-bar-container">
                        <div
                          className={`progress-bar-fill ${weeklyCompletions >= task.target ? 'success' : weeklyCompletions > 0 ? 'warning' : ''}`}
                          style={{ width: `${Math.min(100, (weeklyCompletions / task.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {task.bonusTiers && task.bonusTiers.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {task.bonusTiers.map((tier, i) => (
                          <span key={i} className={`points-badge ${weeklyCompletions >= tier.threshold ? 'points-positive' : ''}`}
                            style={{ opacity: weeklyCompletions >= tier.threshold ? 1 : 0.5 }}>
                            {formatTarget(tier.threshold, task.targetType)}{task.targetType === 'time' ? ' →' : '× →'} +{tier.points}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="task-item-progress">
                    <div className="task-counter">
                      <button
                        className="task-counter-btn"
                        onClick={() => handleLog(task, -1)}
                        disabled={todayCompletions <= 0}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="task-counter-value">{task.targetType === 'time' ? formatTime(todayCompletions) : todayCompletions}</span>
                      <span className="task-counter-target">сьог.</span>
                      <button
                        className="task-counter-btn"
                        onClick={() => handleLog(task, 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Tasks */}
      {monthlyTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <span className="card-title">📆 Місячні задачі</span>
            <span className="card-subtitle">{format(monthStart, 'LLLL yyyy', { locale: uk })}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monthlyTasks.map(task => {
              const monthlyCompletions = getCompletionsInRange(task, monthStart, monthEnd);
              return (
                <div key={task.id} className="task-item">
                  <div className={`task-item-icon monthly`}>
                    <span style={{ fontSize: 18 }}>📊</span>
                  </div>
                  <div className="task-item-info">
                    <div className="task-item-name">{task.name}</div>
                    <div className="task-item-meta">
                      <span className="badge badge-monthly">Місячна</span>
                      <span>Виконано: {task.targetType === 'time' ? formatTime(monthlyCompletions) : monthlyCompletions} / {formatTarget(task.target, task.targetType)}</span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="progress-bar-container">
                        <div
                          className={`progress-bar-fill ${monthlyCompletions >= task.target ? 'success' : 'warning'}`}
                          style={{ width: `${Math.min(100, (monthlyCompletions / task.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="task-item-progress">
                    <div className="task-counter">
                      <button className="task-counter-btn" onClick={() => handleLog(task, -1)}
                        disabled={(task.completions?.[dateStr] || 0) <= 0}>
                        <span>−</span>
                      </button>
                      <span className="task-counter-value">{task.targetType === 'time' ? formatTime(task.completions?.[dateStr] || 0) : (task.completions?.[dateStr] || 0)}</span>
                      <button className="task-counter-btn" onClick={() => handleLog(task, 1)}>
                        <span>+</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bonus Tasks */}
      {bonusTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <span className="card-title">⭐ Бонусні задачі</span>
            <span className="card-subtitle">Тільки позитивні бонуси</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bonusTasks.map(task => (
              <TaskItem key={task.id} task={task} dateStr={dateStr} onLog={logCompletion} />
            ))}
          </div>
        </div>
      )}

      {/* Limit Tasks */}
      {limitTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <span className="card-title">🚫 Ліміти</span>
            <span className="card-subtitle">
              {format(weekStart, 'dd.MM')} — {format(weekEnd, 'dd.MM')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {limitTasks.map(task => {
              const weeklyCompletions = getCompletionsInRange(task, weekStart, weekEnd);
              const todayCompletions = task.completions?.[dateStr] || 0;
              const limit = task.target || 1;
              const exceeded = weeklyCompletions > limit;
              return (
                <div key={task.id} className="task-item" style={exceeded ? { borderColor: 'rgba(239,68,68,0.3)' } : {}}>
                  <div className={`task-item-icon limit`}>
                    <DynamicIcon name={task.icon} size={20} />
                  </div>
                  <div className="task-item-info">
                    <div className="task-item-name">{task.name}</div>
                    <div className="task-item-meta">
                      <span className="badge badge-limit">Ліміт</span>
                      <span style={{ color: exceeded ? 'var(--color-danger-light)' : 'var(--text-muted)' }}>
                        За тиждень: {task.targetType === 'time' ? formatTime(weeklyCompletions) : weeklyCompletions} / макс {formatTarget(limit, task.targetType)}
                      </span>
                      {exceeded && <span className="points-badge points-negative">{task.penaltyPoints}</span>}
                      {!exceeded && <span className="points-badge points-positive">+{task.rewardPoints}</span>}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="progress-bar-container">
                        <div
                          className={`progress-bar-fill ${exceeded ? 'danger' : weeklyCompletions === limit ? 'warning' : 'success'}`}
                          style={{ width: `${Math.min(100, (weeklyCompletions / limit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="task-item-progress">
                    <div className="task-counter">
                      <button
                        className="task-counter-btn"
                        onClick={() => handleLog(task, -1)}
                        disabled={todayCompletions <= 0}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="task-counter-value" style={exceeded ? { color: 'var(--color-danger)' } : {}}>
                        {task.targetType === 'time' ? formatTime(todayCompletions) : todayCompletions}
                      </span>
                      <span className="task-counter-target">сьог.</span>
                      <button
                        className="task-counter-btn"
                        onClick={() => handleLog(task, 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deadline Tasks */}
      {deadlineTasks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">⏰ Задачі з дедлайном</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deadlineTasks.map(task => (
              <TaskItem key={task.id} task={task} dateStr={dateStr} onLog={logCompletion} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
