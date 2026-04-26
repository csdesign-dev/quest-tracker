import React from 'react';
import { Minus, Plus } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { formatTime, formatTarget } from '../utils/formatters';

export default function TaskItem({ task, dateStr, onLog }) {
  const completions = task.completions?.[dateStr] || 0;
  const target = task.target || 1;
  const isLimit = task.type === 'limit';
  const isCompleted = isLimit ? false : completions >= target;
  const progress = Math.min(100, (completions / target) * 100);

  let progressClass = '';
  if (isLimit) {
    // Limit: green when 0, warning approaching, danger at/over limit
    if (completions > target) progressClass = 'danger';
    else if (completions === target) progressClass = 'warning';
    else progressClass = 'success';
  } else {
    if (progress >= 100) progressClass = 'success';
    else if (progress >= 50) progressClass = 'warning';
  }

  const borderStyle = isLimit
    ? (completions > target ? { borderColor: 'rgba(239,68,68,0.3)' } : {})
    : (isCompleted ? { borderColor: 'rgba(16,185,129,0.3)' } : {});

  return (
    <div className="task-item" style={borderStyle}>
      <div className={`task-item-icon ${task.type}`}>
        <DynamicIcon name={task.icon} size={20} />
      </div>
      
      <div className="task-item-info">
        <div className="task-item-name">{task.name}</div>
        <div className="task-item-meta">
          <span className={`badge badge-${task.type}`}>{
            task.type === 'daily' ? 'Щоденна' :
            task.type === 'weekly' ? 'Тижнева' :
            task.type === 'monthly' ? 'Місячна' :
            task.type === 'challenge' ? 'Челлендж' :
            task.type === 'limit' ? 'Ліміт' : 'Бонус'
          }</span>
          <span>
            {task.rewardPoints > 0 && <span className="points-badge points-positive">+{task.rewardPoints}</span>}
            {task.penaltyPoints < 0 && <span className="points-badge points-negative" style={{ marginLeft: 4 }}>{task.penaltyPoints}</span>}
          </span>
        </div>
        <div style={{ marginTop: 6 }}>
          <div className="progress-bar-container">
            <div className={`progress-bar-fill ${progressClass}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="task-item-progress">
        <div className="task-counter">
          <button
            className="task-counter-btn"
            onClick={() => {
              if (task.targetType === 'time') {
                const val = window.prompt('Скільки хвилин відняти?', '15');
                if (val && !isNaN(val)) {
                  onLog(task.id, dateStr, -Math.abs(Number(val)));
                }
              } else {
                onLog(task.id, dateStr, -1);
              }
            }}
            disabled={completions <= 0}
          >
            <Minus size={16} />
          </button>
          <span className="task-counter-value" style={isLimit && completions > target ? { color: 'var(--color-danger)' } : {}}>
            {task.targetType === 'time' ? formatTime(completions) : completions}
          </span>
          <span className="task-counter-target">{isLimit ? `макс ${formatTarget(target, task.targetType)}` : `/ ${formatTarget(target, task.targetType)}`}</span>
          <button
            className="task-counter-btn"
            onClick={() => {
              if (task.targetType === 'time') {
                const val = window.prompt('Скільки хвилин додати?', '15');
                if (val && !isNaN(val)) {
                  onLog(task.id, dateStr, Math.abs(Number(val)));
                }
              } else {
                onLog(task.id, dateStr, 1);
              }
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
