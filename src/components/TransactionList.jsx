import React, { useState, useMemo, useEffect } from 'react';
import { Moon, Sun, Globe, DollarSign, Plus, Trash2, Edit2, Check, Bell, ChevronLeft, ChevronRight, CreditCard, RefreshCw, Smartphone, Brain, DownloadCloud, AlertTriangle, Tag, Filter } from 'lucide-react'; 
import * as LucideIcons from 'lucide-react'; 
import { useFinance } from '../contexts/FinanceContext';
import { 
  format, subMonths, addMonths, subYears, addYears, isSameMonth, parseISO, startOfYear, endOfYear, 
  isWithinInterval, getMonth, startOfMonth, endOfMonth, getDaysInMonth, setDate, getDate, isAfter, 
  addDays, subDays, differenceInCalendarDays, isSameDay, isBefore, addWeeks, setHours, startOfDay 
} from 'date-fns';
import { TourManager } from '../lib/TourManager';
import { cn } from '../lib/utils';
import TransactionForm from './TransactionForm';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'; 

export default function TransactionList({ type = 'expense', onNavigate }) {
  // 1. Destructure updateTransaction
  const { transactions, deleteTransaction, updateTransaction, formatCurrency, categories, t } = useFinance();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('list'); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const tourKey = type === 'expense' ? 'expenses' : type;
    TourManager.run(tourKey, onNavigate, t, { setTab: setActiveTab });
    return () => TourManager.cleanup();
  }, [type]);

  // Reset category when switching income/expense
  useEffect(() => {
    setSelectedCategory('All');
  }, [type]);

  useEffect(() => {
    setCurrentDate(new Date());
  }, [activeTab]);

  // --- HELPER: STRICT LOCAL NOON ---
  // Forces all dates to 12:00 PM Local Time to prevent DST/Timezone drift
