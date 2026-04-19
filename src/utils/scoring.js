import { startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, isBefore, format, subDays, subMonths, subYears } from 'date-fns';

/**
 * Get date range for a period
 */
export function getPeriodRange(period, referenceDate = new Date(), customRange = null) {
  const today = startOfDay(referenceDate);
  
  switch (period) {
    case 'day':
      return { start: today, end: today };
    case 'week':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case '3months':
      return { start: subMonths(today, 3), end: today };
    case '6months':
      return { start: subMonths(today, 6), end: today };
    case '9months':
      return { start: subMonths(today, 9), end: today };
    case 'year':
      return { start: subYears(today, 1), end: today };
    case 'all':
      return { start: new Date(2020, 0, 1), end: today };
    case 'custom':
      if (customRange) {
        return { start: startOfDay(new Date(customRange.start)), end: startOfDay(new Date(customRange.end)) };
      }
      return { start: today, end: today };
    default:
      return { start: today, end: today };
  }
}

/**
 * Get completions count for a task on a specific date
 */
export function getCompletionsForDate(task, dateStr) {
  return task.completions?.[dateStr] || 0;
}

/**
 * Get total completions for a task within a date range
 */
export function getCompletionsInRange(task, startDate, endDate) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  let total = 0;
  for (const day of days) {
    const key = format(day, 'yyyy-MM-dd');
    total += (task.completions?.[key] || 0);
  }
  return total;
}

/**
 * Calculate score for a DAILY task for a single day
 * @param {boolean} isCurrentDay - if true, don't apply penalty (day not over yet)
 */
function scoreDailyForDay(task, dateStr, isCurrentDay = false) {
  const completions = getCompletionsForDate(task, dateStr);
  const target = task.target || 1;
  
  if (completions >= target) {
    let points = task.rewardPoints || 0;
    // Check bonus tiers
    if (task.bonusTiers) {
      for (const tier of task.bonusTiers) {
        if (completions >= tier.threshold) {
          points += tier.points;
        }
      }
    }
    return points;
  }
  
  // Don't penalize for today — day is not over yet
  if (isCurrentDay) return 0;
  
  // Target not met = FULL PENALTY (partial = penalty too)
  return task.penaltyPoints || 0;
}

/**
 * Calculate score for a WEEKLY task for a given week
 */
function scoreWeeklyForWeek(task, weekStart, weekEnd) {
  const totalCompletions = getCompletionsInRange(task, weekStart, weekEnd);
  const target = task.target || 1;
  
  if (totalCompletions >= target) {
    let points = task.rewardPoints || 0;
    // Check bonus tiers
    if (task.bonusTiers) {
      for (const tier of task.bonusTiers) {
        if (totalCompletions >= tier.threshold) {
          points += tier.points;
        }
      }
    }
    return points;
  }
  
  return task.penaltyPoints || 0; // penalty
}

/**
 * Calculate score for a MONTHLY task for a given month
 */
function scoreMonthlyForMonth(task, monthStart, monthEnd) {
  const totalCompletions = getCompletionsInRange(task, monthStart, monthEnd);
  const target = task.target || 1;
  
  if (totalCompletions >= target) {
    let points = task.rewardPoints || 0;
    if (task.bonusTiers) {
      for (const tier of task.bonusTiers) {
        if (totalCompletions >= tier.threshold) {
          points += tier.points;
        }
      }
    }
    return points;
  }
  
  return task.penaltyPoints || 0;
}

/**
 * Calculate score for a DEADLINE task
 */
function scoreDeadline(task) {
  if (!task.deadline) return 0;
  const deadlineDate = new Date(task.deadline);
  const totalCompletions = Object.values(task.completions || {}).reduce((a, b) => a + b, 0);
  
  if (totalCompletions >= (task.target || 1)) {
    return task.rewardPoints || 0;
  }
  
  if (isBefore(deadlineDate, startOfDay(new Date()))) {
    return task.penaltyPoints || 0; // missed deadline
  }
  
  return 0; // still in progress
}

/**
 * Calculate score for a BONUS task (only positive, count completions)
 */
