/**
 * Savings summary used for the Home Assistant sensors.
 *
 * Mirrors the figures on the app's overview: total savings, what has been
 * paid in so far this month, and the planned monthly recurring amount.
 */

const round2 = (n) => Math.round(n * 100) / 100;

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Count how many times a weekday (0 = Sunday) falls in the month of `date`
 */
function countWeekdayInMonth(weekday, date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    if (new Date(year, month, day).getDay() === weekday) count++;
  }
  return count;
}

/**
 * Monthly value of a recurring transaction template (0 if not recurring)
 */
function monthlyAmount(transaction, now) {
  if (transaction.repeat_until && new Date(transaction.repeat_until) <= now) return 0;
  if (transaction.repeat_monthly === 1) return transaction.amount;
  if (transaction.repeat_weekly === 1) {
    const weekday = new Date(transaction.date).getDay();
    return transaction.amount * countWeekdayInMonth(weekday, now);
  }
  return 0;
}

/**
 * Build the household summary from raw database rows
 * @param {Array} users - rows from the users table
 * @param {Array} pots - rows from the savings_pots table
 * @param {Array} transactions - rows from the transactions table
 * @param {Date} now - the current time
 */
function buildSavingsSummary(users, pots, transactions, now = new Date()) {
  const people = users.map(user => ({ id: user.id, name: user.name, total: 0, savedThisMonth: 0, monthlyPlan: 0 }));
  const byId = new Map(people.map(person => [person.id, person]));
  const personFor = (userId) => {
    if (!byId.has(userId)) {
      const person = { id: userId, name: userId, total: 0, savedThisMonth: 0, monthlyPlan: 0 };
      people.push(person);
      byId.set(userId, person);
    }
    return byId.get(userId);
  };

  const accounts = pots.map(pot => {
    personFor(pot.user_id).total += pot.current_total;
    return {
      name: pot.name,
      owner: personFor(pot.user_id).name,
      total: round2(pot.current_total),
      target: pot.target_amount ?? null
    };
  });

  for (const transaction of transactions) {
    const person = personFor(transaction.user_id);
    const date = new Date(transaction.date);
    if (isSameMonth(date, now) && date <= now) {
      person.savedThisMonth += transaction.amount;
    }
    person.monthlyPlan += monthlyAmount(transaction, now);
  }

  const sum = (key) => round2(people.reduce((total, person) => total + person[key], 0));

  return {
    total: sum('total'),
    savedThisMonth: sum('savedThisMonth'),
    monthlyPlan: sum('monthlyPlan'),
    people: people.map(person => ({
      ...person,
      total: round2(person.total),
      savedThisMonth: round2(person.savedThisMonth),
      monthlyPlan: round2(person.monthlyPlan)
    })),
    accounts
  };
}

module.exports = { buildSavingsSummary, countWeekdayInMonth };
