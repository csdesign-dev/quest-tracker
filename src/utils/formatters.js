export function formatTime(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes)) return '0 хв';
  if (minutes < 60) {
    return `${minutes} хв`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} год`;
  }
  return `${hours} год ${mins} хв`;
}

export function formatTarget(value, targetType) {
  if (targetType === 'time') {
    return formatTime(value);
  }
  return String(value);
}
