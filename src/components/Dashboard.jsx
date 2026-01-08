import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, CreditCard, Calendar, AlertCircle, Lightbulb, MessageSquare, Bell, Check, X, Tag } from 'lucide-react';
import * as LucideIcons from 'lucide-react'; // Added to map icon strings to components
import { useFinance } from '../contexts/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { format, parseISO, isSameMonth, startOfDay, subDays } from 'date-fns';
import { cn } from '../lib/utils';
// IMPORTS
import AdvisorChat from './AdvisorChat';
import { analyzeFinances } from '../utils/smartAdvisor';

const COLORS = ['#0cb606ff', '#F43F5E', '#3B82F6', '#F59E0B', '#8B5CF6', '#6366f1'];

export default function Dashboard() {
  const { transactions, credits, formatCurrency, t, dailyReminders, dismissReminder, categories } = useFinance(); // Destructured categories
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dismissedAdvice, setDismissedAdvice] = useState([]);
  
  const today = new Date();

  // --- SWIPE LOGIC ---
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onNotificationTouchEnd = (id) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > minSwipeDistance) {
      dismissReminder(id);
    }
  };

  const onAdvisorTouchEnd = (id) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > minSwipeDistance) {
      setDismissedAdvice(prev => [...prev, id]);
    }
  };

  // --- STATS CALCULATIONS ---
  const getMonthlyValue = (transaction) => {
    const amount = parseFloat(transaction.amount);
    if (transaction.isRecurring) {
        switch (transaction.frequency) {
            case 'weekly': return amount * 4;
            case 'biweekly': return amount * 2;
            case 'yearly': return amount / 12;
            default: return amount; 
        }
    }
    return amount;
  };

  const stats = useMemo(() => {
    const startLast30 = subDays(today, 30);
    const recentTxs = transactions.filter(t => {
      const d = parseISO(t.date);
      return d >= startLast30 && d <= today;
    });
    const recentIncome = recentTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const recentExpense = recentTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const currentFlow = recentIncome - recentExpense;

    const uniqueRecurring = [];
    const seenFamilies = new Set();
    const sortedTxs = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedTxs.forEach(t => {
        if (t.isRecurring) {
            const familyId = t.recurringId || t.id;
            if (!seenFamilies.has(familyId)) {
                seenFamilies.add(familyId);
                uniqueRecurring.push(t);
            }
        }
    });

    const monthlyIncome = uniqueRecurring
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + getMonthlyValue(t), 0);

    const recurringExpenses = uniqueRecurring
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + getMonthlyValue(t), 0);

  const monthlyDebtMin = credits.reduce((acc, c) => {
      const balance = parseFloat(c.currentBalance || 0);
      const minPayment = parseFloat(c.minPayment || 0);
      return balance > 0 ? acc + minPayment : acc;
    }, 0);
    const totalMonthlyObligations = recurringExpenses + monthlyDebtMin;
    const netForecast = monthlyIncome - totalMonthlyObligations;
    const totalDebt = credits.reduce((acc, c) => acc + (parseFloat(c.currentBalance || c.totalAmount) || 0), 0);

    let projectedSavingsRate = 0;
    if (monthlyIncome > 0) {
        projectedSavingsRate = (netForecast / monthlyIncome) * 100;
    } else if (totalMonthlyObligations > 0) {
        projectedSavingsRate = -100; 
    }

    return { monthlyIncome, recurringExpenses, monthlyDebtMin, totalMonthlyObligations, netForecast, currentFlow, projectedSavingsRate, monthlyExpenses: recentExpense, totalDebt };
  }, [transactions, credits]);

  const freeCashPercent = stats.monthlyIncome > 0 ? Math.round(((stats.netForecast) / stats.monthlyIncome) * 100) : 0;

  const chartData = useMemo(() => {
    const groups = {};
    const uniqueRecurring = [];
    const seenFamilies = new Set();
    const sortedTxs = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedTxs.forEach(t => {
        if (t.isRecurring && t.type === 'expense') {
            const familyId = t.recurringId || t.id;
            if (!seenFamilies.has(familyId)) {
                seenFamilies.add(familyId);
                uniqueRecurring.push(t);
            }
        }
    });

    uniqueRecurring.forEach(t => {
        const val = getMonthlyValue(t);
        if (val > 0) { 
            const catName = t.category || 'Uncategorized'; 
            groups[catName] = (groups[catName] || 0) + val; 
        }
    });
    
    // REMOVED: if (stats.monthlyDebtMin > 0) groups['Debt Repayment'] = stats.monthlyDebtMin;
    return Object.keys(groups).map(k => ({ name: k, value: groups[k] })).sort((a, b) => b.value - a.value);
  }, [transactions, stats.monthlyDebtMin]);

  const upcoming = useMemo(() => {
    const list = [];
    const nextTwoWeeks = new Date();
    nextTwoWeeks.setDate(today.getDate() + 14);
    
    credits.forEach(c => {
      if (!c.dueDate) return;
      const due = parseISO(c.dueDate);
      if (due >= startOfDay(today) && due <= nextTwoWeeks) {
        list.push({ id: c.id, title: c.name, date: c.dueDate, amount: c.minPayment, type: 'credit' });
      }
    });
    
    transactions.filter(t => t.type === 'expense' && t.isRecurring).forEach(t => {
        const txDate = parseISO(t.date);
        let nextDate = new Date(txDate);
        const now = startOfDay(today);
        
        while (nextDate < now) {
            if (t.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (t.frequency === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
            else if (t.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            else nextDate.setMonth(nextDate.getMonth() + 1);
        }

        if (nextDate >= now && nextDate <= nextTwoWeeks) {
          list.push({ id: t.id, title: t.category, date: nextDate.toISOString(), amount: t.amount, type: 'bill' });
        }
      });
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [credits, transactions]);

  const visibleAdvice = useMemo(() => {
    const insights = analyzeFinances(transactions, credits, stats);
    const processed = insights.map((insight, index) => {
        let gradient = "from-blue-600 to-blue-500"; 
        let icon = Lightbulb;
        if (insight.type === 'critical') { gradient = "from-rose-600 to-rose-500"; icon = AlertCircle; }
        else if (insight.type === 'warning') { gradient = "from-orange-500 to-amber-500"; icon = AlertCircle; }
        else if (insight.type === 'success') { gradient = "from-emerald-600 to-teal-500"; icon = Check; }
        return { ...insight, id: `adv_${index}_${insight.type}`, gradient, Icon: icon };
    });
    return processed.filter(item => !dismissedAdvice.includes(item.id));
  }, [transactions, credits, stats, dismissedAdvice]);

  const isAdvisorEmpty = visibleAdvice.length === 0;

  return (
    <div className="space-y-6 pb-32 animate-in fade-in relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard')}</h1>
        <div className={cn("px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
          {freeCashPercent}% Projected Free
        </div>
      </div>

      {dailyReminders && dailyReminders.length > 0 && (
        <div className="relative h-32 w-full mb-6 z-30">
           {dailyReminders.map((reminder, index) => {
              if (index > 2) return null;
              const isTop = index === 0;
              const scale = 1 - (index * 0.05);
              const translateY = index * 8;
              const opacity = 1 - (index * 0.2);
              return (
                 <div key={reminder.id} onTouchStart={isTop ? onTouchStart : undefined} onTouchMove={isTop ? onTouchMove : undefined} onTouchEnd={() => isTop && onNotificationTouchEnd(reminder.id)}
                   style={{ zIndex: 30 - index, transform: `scale(${scale}) translateY(${translateY}px)`, opacity: opacity }}
                   className={cn("absolute inset-0 p-4 rounded-3xl shadow-lg transition-all duration-300 ease-out flex items-center justify-between", reminder.type === 'loan' ? "bg-blue-600" : "bg-indigo-600")}>
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-white/20 rounded-2xl text-white"><Bell className="w-6 h-6 animate-pulse"/></div>
                       <div className="text-white">
                          <h3 className="font-bold text-lg leading-tight">Friendly Reminder</h3>
                          <p className="text-indigo-100 text-sm mt-1 leading-relaxed">Time to pay <span className="font-bold text-white">{reminder.category}</span><br/><span className="italic opacity-80">({reminder.note})</span></p>
                          <div className="mt-2 inline-block px-2 py-1 bg-white/10 rounded-lg text-xs font-bold border border-white/10">{formatCurrency(reminder.amount)}</div>
                       </div>
                    </div>
                    {isTop && (
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-white/50 text-center uppercase tracking-widest">Done</span>
                            <button onClick={() => dismissReminder(reminder.id)} className="w-10 h-10 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"><Check className="w-5 h-5"/></button>
                        </div>
                    )}
                 </div>
              );
           })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 text-center shadow-sm">
          <div className="mx-auto w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2"><TrendingUp className="w-4 h-4"/></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Income</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.monthlyIncome)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 text-center shadow-sm">
          <div className="mx-auto w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2"><TrendingDown className="w-4 h-4"/></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Expenses</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.recurringExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 text-center shadow-sm">
          <div className="mx-auto w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2"><CreditCard className="w-4 h-4"/></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Monthly Debt</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.monthlyDebtMin)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="text-center mb-6">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Projected Monthly Budget</p>
          <p className="text-slate-400 text-xs font-medium mt-1">Income - (Recurring Bills + Debt)</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <h2 className={cn("text-4xl font-black", stats.netForecast >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500")}>{formatCurrency(stats.netForecast)}</h2>
             <div className={cn("px-2 py-1 rounded-full text-xs font-bold", stats.projectedSavingsRate >= 0 ? "bg-emerald-500 text-emerald-100" : "bg-rose-600 text-rose-100")}>{stats.projectedSavingsRate > 0 ? '+' : ''}{stats.projectedSavingsRate.toFixed(1)}%</div>
          </div>
        </div>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" padding-bottom={2}>
              <PieChart>
                <Pie data={chartData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `${formatCurrency(value)} (${(value / stats.monthlyIncome * 100).toFixed(1)}%)`} />
                <Legend verticalAlign="bottom" height={59} bottom={5}/>
              </PieChart>
            </ResponsiveContainer>
          ) : ( <div className="flex items-center justify-center h-full text-slate-400 text-sm">Add recurring items to see forecast</div> )}
        </div>
      </div>

      {/* 4. UPCOMING BILLS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Due Next 14 Days
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {upcoming.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">No upcoming payments</div>
          ) : (
            upcoming.map(item => {
              const isCredit = item.type === 'credit';
              const cat = !isCredit ? categories.find(c => c.name === item.title) : null;
              const Icon = isCredit ? CreditCard : (LucideIcons[cat?.icon] || Tag);
              
              return (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isCredit ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600")} 
                      style={cat ? {backgroundColor: cat.color, color: 'white'} : {}}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-xs text-slate-500">{format(parseISO(item.date), 'MMM dd')}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* 5. AI ADVISOR */}
      <div className="relative z-10 min-h-[140px] mb-6">
        {!isAdvisorEmpty ? (
           <div className="relative h-32 w-full">
             {visibleAdvice.map((advice, index) => {
                if (index > 2) return null;
                const isTop = index === 0;
                const scale = 1 - (index * 0.04);
                const translateY = index * 8; 
                const opacity = 1 - (index * 0.2);
                return (
                  <div key={advice.id} onTouchStart={isTop ? onTouchStart : undefined} onTouchMove={isTop ? onTouchMove : undefined} onTouchEnd={() => isTop && onAdvisorTouchEnd(advice.id)}
                    style={{ zIndex: 20 - index, transform: `scale(${scale}) translateY(${translateY}px)`, opacity: opacity }}
                    className={cn("absolute inset-0 p-5 rounded-2xl shadow-xl transition-all duration-300 ease-out flex items-center justify-between bg-gradient-to-r text-white", advice.gradient )} >
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shrink-0"><advice.Icon className="w-6 h-6 text-white" /></div>
                       <div>
                          <h4 className="font-bold text-lg leading-tight flex items-center gap-2">{advice.title}</h4>
                          <p className="text-sm text-white/90 leading-snug mt-1 font-medium">{advice.text}</p>
                       </div>
                    </div>
                    {isTop && (
                       <button onClick={() => setDismissedAdvice(prev => [...prev, advice.id])} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-colors absolute top-3 right-3"><X className="w-4 h-4"/></button>
                    )}
                  </div>
                );
             })}
           </div>
        ) : (
           <div className="p-5 rounded-2xl flex items-center gap-4 border border-slate-100 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><Check className="w-6 h-6" /></div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">All Good!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your finances are looking stable. No urgent actions needed.</p>
              </div>
           </div>
        )}
      </div>

      <button onClick={() => setIsChatOpen(true)} className="fixed bottom-32 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-transform active:scale-90 z-[60] flex items-center gap-2 font-bold">
        <MessageSquare className="w-6 h-6" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>

    {isChatOpen && <AdvisorChat onClose={() => setIsChatOpen(false)} visibleStats={stats} />}

    </div>
  );
}