function scoreBonusForRange(task, startDate, endDate) {
  const totalCompletions = getCompletionsInRange(task, startDate, endDate);
  return totalCompletions * (task.rewardPoints || 0);
}

/**
 * Calculate score for a LIMIT task for a given period (weekly or monthly)
 * User must NOT exceed the limit. If exceeded = penalty.
 * If within limit = reward.
 */
function scoreLimitForWeek(task, weekStart, weekEnd) {
  const totalCompletions = getCompletionsInRange(task, weekStart, weekEnd);
  const limit = task.target || 1;
  
  if (totalCompletions > limit) {
    return task.penaltyPoints || 0; // exceeded limit = penalty
  }
  
  return task.rewardPoints || 0; // stayed within limit = reward
}

/**
 * Calculate max possible points for a daily task in a range
 */
function maxDailyInRange(task, startDate, endDate) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const today = startOfDay(new Date());
  let maxPerDay = task.rewardPoints || 0;
  
  // Add max bonus tier
  if (task.bonusTiers && task.bonusTiers.length > 0) {
    for (const tier of task.bonusTiers) {
      maxPerDay += tier.points;
    }
  }
  
  // Only count days up to today
  const applicableDays = days.filter(d => !isBefore(today, startOfDay(d)) || format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
  // Also only count days after task creation
  const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
  const validDays = applicableDays.filter(d => !isBefore(startOfDay(d), createdAt));
  
  return validDays.length * maxPerDay;
}

/**
 * Get all complete weeks within a range
 */