const getStrictLocalNoon = (dateString) => {
    if (!dateString) return new Date();
    const parts = dateString.substring(0, 10).split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0);
  };

  // --- PROJECTION ENGINE ---
  const allProjectedTransactions = useMemo(() => {
    const viewYearStart = startOfYear(currentDate);
    const viewYearEnd = endOfYear(currentDate);
    // Guardrail: ±2 years to prevent performance issues
    const safeStart = subMonths(viewYearStart, 6); 
    const safeEnd = addMonths(viewYearEnd, 6);

    const masters = transactions.filter(t => t.type === type && t.isRecurring && !t.recurringId);
    const ghosts = [];

    masters.forEach(master => {
        if (master.isPaused) return;

        const mDate = getStrictLocalNoon(master.date);
        const freq = master.frequency || 'monthly';
        const endDate = master.endDate ? getStrictLocalNoon(master.endDate) : null;

        if (isAfter(mDate, safeEnd)) return;

        let iterDate = new Date(mDate);
        let safety = 0;

        // Loop until end of safe window (limit 750 iterations)
        while (iterDate <= safeEnd && safety < 750) {
            safety++;
            
            // Check End Date (Inclusive)
            if (endDate && isAfter(iterDate, endDate)) break;

            // Only add to list if it's inside our relevant window
            if (iterDate >= safeStart) {
                const dateStr = format(iterDate, 'yyyy-MM-dd');
                
                // Deduplication: Check for Real Transaction on this date
                const isCovered = transactions.some(t => {
                    if (t.id === master.id || t.recurringId === master.id) {
                         return t.date.substring(0, 10) === dateStr;
                    }
                    return false;
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

            // Iterate based on frequency
            if (freq === 'monthly') iterDate = addMonths(iterDate, 1);
            else if (freq === 'weekly') iterDate = addWeeks(iterDate, 4);
            else if (freq === 'biweekly') iterDate = addWeeks(iterDate, 2);
            else break; 
        }
    });

    return [...transactions, ...ghosts];
  }, [transactions, currentDate, type]);


  // --- FILTER: Current Month ---
   const monthlyTransactions = useMemo(() => {
    const currentMonthStr = format(currentDate, 'yyyy-MM');
    return allProjectedTransactions
      .filter(t => t.type === type)
      .filter(t => t.date && t.date.substring(0, 7) === currentMonthStr);
  }, [allProjectedTransactions, currentDate, type]);


  // --- FILTER: Category ---
  const filteredTransactions = useMemo(() => {
    let data = monthlyTransactions;
    if (selectedCategory !== 'All') {
        data = data.filter(t => t.category === selectedCategory);
    }
    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [monthlyTransactions, selectedCategory]);


const getFrequencyMultiplier = (t) => {
const freq = t.frequency;
if (!freq) return 1;
if (freq === 'monthly') return 1;
if (freq === 'biweekly') return 2;
if (freq === 'weekly') return 4;
return 1;
};


const totalAmount = filteredTransactions.reduce((acc, curr) => {
const multiplier = getFrequencyMultiplier(curr);
return acc + parseFloat(curr.amount) * multiplier;
}, 0);


  // --- ACTIVE CATEGORIES (for chips) ---
  const activeCategories = useMemo(() => {
    const allCats = categories.filter(c => c.type === type);
    const activeNames = new Set(monthlyTransactions.map(t => t.category));
    return allCats.filter(c => activeNames.has(c.name));
  }, [monthlyTransactions, categories, type]);


  // --- ANALYSIS DATA ---
  const analysisData = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    
    const yearlyTxs = allProjectedTransactions.filter(t => 
        t.type === type && 
        isWithinInterval(parseISO(t.date), { start: yearStart, end: yearEnd })
    );

    const total = yearlyTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const avg = total / 12;

    const chartData = Array.from({ length: 12 }, (_, i) => ({
        name: format(new Date(currentDate.getFullYear(), i, 1), 'MMM'),
        fullMonth: format(new Date(currentDate.getFullYear(), i, 1), 'MMMM'),
        value: 0,
        index: i
    }));

    yearlyTxs.forEach(t => {
        const mIndex = getMonth(parseISO(t.date));
        if (chartData[mIndex]) {
            chartData[mIndex].value += Number(t.amount || 0);
        }
    });

    return { totalYearly: total, avgMonthly: avg, chartData };
  }, [allProjectedTransactions, currentDate, type]);


  const handleAddNew = () => { setEditingItem(null); setIsFormOpen(true); };
  
  // --- SMART EDIT: Split Recurrence ---
  const handleEdit = (item) => { 
    if (item.isGhost) {
        // Prepare split: New ID, but link to old master to close it
        setEditingItem({ 
            ...item, 
            id: undefined, 
            splitFromId: item.originalId, 
            splitDate: item.date 
        });
    } else {
        setEditingItem(item);
    }
    setSelectedItem(null); 
    setIsFormOpen(true); 
  };

  // --- SMART DELETE: Stop Recurrence ---
   const handleDelete = async (id) => {
    // We need to find the item object to check if it's a ghost. 
    // Since handleDelete usually receives just ID, we find it in the list:
    const item = filteredTransactions.find(t => t.id === id);

    if (item && item.isGhost) {
        const confirmMsg = "Do you want to STOP this recurring transaction? \n\nThis will keep past history but remove this and all future occurrences.";
        if (confirm(confirmMsg)) {
            const master = transactions.find(t => t.id === item.originalId);
            if (master) {
                // Set end date to yesterday
                const ghostDate = parseISO(item.date); 
                const stopDate = subDays(ghostDate, 1);
                
                await updateTransaction(master.id, { 
                    ...master, 
                    endDate: stopDate.toISOString() 
                });
            }
        }
        return;
    }

    if (confirm(t('confirm_delete'))) { 
        deleteTransaction(id); 
        setSelectedItem(null); 
    } 
  };

  const handlePrevDate = () => {
    if (activeTab === 'analysis') setCurrentDate(prev => subYears(prev, 1));
    else setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextDate = () => {
    if (activeTab === 'analysis') setCurrentDate(prev => addYears(prev, 1));
    else setCurrentDate(prev => addMonths(prev, 1));
  };

  return (
    <div className="h-full flex flex-col pb-20 animate-in fade-in relative tour-page-title">
      <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 tour-list-months">
        <button onClick={handlePrevDate} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
        <h2 className="font-bold text-slate-700 dark:text-white text-lg ">
            {activeTab === 'analysis' 
                ? format(currentDate, 'yyyy') 
                : `${t('month_' + format(currentDate, 'MMMM').toLowerCase())} ${format(currentDate, 'yyyy')}`
            }
        </h2>
        <button onClick={handleNextDate} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
      </div>

      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
        <button onClick={() => setActiveTab('list')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'list' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500")}>{t('list_tab')}</button>
        <button onClick={() => setActiveTab('analysis')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'analysis' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500")}>{t('analysis_tab')}</button>
      </div>

      {activeTab === 'list' ? (
        <>
            <div className={cn("p-6 rounded-3xl mb-4 text-white shadow-lg transition-colors tour-list-total", type === 'income' ? "bg-emerald-500 shadow-cyan-500/50" : "bg-blue-600 shadow-blue-500/50")}>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">
                {selectedCategory === 'All' ? (type === 'income' ? t('total_income') : t('total_expenses')) : `${selectedCategory} ${t('total')}`}
                </p>
                <div className="flex items-end gap-2">
                    <h1 className="text-4xl font-black tracking-tight">{formatCurrency(totalAmount)}</h1>
                    <span className="text-xs font-medium text-white/70 mb-2">({filteredTransactions.length} items)</span>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar -mx-2 px-2 tour-list-filters">
                <button onClick={() => setSelectedCategory('All')} className={cn("px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xl border", selectedCategory === 'All' ? (type === 'income' ? "bg-emerald-600 text-white border-emerald-600" : "bg-blue-600 text-white border-blue-600") : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700")}>{t('all')}</button>
                {activeCategories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={cn("px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xl border flex items-center gap-2", selectedCategory === cat.name ? (type === 'income' ? "bg-emerald-600 text-white border-emerald-600" : "bg-blue-800 text-white border-blue-600") : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700")}>
                    <div className={cn("w-2 h-2 rounded-full", selectedCategory === cat.name ? "bg-white" : "")} style={{ backgroundColor: selectedCategory === cat.name ? undefined : cat.color }} />
                    {cat.name}
                </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar tour-list-container">
                {filteredTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    <Filter className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold opacity-50">{t('no_transactions_found')}</p>
                </div>
                ) : (
                filteredTransactions.map(t => {
                    const cat = categories.find(c => c.name === t.category) || {};
                    const IconComponent = LucideIcons[cat.icon] || Tag; 
                    const freqDisplay = t.frequency ? { weekly: 'Weekly', biweekly: 'Bi-Weekly', monthly: 'Monthly', yearly: 'Yearly' }[t.frequency] : null;

                    return (
                    <div key={t.id} className={cn("bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 flex shadow-lg items-center justify-between group active:scale-98 transition-transform", t.isGhost ? "opacity-80 border-dashed" : "")}>
                        <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-xl" style={{ backgroundColor: cat.color || '#94a3b8' }}><IconComponent className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {t.category}
                                {t.isGhost && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-wide">Recurring</span>}
                            </h3>
                            <p className="text-slate-900 dark:text-white">{t.notes}</p>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-2 flex-wrap">
                            {format(parseISO(t.date), 'MMM dd')}
                            {freqDisplay && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-purple-600 bg-purple-50 dark:bg-purple-900/30">{freqDisplay}</span>}
                            </p>
                        </div>
                        </div>
                        <div className="text-right">
                        <span className={cn("block font-black text-lg", type === 'income' ? "text-emerald-500" : "text-slate-900 dark:text-white")}>{type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</span>
                        <div className="flex gap-3 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(t)} className="text-blue-400 hover:text-blue-600"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(t.id, t)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        </div>
                    </div>
                    );
                })
                )}
            </div>

            <button onClick={handleAddNew} className={cn("fixed bottom-32 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-transform active:scale-90 z-[60] flex items-center gap-2 font-bold tour-add-btn", type === 'income' ? "bg-emerald-500 shadow-emerald-500/40" : "bg-blue-600 shadow-blue-600/40")}><Plus className="w-8 h-8" /></button>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 tour-YearlyTotal">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{t('balance')}</p>
                <h1 className={cn("text-4xl font-black", type === 'income' ? "text-emerald-500" : "text-slate-900 dark:text-white")}>{formatCurrency(analysisData.totalYearly)}</h1>
                <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-100 dark:bg-slate-700 inline-block px-3 py-1 rounded-full">{format(currentDate, 'yyyy')}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 tour-YearlySummary">
                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-bold text-slate-500">{t('avg_monthly')}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(analysisData.avgMonthly)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-bold text-slate-500">{t('total_yearly')}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(analysisData.totalYearly)}</span>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 tour-YearlyDetail">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-900 dark:text-white">{t('yearly_detail')}</h3></div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysisData.chartData}>
                            <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => { if (active && payload && payload.length) { return ( <div className="bg-slate-900 text-white text-xs p-2 rounded-lg shadow-xl"><p className="font-bold mb-1">{payload[0].payload.fullMonth}</p><p>{formatCurrency(payload[0].value)}</p></div> ); } return null; }} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                            <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20}>
                                {analysisData.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={type === 'income' ? '#10B981' : '#3B82F6'} opacity={entry.value > 0 ? 1 : 0.1} />))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {isFormOpen && (
        <TransactionForm 
          type={type} 
          existingData={editingItem} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}