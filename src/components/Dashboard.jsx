import React from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { uk } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ChevronRight, Zap, Target, Award, Flame, AlertTriangle } from 'lucide-react';
import { getAllPeriodScores, PERIOD_LABELS, getDailyScoresForChart, calculateTaskScore, getPeriodRange } from '../utils/scoring';
import ProgressRing from './ProgressRing';
import TaskItem from './TaskItem';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Dashboard({ tasks, scores, logCompletion, onNavigate }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: uk });
  
  const dailyTasks = tasks.filter(t => t.enabled && t.type === 'daily');
  const weeklyTasks = tasks.filter(t => t.enabled && t.type === 'weekly');
  const chartData = getDailyScoresForChart(tasks, 14);
  
  // Today's score
  const dayScore = scores.day?.score || 0;
  const dayMax = scores.day?.max || 0;
  const dayProjected = scores.day?.projected || 0;
  const weekScore = scores.week?.score || 0;
  const weekProjected = scores.week?.projected || 0;
  const allScore = scores.all?.score || 0;
  const allProjected = scores.all?.projected || 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Дашборд</h2>
        <p style={{ textTransform: 'capitalize' }}>{todayLabel}</p>
      </div>

      {/* Score Cards — confirmed score + projected */}
      <div className="score-cards-row">
        {Object.entries(PERIOD_LABELS).map(([key, label]) => {
          const s = scores[key] || {};
          const score = s.score || 0;
          const projected = s.projected || 0;
          const showProjected = projected !== score;
          return (
            <div key={key} className="score-card" onClick={() => onNavigate('stats')}>
              <div className="score-card-period">{label}</div>
              <div className="score-card-value" style={{
                color: score >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)'
              }}>
                {score >= 0 ? '+' : ''}{score}
              </div>
              {showProjected && (
                <div style={{
                  fontSize: 'var(--font-xs)',
                  color: projected < 0 ? 'var(--color-danger-light)' : 'var(--text-muted)',
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}>
                  <AlertTriangle size={10} />
                  прогноз: {projected >= 0 ? '+' : ''}{projected}
                </div>
              )}
              <div className="score-card-max">
                з {s.max || 0} можливих
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats overview */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={18} color="var(--color-warning)" />
            <span className="card-subtitle">Сьогодні</span>
          </div>
          <ProgressRing
            value={dayMax > 0 ? Math.max(0, Math.min(100, (dayScore / dayMax) * 100)) : 0}
            size={120}
            strokeWidth={10}
            label={`${dayScore >= 0 ? '+' : ''}${dayScore}`}
            sublabel={`з ${dayMax}`}
          />
          {dayProjected !== dayScore && (
            <div style={{
              marginTop: 8,
              fontSize: 'var(--font-xs)',
              color: dayProjected < 0 ? 'var(--color-danger-light)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              <AlertTriangle size={12} />
              Якщо нічого не зробиш: {dayProjected >= 0 ? '+' : ''}{dayProjected}
            </div>
          )}
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <Target size={18} color="var(--color-info)" />
            <span className="card-subtitle">Тиждень</span>
          </div>
          <ProgressRing
            value={scores.week?.max > 0 ? Math.max(0, Math.min(100, (weekScore / scores.week.max) * 100)) : 0}
            size={120}
            strokeWidth={10}
            label={`${weekScore >= 0 ? '+' : ''}${weekScore}`}
            sublabel={`з ${scores.week?.max || 0}`}
            color="var(--color-info)"
          />
          {weekProjected !== weekScore && (
            <div style={{
              marginTop: 8,
              fontSize: 'var(--font-xs)',
              color: weekProjected < 0 ? 'var(--color-danger-light)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              <AlertTriangle size={12} />
              Прогноз: {weekProjected >= 0 ? '+' : ''}{weekProjected}
            </div>
          )}
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <Award size={18} color="var(--color-primary-light)" />
            <span className="card-subtitle">Весь час</span>
          </div>
          <ProgressRing
            value={scores.all?.max > 0 ? Math.max(0, Math.min(100, (allScore / scores.all.max) * 100)) : 0}
            size={120}
            strokeWidth={10}
            label={`${allScore >= 0 ? '+' : ''}${allScore}`}
            sublabel={`з ${scores.all?.max || 0}`}
            color="var(--color-primary-light)"
          />
          {allProjected !== allScore && (
            <div style={{
              marginTop: 8,
              fontSize: 'var(--font-xs)',
              color: allProjected < 0 ? 'var(--color-danger-light)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              <AlertTriangle size={12} />
              Прогноз: {allProjected >= 0 ? '+' : ''}{allProjected}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <span className="card-title">Динаміка балів (14 днів)</span>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('stats')}>
            Детальніше <ChevronRight size={14} />
          </button>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="maxGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#5a5a70', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#5a5a70', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  fontSize: 13,
                  color: '#f0f0f5'
                }}
                formatter={(value, name) => [value, name === 'score' ? 'Бали' : 'Максимум']}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Area type="monotone" dataKey="max" stroke="#3b82f6" fill="url(#maxGradient)" strokeWidth={1.5} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="score" stroke="#7c3aed" fill="url(#scoreGradient)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today's tasks */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Flame size={18} style={{ marginRight: 6, color: 'var(--color-warning)' }} />
            Задачі на сьогодні
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('today')}>
            Всі задачі <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dailyTasks.slice(0, 5).map(task => (
            <TaskItem key={task.id} task={task} dateStr={today} onLog={logCompletion} />
          ))}
          {dailyTasks.length === 0 && (
            <div className="empty-state">
              <p>Немає щоденних задач</p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('tasks')}>Додати задачу</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
