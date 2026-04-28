import React, { useState } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachWeekOfInterval, eachDayOfInterval, startOfWeek, endOfWeek, 
  isSameMonth, isToday 
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { formatTime } from '../utils/formatters';

export default function StatsCalendar({ tasks }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const startMonth = startOfMonth(currentDate);
  const endMonth = endOfMonth(currentDate);
  const weeks = eachWeekOfInterval({ start: startMonth, end: endMonth }, { weekStartsOn: 1 });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const isValidForDate = (task, dateToCheck) => {
    if (!task.enabled || task.status === 'paused' || task.status === 'archived') return false;
    if (!task.createdAt) return true;
    return format(dateToCheck, 'yyyy-MM-dd') >= task.createdAt;
  };

  const isValidForPeriod = (task, periodEnd) => {
    if (!task.enabled || task.status === 'paused' || task.status === 'archived') return false;
    if (!task.createdAt) return true;
    return format(periodEnd, 'yyyy-MM-dd') >= task.createdAt;
  };

  // Extract all tasks
  const dailyTasks = tasks.filter(t => t.type === 'daily');
  const weeklyTasks = tasks.filter(t => t.type === 'weekly');

  return (
    <div className="stats-calendar">
      <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <button className="btn-icon" onClick={prevMonth}><ChevronLeft /></button>
        <h3 style={{ textTransform: 'capitalize', margin: 0 }}>
          {format(currentDate, 'LLLL yyyy', { locale: uk })}
        </h3>
        <button className="btn-icon" onClick={nextMonth}><ChevronRight /></button>
      </div>

      <div className="calendar-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Weeks */}
        {weeks.map(weekStart => {
          const days = eachDayOfInterval({
            start: startOfWeek(weekStart, { weekStartsOn: 1 }),
            end: endOfWeek(weekStart, { weekStartsOn: 1 })
          });

          const activeWeeklyTasks = weeklyTasks.filter(t => isValidForPeriod(t, days[6]));

          return (
            <div key={weekStart.toISOString()} className="calendar-week-row" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  
                  // For this day, find daily tasks, plus any other task completed on this day
                  const activeDaily = dailyTasks.filter(t => isValidForDate(t, day));
                  const otherCompleted = tasks.filter(t => t.type !== 'daily' && (t.completions?.[dateStr] || 0) > 0);

                  return (
                    <div 
                      key={dateStr} 
                      style={{ 
                        background: 'var(--bg-secondary)', 
                        borderRadius: 8, 
                        padding: 8,
                        minHeight: 120,
                        opacity: isCurrentMonth ? 1 : 0.4,
                        border: isToday(day) ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: isToday(day) ? 'var(--color-primary)' : 'var(--text-secondary)', marginBottom: 8 }}>
                        {format(day, 'd')}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {activeDaily.map(task => {
                          const completed = task.completions?.[dateStr] || 0;
                          const target = task.target || 1;
                          const isDone = completed >= target;
                          
                          return (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 4px', borderRadius: 4, background: isDone ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.2)', color: isDone ? 'var(--color-success-light)' : 'var(--text-primary)' }}>
                              <DynamicIcon name={task.icon} size={10} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.name}</span>
                              <span style={{ fontSize: 9, opacity: 0.8 }}>
                                {task.targetType === 'time' ? `${formatTime(completed)}` : `${completed}/${target}`}
                              </span>
                            </div>
                          );
                        })}

                        {/* Show completions of weekly/other tasks on this specific day */}
                        {otherCompleted.map(task => {
                          const completed = task.completions[dateStr];
                          return (
                            <div key={`other-${task.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 4px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary-light)' }}>
                              <DynamicIcon name={task.icon} size={10} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.name}</span>
                              <span style={{ fontSize: 9, opacity: 0.8 }}>+{task.targetType === 'time' ? formatTime(completed) : completed}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly tasks block spanning the week */}
              {activeWeeklyTasks.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px', marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
                    Тижневі задачі на цей тиждень
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {activeWeeklyTasks.map(task => {
                      // Calculate completions for this specific week
                      const weeklyCompletions = days.reduce((sum, day) => sum + (task.completions?.[format(day, 'yyyy-MM-dd')] || 0), 0);
                      const target = task.target || 1;
                      const isDone = weeklyCompletions >= target;
                      
                      let daysText = '';
                      if (task.daysOfWeek && task.daysOfWeek.length > 0) {
                        const dayNames = {1:'Пн', 2:'Вт', 3:'Ср', 4:'Чт', 5:'Пт', 6:'Сб', 0:'Нд'};
                        daysText = ` (${task.daysOfWeek.map(d => dayNames[d]).join(', ')})`;
                      }

                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 8px', borderRadius: 4, background: isDone ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: isDone ? 'var(--color-success-light)' : 'var(--text-primary)', border: isDone ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent' }}>
                          <DynamicIcon name={task.icon} size={12} />
                          <span>{task.name}{daysText}</span>
                          <span style={{ fontWeight: 600, marginLeft: 4 }}>
                            {task.targetType === 'time' ? `${formatTime(weeklyCompletions)} / ${formatTime(target)}` : `${weeklyCompletions}/${target}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
