import React, { useState } from 'react';
import { format } from 'date-fns';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import { PERIOD_LABELS, getDailyScoresForChart, getWeeklyScoresForChart, calculateTaskScore, calculateMaxScore, getPeriodRange, getCustomRangeScores } from '../utils/scoring';
import ProgressRing from './ProgressRing';

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const CHART_TOOLTIP = {
  contentStyle: {
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 13,
    color: '#f0f0f5'
  }
};

export default function StatsView({ tasks, scores }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [chartType, setChartType] = useState('daily');
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCustom, setShowCustom] = useState(false);

  const dailyChartData = getDailyScoresForChart(tasks, chartType === 'daily' ? 30 : 14);
  const weeklyChartData = getWeeklyScoresForChart(tasks, 12);
  const chartData = chartType === 'daily' ? dailyChartData : weeklyChartData;

  // Get scores for selected period
  let currentScores;
  let range;
  if (selectedPeriod === 'custom') {
    currentScores = getCustomRangeScores(tasks, new Date(customStart), new Date(customEnd));
    range = { start: new Date(customStart), end: new Date(customEnd) };
  } else {
    currentScores = scores[selectedPeriod] || { score: 0, projected: 0, max: 0, percentage: 0 };
    range = getPeriodRange(selectedPeriod);
  }

  // Task breakdown for selected period
  const taskBreakdown = tasks
    .filter(t => t.enabled)
    .map(t => ({
      name: t.name,
      type: t.type,
      score: calculateTaskScore(t, range.start, range.end),
      max: calculateMaxScore(t, range.start, range.end),
    }))
    .sort((a, b) => b.score - a.score);

  // Category breakdown
  const categoryMap = {};
  for (const t of tasks.filter(t => t.enabled)) {
    const cat = t.category || 'Інше';
    if (!categoryMap[cat]) categoryMap[cat] = { name: cat, score: 0, max: 0 };
    categoryMap[cat].score += calculateTaskScore(t, range.start, range.end);
    const m = calculateMaxScore(t, range.start, range.end);
    if (m !== Infinity) categoryMap[cat].max += m;
  }
  const categoryData = Object.values(categoryMap).filter(c => c.max > 0 || c.score !== 0);

  const pieData = categoryData
    .filter(c => c.score > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.score,
      fill: COLORS[i % COLORS.length],
    }));

  const periodLabel = selectedPeriod === 'custom'
    ? `${format(new Date(customStart), 'dd.MM.yyyy')} — ${format(new Date(customEnd), 'dd.MM.yyyy')}`
    : PERIOD_LABELS[selectedPeriod] || '';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>
          <BarChart3 size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Статистика
        </h2>
        <p>Детальний аналіз вашого прогресу</p>
      </div>

      {/* Period Selector */}
      <div className="tabs">
        {Object.entries(PERIOD_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`tab ${selectedPeriod === key ? 'active' : ''}`}
            onClick={() => { setSelectedPeriod(key); setShowCustom(false); }}
          >
            {label}
          </button>
        ))}
        <button
          className={`tab ${selectedPeriod === 'custom' ? 'active' : ''}`}
          onClick={() => { setSelectedPeriod('custom'); setShowCustom(true); }}
        >
          <Calendar size={14} style={{ marginRight: 4 }} />
          Діапазон
        </button>
      </div>

      {/* Custom date range picker */}
      {showCustom && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label className="form-label">Від</label>
              <input
                className="form-input"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ width: 180 }}
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label className="form-label">До</label>
              <input
                className="form-input"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                style={{ width: 180 }}
              />
            </div>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: 10 }}>
              {periodLabel}
            </div>
          </div>
        </div>
      )}

      {/* Overview rings */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-subtitle" style={{ marginBottom: 8 }}>Набрано балів</div>
          <ProgressRing
            value={currentScores.max > 0 ? Math.max(0, (currentScores.score / currentScores.max) * 100) : 0}
            size={140}
            strokeWidth={12}
            label={`${currentScores.score >= 0 ? '+' : ''}${currentScores.score}`}
            sublabel={`з ${currentScores.max} можливих`}
          />
          {currentScores.projected !== undefined && currentScores.projected !== currentScores.score && (
            <div style={{ marginTop: 8, fontSize: 'var(--font-xs)', color: currentScores.projected < 0 ? 'var(--color-danger-light)' : 'var(--text-muted)' }}>
              ⚠ прогноз: {currentScores.projected >= 0 ? '+' : ''}{currentScores.projected}
            </div>
          )}
          <div style={{ marginTop: 4, fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
            {currentScores.percentage}% ефективність
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-subtitle" style={{ marginBottom: 8 }}>Активних задач</div>
          <div style={{ fontSize: 'var(--font-4xl)', fontWeight: 900, marginTop: 24 }}>
            {tasks.filter(t => t.enabled).length}
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['daily', 'weekly', 'monthly', 'limit', 'bonus', 'deadline'].map(type => {
              const count = tasks.filter(t => t.enabled && t.type === type).length;
              if (count === 0) return null;
              const labels = { daily: 'Щод.', weekly: 'Тижн.', monthly: 'Міс.', limit: 'Лім.', bonus: 'Бонус', deadline: 'Дедл.' };
              return (
                <span key={type} className={`badge badge-${type}`}>
                  {labels[type]}: {count}
                </span>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-subtitle" style={{ marginBottom: 8 }}>Макс. можливий</div>
          <div style={{ fontSize: 'var(--font-4xl)', fontWeight: 900, marginTop: 24, color: 'var(--color-primary-light)' }}>
            {currentScores.max}
          </div>
          <div style={{ marginTop: 16, fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
            за {periodLabel.toLowerCase()}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <span className="card-title">
            <TrendingUp size={18} style={{ marginRight: 6 }} />
            Динаміка балів
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${chartType === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartType('daily')}
            >
              По днях
            </button>
            <button
              className={`btn btn-sm ${chartType === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartType('weekly')}
            >
              По тижнях
            </button>
          </div>
        </div>
        <div className="chart-container-lg">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="statScoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="statMaxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#5a5a70', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#5a5a70', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...CHART_TOOLTIP}
                formatter={(value, name) => [value, name === 'score' ? 'Бали' : 'Максимум']}
              />
              <Area type="monotone" dataKey="max" stroke="#3b82f6" fill="url(#statMaxGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="score" stroke="#7c3aed" fill="url(#statScoreGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-lg)' }}>
        {/* Category Pie */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Бали по категоріях</span>
          </div>
          {pieData.length > 0 ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state"><p>Ще немає даних</p></div>
          )}
        </div>

        {/* Task Bar Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Бали по задачах</span>
          </div>
          {taskBreakdown.filter(t => t.score !== 0).length > 0 ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskBreakdown.filter(t => t.score !== 0).slice(0, 8)} layout="vertical" margin={{ left: 80, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: '#5a5a70', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9a9ab0', fontSize: 11 }} tickLine={false} axisLine={false} width={75} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(value) => [value, 'Бали']} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {taskBreakdown.filter(t => t.score !== 0).slice(0, 8).map((entry, i) => (
                      <Cell key={i} fill={entry.score >= 0 ? COLORS[i % COLORS.length] : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state"><p>Ще немає даних</p></div>
          )}
        </div>
      </div>

      {/* Task breakdown table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Детальна розбивка ({periodLabel})</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Задача</th>
                <th>Тип</th>
                <th>Категорія</th>
                <th>Бали</th>
                <th>Макс.</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {taskBreakdown.map((t, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{tasks.find(tt => tt.name === t.name)?.category || '—'}</td>
                  <td>
                    <span className={`points-badge ${t.score >= 0 ? 'points-positive' : 'points-negative'}`}>
                      {t.score >= 0 ? '+' : ''}{t.score}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.max === Infinity ? '∞' : t.max}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {t.max > 0 && t.max !== Infinity ? `${Math.round((t.score / t.max) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
