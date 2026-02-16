import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CreditCard, PieChart, Wallet } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, 
    parseISO, isAfter, isBefore, isSameDay, startOfYear, endOfYear, addWeeks, addYears, addDays 
} from 'date-fns';
import { cn } from '../lib/utils';
import { TourManager } from '../lib/TourManager'; 
import { getStrictLocalNoon } from '../utils/financeForecast';

export default function Snapshot({ onNavigate }) {
  const { transactions, credits, formatCurrency, t, categories } = useFinance();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handlePrevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedDate(prev => addMonths(prev, 1));

  useEffect(() => {
    TourManager.run('snapshot', onNavigate, t);
    return () => TourManager.cleanup();
  }, []);

  // --- 1. BUILD CATEGORY MAP (Prevents $0 Type Bugs) ---
  const categoryTypeMap = useMemo(() => {
    const map = {};
    if (categories) {
        categories.forEach(c => {
            if (c.name) map[c.name.toLowerCase()] = c.type; 
        });
    }
    return map;
  }, [categories]);

  // --- 2. GHOST PROJECTION ENGINE (Parity with TransactionList) ---
  const allProjectedTransactions = useMemo(() => {
    const viewYearStart = startOfYear(selectedDate);
    const viewYearEnd = endOfYear(selectedDate);
    const safeStart = subMonths(viewYearStart, 6); 
    const safeEnd = addMonths(viewYearEnd, 6);

    const masters = transactions.filter(t => 
        (t.isRecurring === true || t.isRecurring === 'true' || t.isRecurring === 1)
    );
    
    const ghosts = [];

    masters.forEach(master => {
        if (master.isPaused) return;

        const mDate = getStrictLocalNoon(master.date);
        let freq = (master.frequency || 'monthly').toLowerCase();
        if (freq === 'byweekly' || freq === 'bi-weekly') freq = 'biweekly';

        const endDate = master.endDate ? getStrictLocalNoon(master.endDate) : null;

        if (isAfter(mDate, safeEnd)) return;

        let baseDate = new Date(mDate);
        let isSecondOccurrence = false;
        let safety = 0;

        while (baseDate <= safeEnd && safety < 1000) {
            safety++;
            
            let currentIterDate = new Date(baseDate);
            if (freq === 'biweekly' && isSecondOccurrence) {
                currentIterDate = addDays(baseDate, 14);
            }

            if (endDate && isAfter(currentIterDate, endDate)) break;

            if (currentIterDate >= safeStart && currentIterDate <= safeEnd) {
                const dateStr = format(currentIterDate, 'yyyy-MM-dd');
                
                const isCovered = transactions.some(t => {
                    const isFamily = t.id === master.id || t.recurringId === master.id || (t.recurringId && t.recurringId === master.recurringId);
                    return isFamily && t.date.substring(0, 10) === dateStr;
                });

                if (!isCovered) {
                    ghosts.push({
                        ...master,
                        id: `ghost-${master.id}-${dateStr}`,
                        date: dateStr,
                        isGhost: true, 
                        originalId: master.id
                    });
                }
            }

            // STEP FORWARD
            if (freq === 'monthly') {
                baseDate = addMonths(baseDate, 1);
            } else if (freq === 'weekly') {
                baseDate = addWeeks(baseDate, 1);
            } else if (freq === 'biweekly') {
                if (isSecondOccurrence) {
                    baseDate = addMonths(baseDate, 1);
                    isSecondOccurrence = false;
                } else {
                    isSecondOccurrence = true;
                }
            } else if (freq === 'yearly') {
                baseDate = addYears(baseDate, 1);
            } else break; 
        }
    });

    return [...transactions, ...ghosts];
  }, [transactions, selectedDate]);


  // --- 3. CALCULATE SNAPSHOT DATA ---
  const monthData = useMemo(() => {
    const currentMonthStr = format(selectedDate, 'yyyy-MM');
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Filter to ONLY items in the selected month (Ghosts + Real)
    const thisMonthTxs = allProjectedTransactions.filter(t => t.date && t.date.startsWith(currentMonthStr));

    let earned = 0, toEarn = 0;
    let paidBills = 0, leftToPayBills = 0;
    const categoryTotals = {};

    thisMonthTxs.forEach(t => {
        const amount = parseFloat(t.amount || 0);
        if (amount === 0) return;

        const catName = t.category || 'Uncategorized';
        const catKey = catName.toLowerCase();
        const resolvedType = (categoryTypeMap[catKey] || t.type || 'expense').toLowerCase();
        
        // Evaluate if the item is in the past (Paid/Earned) or future (Left to Pay/Earn)
        const txDateStr = t.date.substring(0, 10);
        const isPastOrToday = txDateStr <= todayStr;

        if (resolvedType === 'income') {
            if (isPastOrToday) earned += amount;
            else toEarn += amount;
        } else if (resolvedType === 'expense' && catName !== 'Debt Payment') {
            if (isPastOrToday) paidBills += amount;
            else leftToPayBills += amount;

            // Budget tracking
            categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;
        }
    });

    // CREDITS & LOANS LOGIC
    let totalPaidDebt = 0;
    let totalLeftToPayDebt = 0;
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    credits.forEach(credit => {
        const minPay = parseFloat(credit.minPayment || 0);
        let paidForThisCredit = 0;
        
        if (credit.history && Array.isArray(credit.history)) {
            credit.history.forEach(payment => {
                const pDate = parseISO(payment.date);
                if (isWithinInterval(pDate, { start: monthStart, end: monthEnd })) {
                    if (isBefore(pDate, today) || isSameDay(pDate, today)) {
                        paidForThisCredit += parseFloat(payment.amount);
                    }
                }
            });
        }
        
        const remainingForCredit = Math.max(0, minPay - paidForThisCredit);
        totalPaidDebt += paidForThisCredit;
        totalLeftToPayDebt += remainingForCredit;
    });

    const sortedCategories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    return {
        earned, toEarn,
        paidBills, leftToPayBills,
        paidDebt: totalPaidDebt,
        leftToPayDebt: totalLeftToPayDebt,
        categories: sortedCategories,
        totalSpent: paidBills + totalPaidDebt
    };
  }, [allProjectedTransactions, selectedDate, credits, categoryTypeMap]);

  return (
    <div className="space-y-6 pb-32 animate-in fade-in">
      
      {/* HEADER: Month Selector */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-500 dark:text-slate-400" />
        </button>
        <div className="text-center">
            <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                {t('month_' + format(selectedDate, 'MMMM').toLowerCase())} {format(selectedDate, 'yyyy')}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('snapshot_view')}</p>
        </div>
        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <ChevronRight className="w-6 h-6 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* CARD 1: EARNINGS */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden tour-snapshot-earnings">
         <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-24 h-24 text-emerald-500" />
         </div>
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                    <Wallet className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('earnings')}</h3>
                    <p className="text-xs text-slate-500">{t('income_flow')}</p>
                </div>
            </div>
            
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">{t('earned_so_far')}</p>
                    <p className="text-2xl font-black text-emerald-500">{formatCurrency(monthData.earned)}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">{t('to_earn')}</p>
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{formatCurrency(monthData.toEarn)}</p>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(monthData.earned / ((monthData.earned + monthData.toEarn) || 1)) * 100}%` }}
                />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CARD 2: BILLS */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 tour-snapshot-bills">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl">
                    <TrendingDown className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{t('bills_utilities')}</h3>
            </div>
            
            <div className="space-y-1 mb-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(monthData.leftToPayBills)}</p>
                <p className="text-xs font-bold text-slate-400 uppercase">{t('left_to_pay')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                {t('paid')}: {formatCurrency(monthData.paidBills)}
            </div>
          </div>

          {/* CARD 3: DEBT */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 tour-snapshot-debt">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                    <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{t('credits_loans')}</h3>
            </div>
            
            <div className="space-y-1 mb-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(monthData.leftToPayDebt)}</p>
                <p className="text-xs font-bold text-slate-400 uppercase">{t('left_to_pay')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                {t('paid')}: {formatCurrency(monthData.paidDebt)}
            </div>
          </div>
      </div>

      {/* CARD 4: BUDGET BREAKDOWN */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 tour-snapshot-breakdown">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl">
                <PieChart className="w-6 h-6" />
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('spending_breakdown')}</h3>
                <p className="text-xs text-slate-500">{t('total_spent')}: {formatCurrency(monthData.totalSpent)}</p>
            </div>
         </div>

         <div className="space-y-4">
            {monthData.categories.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">{t('no_transactions_found')}</p>
            ) : (
                monthData.categories.map((cat, index) => (
                    <div key={index}>
                        <div className="flex justify-between text-sm font-bold mb-1">
                            <span className="text-slate-700 dark:text-slate-200">{cat.name}</span>
                            <span className="text-slate-900 dark:text-white">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500" 
                                style={{ width: `${(cat.amount / (monthData.totalSpent || 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                ))
            )}
         </div>
      </div>

    </div>
  );
}