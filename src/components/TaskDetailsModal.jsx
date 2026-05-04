import React from 'react';
import { X, Calendar as CalendarIcon, Target, Award, Clock } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { formatTime, formatTarget } from '../utils/formatters';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export default function TaskDetailsModal({ task, onClose }) {
  if (!task) return null;

  const getTypeLabel = (type) => {
    switch(type) {
      case 'daily': return 'Щоденна задача';
      case 'weekly': return 'Тижнева задача';
      case 'monthly': return 'Місячна задача';
      case 'challenge': return 'Челлендж';
      case 'limit': return 'Обмеження (Ліміт)';
      case 'bonus': return 'Бонусна задача';
      case 'draft': return 'Вхідні (Draft)';
      default: return type;
    }
  };

  const renderChallengeDetails = () => {
    if (task.type !== 'challenge') return null;

    let text = '';
    if (task.challengeType === 'date') {
      text = `До конкретної дати: ${task.deadline ? format(new Date(task.deadline), 'dd.MM.yyyy') : 'Не вказано'}`;
    } else if (task.challengeType === 'daily_streak') {
      text = `Щоденне виконання протягом ${task.durationDays} днів`;
    } else if (task.challengeType === 'weekly_recurrent') {
      text = `Тижневе виконання протягом ${task.durationWeeks} тижнів`;
    }

    return (
      <div className="detail-row">
        <span className="detail-label"><Clock size={14} /> Умови челленджу</span>
        <span className="detail-value">{text}</span>
      </div>
    );
  };

  const renderDates = () => {
    if (task.type === 'challenge' && task.challengeStartDate) {
      return (
        <div className="detail-row">
          <span className="detail-label"><CalendarIcon size={14} /> Дата старту</span>
          <span className="detail-value">{format(new Date(task.challengeStartDate), 'dd MMMM yyyy', { locale: uk })}</span>
        </div>
      );
    }
    
    if (task.type === 'bonus') {
      const dates = task.bonusDates || (task.bonusDate ? [task.bonusDate] : []);
      if (dates.length > 0) {
        return (
          <div className="detail-row">
            <span className="detail-label"><CalendarIcon size={14} /> Заплановано на</span>
            <span className="detail-value">{dates.map(d => format(new Date(d), 'dd.MM.yyyy')).join(', ')}</span>
          </div>
        );
      }
    }

    if (task.type === 'weekly' && task.daysOfWeek && task.daysOfWeek.length > 0) {
      const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
      return (
        <div className="detail-row">
          <span className="detail-label"><CalendarIcon size={14} /> Заплановані дні</span>
          <span className="detail-value">{task.daysOfWeek.map(d => days[d]).join(', ')}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`task-item-icon ${task.type}`} style={{ width: 40, height: 40, borderRadius: 12 }}>
              <DynamicIcon name={task.icon} size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{task.name}</h3>
              <span className={`badge badge-${task.type}`} style={{ marginTop: 4, display: 'inline-block' }}>
                {getTypeLabel(task.type)}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body" style={{ padding: '0 20px 20px 20px' }}>
          
          {task.description && (
            <div className="task-description-box" style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 8, marginBottom: 20, whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {task.description}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="detail-row">
              <span className="detail-label"><Target size={14} /> Категорія</span>
              <span className="detail-value">{task.category || 'Без категорії'}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label"><Target size={14} /> {task.type === 'limit' ? 'Ліміт' : 'Таргет'}</span>
              <span className="detail-value">
                {task.targetType === 'time' ? formatTime(task.target) : `${task.target} раз(ів)`}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label"><Award size={14} /> Бали</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {task.rewardPoints > 0 && <span className="points-badge points-positive">+{task.rewardPoints}</span>}
                {task.penaltyPoints < 0 && <span className="points-badge points-negative">{task.penaltyPoints}</span>}
              </div>
            </div>

            {renderChallengeDetails()}
            {renderDates()}

          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .detail-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .detail-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 14px;
        }
        .detail-value {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 14px;
          text-align: right;
        }
      `}} />
    </div>
  );
}
