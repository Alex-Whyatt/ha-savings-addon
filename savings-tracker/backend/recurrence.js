/**
 * Helpers for recurring transactions.
 *
 * A recurring transaction row is its own first occurrence (its amount is
 * counted when it is created). Later occurrences repeat weekly or monthly
 * from that date, and stop before `repeat_until` when it is set.
 */

/**
 * Local calendar day as YYYY-MM-DD, so dates stored at different times of
 * day compare by the day they fall on.
 */
function toDayKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Whether a recurring transaction has a repeat (not its first occurrence)
 * that may fall on `date`: after the start day and before repeat_until.
 */
function isRepeatActiveOn(recurring, date) {
  const dayKey = toDayKey(date);
  if (dayKey <= toDayKey(recurring.date)) return false;
  if (recurring.repeat_until && dayKey >= toDayKey(recurring.repeat_until)) return false;
  return true;
}

module.exports = {
  toDayKey,
  isRepeatActiveOn
};
