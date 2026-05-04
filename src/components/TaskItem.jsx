import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { formatTime, formatTarget } from '../utils/formatters';

export default function TaskItem({ task, dateStr, onLog, onTaskClick }) {
  const [timeInput, setTimeInput] = useState(5);
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

  const handleContainerClick = () => {
    if (onTaskClick) onTaskClick(task);
  };

  return (
    <div 
      className="task-item" 
      style={{ ...borderStyle, cursor: onTaskClick ? 'pointer' : 'default' }}
      onClick={handleContainerClick}
    >
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
            task.type === 'draft' ? 'Вхідні' :
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

      <div className="task-item-progress" onClick={(e) => e.stopPropagation()}>
        {task.targetType === 'time' ? (
          <div className="task-counter" style={{ padding: '4px 6px', gap: 6 }}>
            <input
              type="number"
              step="5"
              min="5"
              value={timeInput}
              onChange={(e) => setTimeInput(Math.max(5, Number(e.target.value)))}
              style={{
                width: 46,
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                textAlign: 'center',
                fontSize: 13,
                padding: '4px 0',
                fontWeight: 600
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>хв</span>
            <button
              className="task-counter-btn"
              onClick={() => onLog(task.id, dateStr, -timeInput)}
              disabled={completions <= 0}
            >
              <Minus size={16} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
              <span className="task-counter-value" style={isLimit && completions > target ? { color: 'var(--color-danger)' } : { fontSize: 13 }}>
                {formatTime(completions)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ {formatTarget(target, task.targetType)}</span>
            </div>
            <button
              className="task-counter-btn"
              onClick={() => onLog(task.id, dateStr, timeInput)}
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <div className="task-counter">
            <button
              className="task-counter-btn"
              onClick={() => onLog(task.id, dateStr, -1)}
              disabled={completions <= 0}
            >
              <Minus size={16} />
            </button>
            <span className="task-counter-value" style={isLimit && completions > target ? { color: 'var(--color-danger)' } : {}}>
              {completions}
            </span>
            <span className="task-counter-target">{isLimit ? `макс ${formatTarget(target, task.targetType)}` : `/ ${formatTarget(target, task.targetType)}`}</span>
            <button
              className="task-counter-btn"
              onClick={() => onLog(task.id, dateStr, 1)}
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
