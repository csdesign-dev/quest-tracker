import React, { useState } from 'react';
import { 
  format, addMonths, subMonths, addWeeks, subWeeks,
  startOfMonth, endOfMonth, 
  eachWeekOfInterval, eachDayOfInterval, startOfWeek, endOfWeek, 
  isSameMonth, isToday, getDay
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { formatTime } from '../utils/formatters';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export default function StatsCalendar({ tasks }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

  const activeTasks = tasks.filter(t => t.enabled && t.status !== 'paused' && t.status !== 'archived');
  const dailyTasks = activeTasks.filter(t => t.type === 'daily');
  const weeklyTasks = activeTasks.filter(t => t.type === 'weekly');
  const bonusTasks = activeTasks.filter(t => t.type === 'bonus');

  const isTaskValidOnDate = (task, dateStr) => {
    if (!task.createdAt) return true;
    return dateStr >= task.createdAt;
  };

  // Render a single day cell
  const renderDayCell = (day, isCurrentMonth = true) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day); // 0=Sun, 1=Mon...

    // Daily tasks for this day
    const dayDailyTasks = dailyTasks.filter(t => isTaskValidOnDate(t, dateStr));

    // Bonus tasks for this day
    const dayBonusTasks = bonusTasks.filter(t => {
      if (!isTaskValidOnDate(t, dateStr)) return false;
      const dates = t.bonusDates || (t.bonusDate ? [t.bonusDate] : []);
      if (dates.length > 0) return dates.includes(dateStr);
      return true;
    });

    // Weekly tasks assigned to this specific day
    const dayWeeklyTasks = weeklyTasks.filter(t => {
      if (!isTaskValidOnDate(t, dateStr)) return false;
      return t.daysOfWeek && t.daysOfWeek.length > 0 && t.daysOfWeek.includes(dayOfWeek);
    });

    // Other tasks (monthly, challenge, limit) with completions on this day
    const otherCompleted = tasks.filter(t => 
      !['daily', 'weekly', 'bonus', 'draft'].includes(t.type) && 
      (t.completions?.[dateStr] || 0) > 0
    );

    const allItems = [
      ...dayDailyTasks.map(t => ({ ...t, _kind: 'daily' })),
      ...dayWeeklyTasks.map(t => ({ ...t, _kind: 'weekly-day' })),
      ...dayBonusTasks.map(t => ({ ...t, _kind: 'bonus' })),
      ...otherCompleted.map(t => ({ ...t, _kind: 'other' })),
    ];

    return (
      <div 
        key={dateStr} 
        style={{ 
          background: 'var(--bg-secondary)', 
          borderRadius: 8, 
          padding: viewMode === 'week' ? 10 : 6,
          minHeight: viewMode === 'week' ? 160 : 100,
          opacity: isCurrentMonth ? 1 : 0.35,
          border: isToday(day) ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ 
          textAlign: 'right', 
          fontSize: viewMode === 'week' ? 13 : 11, 
          fontWeight: 600, 
          color: isToday(day) ? 'var(--color-primary)' : 'var(--text-secondary)', 
          marginBottom: viewMode === 'week' ? 8 : 4 
        }}>
          {format(day, 'd')}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: viewMode === 'week' ? 4 : 2 }}>
          {allItems.map(task => {
            const completed = task.completions?.[dateStr] || 0;
            const target = task.target || 1;
            const isDone = completed >= target;
            
            let bgColor, textColor;
            if (task._kind === 'daily') {
              bgColor = isDone ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.2)';
              textColor = isDone ? 'var(--color-success-light)' : 'var(--text-primary)';
            } else if (task._kind === 'weekly-day') {
              bgColor = isDone ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.05)';
              textColor = isDone ? '#60a5fa' : 'var(--color-primary-light)';
            } else if (task._kind === 'bonus') {
              bgColor = completed > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.05)';
              textColor = completed > 0 ? '#fbbf24' : 'var(--text-muted)';
            } else {
              bgColor = 'rgba(139,92,246,0.1)';
              textColor = '#a78bfa';
            }

            return (
              <div key={`${task._kind}-${task.id}`} style={{ 
                display: 'flex', alignItems: 'center', gap: 4, 
                fontSize: viewMode === 'week' ? 11 : 9, 
                padding: viewMode === 'week' ? '3px 5px' : '2px 3px', 
                borderRadius: 4, background: bgColor, color: textColor 
              }}>
                <DynamicIcon name={task.icon} size={viewMode === 'week' ? 10 : 8} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {task.name}
                </span>
                <span style={{ fontSize: viewMode === 'week' ? 9 : 7, opacity: 0.8, flexShrink: 0 }}>
                  {task.targetType === 'time' ? formatTime(completed) : `${completed}/${target}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render weekly tasks bar for a given week
  const renderWeeklyBar = (days) => {
    // Weekly tasks without specific days (available all week) OR all weekly tasks summary
    const weekEnd = days[6];
    const generalWeeklyTasks = weeklyTasks.filter(t => {
      if (!isTaskValidOnDate(t, format(weekEnd, 'yyyy-MM-dd'))) return false;
      return !t.daysOfWeek || t.daysOfWeek.length === 0;
    });

    if (generalWeeklyTasks.length === 0) return null;

    return (
      <div style={{ 
        background: 'rgba(59,130,246,0.05)', 
        border: '1px solid rgba(59,130,246,0.1)',
        borderRadius: 8, padding: '6px 12px', marginTop: 4 
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {generalWeeklyTasks.map(task => {
            const weeklyCompletions = days.reduce((sum, day) => sum + (task.completions?.[format(day, 'yyyy-MM-dd')] || 0), 0);
            const target = task.target || 1;
            const isDone = weeklyCompletions >= target;

            return (
              <div key={task.id} style={{ 
                display: 'flex', alignItems: 'center', gap: 6, 
                fontSize: 12, padding: '4px 8px', borderRadius: 4, 
                background: isDone ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', 
                color: isDone ? 'var(--color-success-light)' : 'var(--text-primary)', 
                border: isDone ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent' 
              }}>
                <DynamicIcon name={task.icon} size={12} />
                <span>{task.name}</span>
                <span style={{ fontWeight: 600, marginLeft: 4 }}>
                  {task.targetType === 'time' ? `${formatTime(weeklyCompletions)} / ${formatTime(target)}` : `${weeklyCompletions}/${target}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ----- WEEKLY VIEW -----
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <>
        <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <button className="btn-icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}><ChevronLeft /></button>
          <h3 style={{ margin: 0 }}>
            {format(weekStart, 'd MMM', { locale: uk })} — {format(weekEnd, 'd MMM yyyy', { locale: uk })}
          </h3>
          <button className="btn-icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}><ChevronRight /></button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
          {DAY_NAMES.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {days.map(day => renderDayCell(day))}
        </div>

        {/* Weekly tasks bar */}
        {renderWeeklyBar(days)}
      </>
    );
  };

  // ----- MONTHLY VIEW -----
  const renderMonthView = () => {
    const startMonth = startOfMonth(currentDate);
    const endMonth = endOfMonth(currentDate);
    const weeks = eachWeekOfInterval({ start: startMonth, end: endMonth }, { weekStartsOn: 1 });

    return (
      <>
        <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <button className="btn-icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft /></button>
          <h3 style={{ textTransform: 'capitalize', margin: 0 }}>
            {format(currentDate, 'LLLL yyyy', { locale: uk })}
          </h3>
          <button className="btn-icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight /></button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
          {DAY_NAMES.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Weeks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weeks.map(weekStartDate => {
            const days = eachDayOfInterval({
              start: startOfWeek(weekStartDate, { weekStartsOn: 1 }),
              end: endOfWeek(weekStartDate, { weekStartsOn: 1 })
            });

            return (
              <div key={weekStartDate.toISOString()}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {days.map(day => renderDayCell(day, isSameMonth(day, currentDate)))}
                </div>
                {renderWeeklyBar(days)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="stats-calendar">
      {/* View mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Тиждень</button>
          <button className={`tab ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Місяць</button>
        </div>
      </div>

      {viewMode === 'week' ? renderWeekView() : renderMonthView()}
    </div>
  );
}
