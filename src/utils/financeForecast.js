import { startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * Force dates to local noon to avoid timezone drift
 */
export const getStrictLocalNoon = (dateInput) => {
  let dateString = dateInput;
  if (dateInput instanceof Date) {
    dateString = format(dateInput, 'yyyy-MM-dd');
  }

  if (!dateString) return new Date();

  const [y, m, d] = dateString.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

/**
 * Normalize frequency values coming from UI / legacy data
 */
const normalizeFrequency = (freq) => {
  if (!freq) return null;
  const f = freq.toLowerCase();
  if (f === 'byweekly' || f === 'bi-weekly') return 'biweekly';
  return f;
};

/**
 * Business forecast multipliers (THIS is the key fix)
 */
const FREQUENCY_MULTIPLIER = {
  monthly: 1,
  biweekly: 2,
  weekly: 4,
  yearly: 1 / 12
};

/**
 * Robust amount parsing
 */
const parseAmount = (val) => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/,/g, '').trim()) || 0;
};

/**
 * ✅ FINAL FORECAST ENGINE
 * - NO date iteration
 * - NO child projections
 * - ONLY recurring masters
 * - Deterministic math
 */
export const calculateMonthlyProjection = (
  transactions,
  targetDate,
  categoryTypeMap = {}
) => {
  const monthStart = getStrictLocalNoon(startOfMonth(targetDate));
  const monthEnd = getStrictLocalNoon(endOfMonth(targetDate));

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};

  transactions.forEach((t) => {
    // --- 1. Must be recurring master ---
    const isRecurring =
      t.isRecurring === true || t.isRecurring === 'true' || t.isRecurring === 1;
    if (!isRecurring) return;

    if (t.isPaused === true || t.isPaused === 'true') return;

    // Child / ghost exclusion (critical)
    if (t.recurringId) return;
    if (t.recurringGroupId && t.recurringGroupId !== t.id) return;

    // --- 2. Frequency ---
    const freq = normalizeFrequency(t.frequency);
    if (!freq || !FREQUENCY_MULTIPLIER[freq]) return;

    // --- 3. Date bounds (master validity only) ---
    const startDate = getStrictLocalNoon(t.date);
    if (startDate > monthEnd) return;

    if (t.endDate) {
      const endDate = getStrictLocalNoon(t.endDate);
      if (endDate < monthStart) return;
    }

    // --- 4. Amount & multiplier ---
    const amount = parseAmount(t.amount);
    const multiplier = FREQUENCY_MULTIPLIER[freq];
    const projectedAmount = amount * multiplier;

    // --- 5. Resolve type ---
    const catKey = (t.category || '').toLowerCase();
    const resolvedType =
      (categoryTypeMap[catKey] || t.type || 'expense').toLowerCase();

    // --- 6. Aggregate ---
    if (resolvedType === 'income') {
      totalIncome += projectedAmount;
    } else {
      totalExpenses += projectedAmount;
      const cat = t.category || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + projectedAmount;
    }
  });

  return {
    totalIncome,
    totalExpenses,
    categoryTotals
  };
};
