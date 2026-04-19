import React from 'react';

export default function ProgressRing({
  value = 0,
  size = 120,
  strokeWidth = 10,
  label = '',
  sublabel = '',
  color,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  // Color based on percentage
  let strokeColor = color || 'var(--color-danger)';
  if (!color) {
    if (clampedValue >= 70) strokeColor = 'var(--color-success)';
    else if (clampedValue >= 40) strokeColor = 'var(--color-warning)';
  }

  return (
    <div className="stats-ring-container">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease',
            filter: `drop-shadow(0 0 6px ${strokeColor})`,
          }}
        />
      </svg>
      <div style={{
        position: 'relative',
        marginTop: -size / 2 - 20,
        height: size / 2 + 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span className="stats-ring-value" style={{ color: strokeColor }}>{label}</span>
        {sublabel && <span className="stats-ring-label" style={{ fontSize: '0.7rem' }}>{sublabel}</span>}
      </div>
    </div>
  );
}
