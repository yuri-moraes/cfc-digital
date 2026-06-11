export function toDateStr(date) {
  return date.toISOString().split('T')[0];
}
