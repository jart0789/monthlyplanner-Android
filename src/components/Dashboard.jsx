import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, CreditCard, Calendar, AlertCircle, Lightbulb, MessageSquare, Bell, Check, X, Tag } from 'lucide-react';
import * as LucideIcons from 'lucide-react'; 
import { useFinance } from '../contexts/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  format, parseISO, isSameMonth, startOfDay, subDays, startOfMonth, endOfMonth, 
  isAfter, getDate, getDaysInMonth, setDate, isSameDay, addMonths, addDays, 
  differenceInCalendarDays, isWithinInterval, addWeeks, addYears, setHours 
} from 'date-fns';
import { TourManager } from '../lib/TourManager';
import { cn } from '../lib/utils';
import AdvisorChat from './AdvisorChat';
import { analyzeFinances } from '../utils/smartAdvisor';
// Import Utility
import { calculateMonthlyProjection, getStrictLocalNoon } from '../utils/financeForecast';

const COLORS = ['#0cb606ff', '#F43F5E', '#3B82F6', '#F59E0B', '#8B5CF6', '#6366f1'];

export default function Dashboard({ onNavigate }) {
 
  const { transactions, credits, formatCurrency, t, dailyReminders, dismissReminder, categories } = useFinance(); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dismissedAdvice, setDismissedAdvice] = useState([]);
  
  const [hiddenReminders, setHiddenReminders] = useState(() => {
    try {
      const todayStr = new Date().toDateString();
      const storedData = localStorage.getItem('fintracker_dismissed_daily');
      const storedObj = storedData ? JSON.parse(storedData) : {};
      return Object.keys(storedObj).filter(id => storedObj[id] === todayStr);
    } catch (e) {
      return [];
    }
  });

  const today = useMemo(() => getStrictLocalNoon(new Date()), []);

  useEffect(() => {
    TourManager.run('dashboard', onNavigate, t);
    return () => TourManager.cleanup();
  }, []);

  const handleDismiss = (id) => {
    dismissReminder(id);
    try {
      const todayStr = new Date().toDateString();
      const storedData = localStorage.getItem('fintracker_dismissed_daily');
      const storedObj = storedData ? JSON.parse(storedData) : {};
      storedObj[id] = todayStr;
      localStorage.setItem('fintracker_dismissed_daily', JSON.stringify(storedObj));
      setHiddenReminders(prev => [...prev, id]);
    } catch (e) { console.error(e); }
  };

  const visibleReminders = useMemo(() => {
    if (!dailyReminders) return [];
    return dailyReminders.filter(r => {
        if (hiddenReminders.includes(r.id)) return false;
        const relatedCredit = credits.find(c => c.id === r.id);
        if (relatedCredit) {
            const balance = parseFloat(relatedCredit.currentBalance || 0);
            if (balance <= 0) return false;
        }
        return true;
    });
  }, [dailyReminders, hiddenReminders, credits]);


  // --- 1. BUILD CATEGORY MAP (Case Insensitive Keys) ---
  const categoryTypeMap = useMemo(() => {
    const map = {};
    if (categories) {
        categories.forEach(c => {
            // Lowercase key for safer matching
            if (c.name) map[c.name.toLowerCase()] = c.type; 
        });
    }
    return map;
  }, [categories]);

  // --- 2. CALCULATE FORECAST ---
  const { stats, chartData } = useMemo(() => {
    
    // Pass the map to the engine
    const projection = calculateMonthlyProjection(transactions, today, categoryTypeMap);

    const monthlyDebtMin = credits.reduce((acc, c) => {
        const balance = parseFloat(c.currentBalance || 0);
        return balance > 0 ? acc + parseFloat(c.minPayment || 0) : acc;
    }, 0);

    const totalMonthlyObligations = projection.totalExpenses + monthlyDebtMin;
    const netForecast = projection.totalIncome - totalMonthlyObligations;
    
    const projectedSavingsRate =
        projection.totalIncome > 0 ? (netForecast / projection.totalIncome) * 100 : 0;

    const statsObj = { 
        monthlyIncome: projection.totalIncome, 
        recurringExpenses: projection.totalExpenses, 
        monthlyDebtMin, 
        netForecast, 
        projectedSavingsRate 
    };

    const chartArray = Object.keys(projection.categoryTotals)
        .map(k => ({ name: k, value: projection.categoryTotals[k] }))
        .sort((a, b) => b.value - a.value);

    return { stats: statsObj, chartData: chartArray };

  }, [transactions, credits, today, categoryTypeMap]); 


  const displayData = chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1 }];
  const hasChartData = chartData.length > 0;
  const freeCashPercent = stats.monthlyIncome > 0 ? Math.round(((stats.netForecast) / stats.monthlyIncome) * 100) : 0;

  // Touch handlers
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onNotificationTouchEnd = (id) => { if (!touchStart || !touchEnd) return; if (Math.abs(touchStart - touchEnd) > minSwipeDistance) handleDismiss(id); };
  const onAdvisorTouchEnd = (id) => { if (!touchStart || !touchEnd) return; if (Math.abs(touchStart - touchEnd) > minSwipeDistance) setDismissedAdvice(prev => [...prev, id]); };

  const upcoming = useMemo(() => {
    const list = [];
    const nextTwoWeeks = new Date();
    nextTwoWeeks.setDate(new Date().getDate() + 14);
    
    credits.forEach(c => {
      const balance = parseFloat(c.currentBalance || 0);
      if (c.dueDate && balance > 0) {
        const due = parseISO(c.dueDate);
        if (due >= startOfDay(new Date()) && due <= nextTwoWeeks) {
          list.push({ id: c.id, title: c.name, date: c.dueDate, amount: c.minPayment, type: 'credit' });
        }
      }
    });
    
    transactions.filter(t => t.type === 'expense' && t.isRecurring).forEach(t => {
      const txDate = parseISO(t.date);
      let nextDate = new Date(txDate);
      const now = startOfDay(new Date());
      
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
    const insights = analyzeFinances(transactions, credits, stats, t);
    return insights.filter(item => !dismissedAdvice.includes(item.id));
  }, [transactions, credits, stats, dismissedAdvice]);

  const isAdvisorEmpty = visibleAdvice.length === 0;
 
  return (
    <div className="space-y-6 pb-32 animate-in fade-in relative .tour-main">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard')}</h1>
        <div className={cn("px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" )}>
          {freeCashPercent}{t('projected_free')}
        </div>
      </div>
 
      {visibleReminders && visibleReminders.length > 0 && (
        <div className="relative h-32 w-full mb-6 z-30">
           {visibleReminders.map((reminder, index) => {
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
                          <h3 className="font-bold text-lg leading-tight">{t('friendly_reminder')}</h3>
                          <p className="text-indigo-100 text-sm mt-1 leading-relaxed">{t('time_to_pay')} <span className="font-bold text-white">{reminder.category}</span><br/><span className="italic opacity-80">({reminder.note})</span></p>
                          <div className="mt-2 inline-block px-2 py-1 bg-white/10 rounded-lg text-xs font-bold border border-white/10">{formatCurrency(reminder.amount)}</div>
                       </div>
                    </div>
                    {isTop && (
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-white/50 text-center uppercase tracking-widest">{t('done')}</span>
                            <button onClick={() => handleDismiss(reminder.id)} className="w-10 h-10 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"><Check className="w-5 h-5"/></button>
                        </div>
                    )}
                 </div>
              );
           })}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-3 tour-summary-cards">
        <div onClick={() => onNavigate && onNavigate('income')} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 text-center shadow-xl cursor-pointer active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <div className="mx-auto w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2"><TrendingUp className="w-4 h-4"/></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{t('income')}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.monthlyIncome)}</p>
        </div>
        <div onClick={() => onNavigate && onNavigate('expenses')} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 text-center shadow-xl cursor-pointer active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <div className="mx-auto w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2"><TrendingDown className="w-4 h-4"/></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{t('expenses')}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.recurringExpenses)}</p>
        </div>
        <div onClick={() => onNavigate && onNavigate('credits')} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 text-center shadow-xl cursor-pointer active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <div className="mx-auto w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2"><CreditCard className="w-4 h-4"/></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{t('monthly_min')}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.monthlyDebtMin)}</p>
        </div>
      </div>

      {/* PIE CHART */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 tour-budget-chart">
        <div className="text-center mb-6">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{t('projected_monthly_budget')}</p>
          <p className="text-slate-400 text-xs font-medium mt-1">{t('forecast_formula')}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <h2 className={cn("text-4xl font-black", stats.netForecast >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500")}>{formatCurrency(stats.netForecast)}</h2>
             <div className={cn("px-2 py-1 rounded-full text-xs font-bold", stats.projectedSavingsRate >= 0 ? "bg-emerald-500 text-emerald-100" : "bg-rose-600 text-rose-100")}>{stats.projectedSavingsRate > 0 ? '+' : ''}{stats.projectedSavingsRate.toFixed(1)}%</div>
          </div>
        </div>
        <div className="h-64 w-full relative" >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <filter id="pie-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.25" /></filter>
                {COLORS.map((color, index) => (<linearGradient id={`grad-${index}`} key={index} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity={1} /><stop offset="100%" stopColor={color} stopOpacity={0.7} /></linearGradient>))}
                 <linearGradient id="grad-empty" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} /><stop offset="100%" stopColor="#94a3b8" stopOpacity={0.1} /></linearGradient>
              </defs>
              <Pie data={displayData} innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none" style={{ filter: 'url(#pie-shadow)' }}>
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={hasChartData ? `url(#grad-${index % COLORS.length})` : 'url(#grad-empty)'} stroke="rgba(255,255,255,0.1)" strokeWidth={5}/>
                ))}
              </Pie>
              {hasChartData && <Tooltip formatter={(value) => `${formatCurrency(value)}`} />}
              {hasChartData && <Legend verticalAlign="bottom" height={59}/>}
            </PieChart>
          </ResponsiveContainer>
          {!hasChartData && <div className="relative inset-0 flex items-center justify-center pointer-events-none h-92"><p className="text-slate-900 text-sm font-medium text-center px-8">{t('add_recurring_forecast')}</p></div>}
        </div>
      </div>

      {/* UPCOMING BILLS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden tour-next-bills">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800"><h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> {t('due_next_14')}</h3></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {upcoming.length === 0 ? (<div className="p-6 text-center text-slate-400 text-sm">{t('no_upcoming_payments')}</div>) : (
            upcoming.map(item => {
              const isCredit = item.type === 'credit';
              const cat = !isCredit ? categories.find(c => c.name === item.title) : null;
              const Icon = isCredit ? CreditCard : (LucideIcons[cat?.icon] || Tag);
              return (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isCredit ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600")} style={cat ? {backgroundColor: cat.color, color: 'white'} : {}}><Icon className="w-4 h-4" /></div>
                    <div><p className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</p><p className="text-xs text-slate-500">{format(parseISO(item.date), 'MMM dd')}</p></div>
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* AI ADVISOR */}
      <div className="relative z-10 min-h-[140px] mb-6 tour-Ai-Adivses">
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
                       <div><h4 className="font-bold text-lg leading-tight flex items-center gap-2">{advice.title}</h4><p className="text-sm text-white/90 leading-snug mt-1 font-medium">{advice.text}</p></div>
                    </div>
                    {isTop && (<button onClick={() => setDismissedAdvice(prev => [...prev, advice.id])} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-colors absolute top-3 right-3"><X className="w-4 h-4"/></button>)}
                  </div>
                );
             })}
           </div>
        ) : (
           <div className="p-5 rounded-2xl flex items-center gap-4 border border-slate-100 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-xl">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><Check className="w-6 h-6" /></div>
              <div><h4 className="font-bold text-slate-900 dark:text-white">{t('all_good')}</h4><p className="text-sm text-slate-500 dark:text-slate-400">{t('finance_stable')}</p></div>
           </div>
        )}
      </div>

      <button onClick={() => setIsChatOpen(true)} className="fixed bottom-32 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-transform active:scale-90 z-[60] flex items-center gap-2 font-bold tour-ai-button"><MessageSquare className="w-6 h-6" /><span className="hidden sm:inline">{t('ask_ai')}</span></button>
      {isChatOpen && <AdvisorChat onClose={() => setIsChatOpen(false)} visibleStats={stats} />}
    </div>
  );
}