function getWeeksInRange(startDate, endDate) {
  const weeks = [];
  let current = startOfWeek(startDate, { weekStartsOn: 1 });
  const today = startOfDay(new Date());
  
  while (isBefore(current, endDate) || format(current, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')) {
    const wEnd = endOfWeek(current, { weekStartsOn: 1 });
    // Only count weeks that have ended or include today
    if (isBefore(wEnd, today) || isWithinInterval(today, { start: current, end: wEnd })) {
      weeks.push({ start: current, end: wEnd });
    }
    current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return weeks;
}

/**
 * Get all complete months within a range
 */
function getMonthsInRange(startDate, endDate) {
  const months = [];
  let current = startOfMonth(startDate);
  const today = startOfDay(new Date());
  
  while (isBefore(current, endDate) || format(current, 'yyyy-MM') === format(endDate, 'yyyy-MM')) {
    const mEnd = endOfMonth(current);
    if (isBefore(mEnd, today) || isWithinInterval(today, { start: current, end: mEnd })) {
      months.push({ start: current, end: mEnd });
    }
    current = startOfMonth(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }
  return months;
}

/**
 * Calculate total score for a task within a period range
 */
export function calculateTaskScore(task, startDate, endDate) {
  if (!task.enabled) return 0;
  
  switch (task.type) {
    case 'daily': {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const today = startOfDay(new Date());
      const todayStr = format(today, 'yyyy-MM-dd');
      let total = 0;
      for (const day of days) {
        if (isBefore(today, startOfDay(day))) continue; // future
        const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
        if (isBefore(startOfDay(day), createdAt)) continue;
        const dayStr = format(day, 'yyyy-MM-dd');
        const isCurrentDay = dayStr === todayStr;
        total += scoreDailyForDay(task, dayStr, isCurrentDay);
      }
      return total;
    }
    
    case 'weekly': {
      const weeks = getWeeksInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let total = 0;
      for (const week of weeks) {
        if (isBefore(week.end, createdAt)) continue;
        // Only score completed weeks or current week at end of week
        const today = startOfDay(new Date());
        if (format(week.start, 'yyyy-MM-dd') === format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')) {
          // Current week — only count positive score, no penalty yet
          const currentScore = scoreWeeklyForWeek(task, week.start, today);
          total += Math.max(0, currentScore);
        } else if (isBefore(week.end, today)) {
          total += scoreWeeklyForWeek(task, week.start, week.end);
        }
      }
      return total;
    }
    
    case 'monthly': {
      const months = getMonthsInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let total = 0;
      for (const month of months) {
        if (isBefore(month.end, createdAt)) continue;
        const today = startOfDay(new Date());
        if (format(month.start, 'yyyy-MM') === format(today, 'yyyy-MM')) {
          // Current month — only count positive score, no penalty yet
          const currentScore = scoreMonthlyForMonth(task, month.start, today);
          total += Math.max(0, currentScore);
        } else if (isBefore(month.end, today)) {
          total += scoreMonthlyForMonth(task, month.start, month.end);
        }
      }
      return total;
    }
    
    case 'deadline':
      return scoreDeadline(task);
    
    case 'bonus':
      return scoreBonusForRange(task, startDate, endDate);
    
    case 'limit': {
      const weeks = getWeeksInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let total = 0;
      for (const week of weeks) {
        if (isBefore(week.end, createdAt)) continue;
        const today = startOfDay(new Date());
        if (format(week.start, 'yyyy-MM-dd') === format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')) {
          const currentScore = scoreLimitForWeek(task, week.start, today);
          total += Math.max(0, currentScore);
        } else if (isBefore(week.end, today)) {
          total += scoreLimitForWeek(task, week.start, week.end);
        }
      }
      return total;
    }
    
    default:
      return 0;
  }
}

/**
 * Calculate max possible score for a task within a period range
 */
export function calculateMaxScore(task, startDate, endDate) {
  if (!task.enabled) return 0;
  
  switch (task.type) {
    case 'daily':
      return maxDailyInRange(task, startDate, endDate);
    
    case 'weekly': {
      const weeks = getWeeksInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let maxPerWeek = task.rewardPoints || 0;
      if (task.bonusTiers) {
        for (const tier of task.bonusTiers) {
          maxPerWeek += tier.points;
        }
      }
      return weeks.filter(w => !isBefore(w.end, createdAt)).length * maxPerWeek;
    }
    
    case 'monthly': {
      const months = getMonthsInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let maxPerMonth = task.rewardPoints || 0;
      if (task.bonusTiers) {
        for (const tier of task.bonusTiers) {
          maxPerMonth += tier.points;
        }
      }
      return months.filter(m => !isBefore(m.end, createdAt)).length * maxPerMonth;
    }
    
    case 'deadline':
      return task.rewardPoints || 0;
    
    case 'bonus':
      return Infinity; // no max for bonus tasks
    
    case 'limit': {
      const weeks = getWeeksInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      return weeks.filter(w => !isBefore(w.end, createdAt)).length * (task.rewardPoints || 0);
    }
    
    default:
      return 0;
  }
}

/**
 * Calculate PROJECTED score — what happens if user does NOTHING more today/this week/month
 * This includes penalties for current periods.
 */
export function calculateProjectedScore(task, startDate, endDate) {
  if (!task.enabled) return 0;
  
  switch (task.type) {
    case 'daily': {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const today = startOfDay(new Date());
      let total = 0;
      for (const day of days) {
        if (isBefore(today, startOfDay(day))) continue;
        const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
        if (isBefore(startOfDay(day), createdAt)) continue;
        const dayStr = format(day, 'yyyy-MM-dd');
        // For projected: always apply penalty (isCurrentDay = false)
        total += scoreDailyForDay(task, dayStr, false);
      }
      return total;
    }
    
    case 'weekly': {
      const weeks = getWeeksInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let total = 0;
      for (const week of weeks) {
        if (isBefore(week.end, createdAt)) continue;
        const today = startOfDay(new Date());
        if (format(week.start, 'yyyy-MM-dd') === format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')) {
          // Current week — include penalty in projection
          total += scoreWeeklyForWeek(task, week.start, today);
        } else if (isBefore(week.end, today)) {
          total += scoreWeeklyForWeek(task, week.start, week.end);
        }
      }
      return total;
    }
    
    case 'monthly': {
      const months = getMonthsInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let total = 0;
      for (const month of months) {
        if (isBefore(month.end, createdAt)) continue;
        const today = startOfDay(new Date());
        if (format(month.start, 'yyyy-MM') === format(today, 'yyyy-MM')) {
          // Current month — include penalty in projection
          total += scoreMonthlyForMonth(task, month.start, today);
        } else if (isBefore(month.end, today)) {
          total += scoreMonthlyForMonth(task, month.start, month.end);
        }
      }
      return total;
    }
    
    case 'deadline':
      return scoreDeadline(task);
    
    case 'bonus':
      return scoreBonusForRange(task, startDate, endDate);
    
    case 'limit': {
      const weeks = getWeeksInRange(startDate, endDate);
      const createdAt = task.createdAt ? startOfDay(new Date(task.createdAt)) : new Date(2020, 0, 1);
      let total = 0;
      for (const week of weeks) {
        if (isBefore(week.end, createdAt)) continue;
        const today = startOfDay(new Date());
        if (format(week.start, 'yyyy-MM-dd') === format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')) {
          total += scoreLimitForWeek(task, week.start, today);
        } else if (isBefore(week.end, today)) {
          total += scoreLimitForWeek(task, week.start, week.end);
        }
      }
      return total;
    }
    
    default:
      return 0;
  }
}

/**
 * Get all scores for all periods
 * Returns both confirmed (score) and projected scores
 */
export function getAllPeriodScores(tasks) {
  const periods = ['day', 'week', 'month', '3months', '6months', '9months', 'year', 'all'];
  const results = {};
  
  for (const period of periods) {
    const range = getPeriodRange(period);
    let totalScore = 0;
    let totalProjected = 0;
    let totalMax = 0;
    
    for (const task of tasks) {
      totalScore += calculateTaskScore(task, range.start, range.end);
      totalProjected += calculateProjectedScore(task, range.start, range.end);
      const max = calculateMaxScore(task, range.start, range.end);
      if (max !== Infinity) {
        totalMax += max;
      }
    }
    
    results[period] = {
      score: totalScore,
      projected: totalProjected,
      max: totalMax,
      percentage: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    };
  }
  
  return results;
}

/**
 * Get daily scores for chart data
 */
export function getDailyScoresForChart(tasks, numDays = 30) {
  const today = startOfDay(new Date());
  const data = [];
  
  for (let i = numDays - 1; i >= 0; i--) {
    const day = subDays(today, i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const range = { start: day, end: day };
    
    let dayScore = 0;
    let dayMax = 0;
    
    for (const task of tasks) {
      if (task.type === 'daily') {
        dayScore += calculateTaskScore(task, range.start, range.end);
        dayMax += calculateMaxScore(task, range.start, range.end);
      }
    }
    
    data.push({
      date: format(day, 'dd.MM'),
      fullDate: dayStr,
      score: dayScore,
      max: dayMax,
    });
  }
  
  return data;
}

/**
 * Get weekly scores for chart 
 */
export function getWeeklyScoresForChart(tasks, numWeeks = 12) {
  const today = startOfDay(new Date());
  const data = [];
  
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekEnd = subDays(today, i * 7);
    const weekStart = subDays(weekEnd, 6);
    
    let weekScore = 0;
    let weekMax = 0;
    
    for (const task of tasks) {
      weekScore += calculateTaskScore(task, weekStart, weekEnd);
      const max = calculateMaxScore(task, weekStart, weekEnd);
      if (max !== Infinity) weekMax += max;
    }
    
    data.push({
      date: `${format(weekStart, 'dd.MM')}-${format(weekEnd, 'dd.MM')}`,
      score: weekScore,
      max: weekMax,
    });
  }
  
  return data;
}

export const PERIOD_LABELS = {
  day: 'Сьогодні',
  week: 'Тиждень',
  month: 'Місяць',
  '3months': '3 місяці',
  '6months': '6 місяців',
  '9months': '9 місяців',
  year: 'Рік',
  all: 'Весь час',
};

/**
 * Calculate scores for a custom date range
 */
export function getCustomRangeScores(tasks, startDate, endDate) {
  let totalScore = 0;
  let totalProjected = 0;
  let totalMax = 0;
  
  for (const task of tasks) {
    totalScore += calculateTaskScore(task, startDate, endDate);
    totalProjected += calculateProjectedScore(task, startDate, endDate);
    const max = calculateMaxScore(task, startDate, endDate);
    if (max !== Infinity) {
      totalMax += max;
    }
  }
  
  return {
    score: totalScore,
    projected: totalProjected,
    max: totalMax,
    percentage: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
  };
}
