import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CreditCard, PieChart, Wallet } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';
import { cn } from '../lib/utils';
import { TourManager } from '../lib/TourManager'; 

export default function Snapshot({ onNavigate }) {
  const { transactions, credits, formatCurrency, t } = useFinance();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handlePrevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedDate(prev => addMonths(prev, 1));

  useEffect(() => {
    TourManager.run('snapshot', onNavigate, t);
    return () => TourManager.cleanup();
  }, []);

  const monthData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const today = new Date();

    // 1. EARNINGS (Income)
    const incomeTxs = transactions.filter(t => 
      t.type === 'income' && 
      isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );
    const earned = incomeTxs.filter(t => isBefore(parseISO(t.date), today) || isSameDay(parseISO(t.date), today)).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const toEarn = incomeTxs.filter(t => isAfter(parseISO(t.date), today)).reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // 2. BILLS (Expenses that are NOT debt payments)
    const billTxs = transactions.filter(t => 
        t.type === 'expense' && 
        t.category !== 'Debt Payment' &&
        isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );
    const paidBills = billTxs.filter(t => isBefore(parseISO(t.date), today) || isSameDay(parseISO(t.date), today)).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const leftToPayBills = billTxs.filter(t => isAfter(parseISO(t.date), today)).reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // 3. CREDITS & LOANS (UPDATED LOGIC)
    let totalPaidDebt = 0;
    let totalLeftToPayDebt = 0;

    credits.forEach(credit => {
        // A. Get the Target (Minimum Payment) for this card
        const minPay = parseFloat(credit.minPayment || 0);

        // B. Calculate what has been PAID for this specific card in the selected month
        let paidForThisCredit = 0;
        
        if (credit.history && Array.isArray(credit.history)) {
            credit.history.forEach(payment => {
                const pDate = parseISO(payment.date);
                
                // Check if payment belongs to the selected month view
                if (isWithinInterval(pDate, { start: monthStart, end: monthEnd })) {
                    // Include it if it's in the past or today
                    if (isBefore(pDate, today) || isSameDay(pDate, today)) {
                        paidForThisCredit += parseFloat(payment.amount);
                    }
                }
            });
        }
        
        // C. Calculate Left to Pay for THIS card
        // If paid >= minPay, remaining is 0. If paid < minPay, remaining is diff.
        const remainingForCredit = Math.max(0, minPay - paidForThisCredit);

        // Add to totals
        totalPaidDebt += paidForThisCredit;
        totalLeftToPayDebt += remainingForCredit;
    });

    // 4. BUDGET BREAKDOWN
    const categoryTotals = {};
    billTxs.forEach(t => {
        const cat = t.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(t.amount);
    });
    
    const categories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    return {
        earned, toEarn,
        paidBills, leftToPayBills,
        paidDebt: totalPaidDebt,
        leftToPayDebt: totalLeftToPayDebt,
        categories,
        totalSpent: paidBills + totalPaidDebt
    };
  }, [selectedDate, transactions, credits]);

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
                    style={{ width: `${(monthData.earned / (monthData.earned + monthData.toEarn || 1)) * 100}%` }}
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