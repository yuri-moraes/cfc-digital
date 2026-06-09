const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function expandScheduleToDates(schedules, date) {
  const dayName = DAY_NAMES[date.getDay()];
  return schedules.filter(s => s.day_of_week === dayName);
}

export function getWeekDates(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function toDateStr(date) {
  return date.toISOString().split('T')[0];
}
