import React, { useState, useMemo, useEffect } from 'react';
import { Moon, Sun, Globe, DollarSign, Plus, Trash2, Edit2, Check, Bell, ChevronLeft, ChevronRight, CreditCard, RefreshCw, Smartphone, Brain, DownloadCloud, AlertTriangle, Tag, Filter } from 'lucide-react'; 
import * as LucideIcons from 'lucide-react'; 
import { useFinance } from '../contexts/FinanceContext';
import { format, subMonths, addMonths, subYears, addYears, isSameMonth, parseISO, startOfYear, endOfYear, isWithinInterval, getMonth } from 'date-fns';
import { TourManager } from '../lib/TourManager';
import { cn } from '../lib/utils';
import TransactionForm from './TransactionForm';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'; 

export default function TransactionList({ type = 'expense', onNavigate }) {
  const { transactions, deleteTransaction, formatCurrency, categories, t } = useFinance();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('list'); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // --- TUTORIAL TRIGGER ---
  useEffect(() => {
    const tourKey = type === 'expense' ? 'expenses' : type;
    TourManager.run(tourKey, onNavigate, t, { setTab: setActiveTab });
    return () => TourManager.cleanup();
  }, [type]);

  // --- NEW: AUTO-REFRESH DATE ON TAB SWITCH ---
  // This ensures that when you switch from Analysis (Yearly) back to List (Monthly),
  // you aren't stuck in a random year with no data. It resets to "Today".
  useEffect(() => {
    setCurrentDate(new Date());
  }, [activeTab]);

  // All possible categories for this tab (income or expense)
  const allCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  // All transactions in the currently viewed month (LIST VIEW)
  const monthlyTransactions = useMemo(() => {
    return transactions
      .filter(t => t.type === type)
      .filter(t => isSameMonth(parseISO(t.date), currentDate));
  }, [transactions, currentDate, type]);

  // Filtered transactions based on selected category (LIST VIEW)
  const filteredTransactions = useMemo(() => {
    return monthlyTransactions
      .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [monthlyTransactions, selectedCategory]);

  const totalAmount = filteredTransactions.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  // Only show categories that have at least one transaction in the current month
  const activeCategories = useMemo(() => {
    const activeCategoryNames = new Set(monthlyTransactions.map(t => t.category));
    return allCategories.filter(cat => activeCategoryNames.has(cat.name));
  }, [monthlyTransactions, allCategories]);

  // --- ANALYSIS DATA CALCULATION ---
  const analysisData = useMemo(() => {
    // 1. Get all transactions for the current year
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    
    const yearlyTransactions = transactions.filter(t => 
        t.type === type && 
        isWithinInterval(parseISO(t.date), { start: yearStart, end: yearEnd })
    );

    // 2. Calculate Total Yearly
    const totalYearly = yearlyTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);

    // 3. Calculate Avg Monthly (Simple Average over 12 months)
    const avgMonthly = totalYearly / 12;

    // 4. Build Chart Data (Sum per month)
    const chartData = Array.from({ length: 12 }, (_, i) => ({
        name: format(new Date(currentDate.getFullYear(), i, 1), 'MMM'), // Jan, Feb...
        fullMonth: format(new Date(currentDate.getFullYear(), i, 1), 'MMMM'), // January...
        value: 0,
        index: i
    }));

    yearlyTransactions.forEach(t => {
        const monthIndex = getMonth(parseISO(t.date));
        if (chartData[monthIndex]) {
            chartData[monthIndex].value += parseFloat(t.amount);
        }
    });

    return { totalYearly, avgMonthly, chartData };
  }, [transactions, currentDate, type]);


  const handleAddNew = () => { 
    setEditingItem(null); 
    setIsFormOpen(true); 
  };

  const handleEdit = (item) => {
    setSelectedItem(null);
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm(t('confirm_delete'))) {
      deleteTransaction(id);
      setSelectedItem(null);
    }
  };

  // --- NAVIGATION HANDLERS ---
  const handlePrevDate = () => {
    if (activeTab === 'analysis') {
        setCurrentDate(prev => subYears(prev, 1));
    } else {
        setCurrentDate(prev => subMonths(prev, 1));
    }
  };

  const handleNextDate = () => {
    if (activeTab === 'analysis') {
        setCurrentDate(prev => addYears(prev, 1));
    } else {
        setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  return (
    <div className="h-full flex flex-col pb-20 animate-in fade-in relative tour-page-title">
      
      {/* HEADER: Conditional Logic for Month vs Year */}
      <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 tour-list-months">
        <button 
          onClick={handlePrevDate} 
          className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
        
        <h2 className="font-bold text-slate-700 dark:text-white text-lg ">
            {activeTab === 'analysis' 
                ? format(currentDate, 'yyyy') // Analysis View: Year Only
                : `${t('month_' + format(currentDate, 'MMMM').toLowerCase())} ${format(currentDate, 'yyyy')}` // List View: Month + Year
            }
        </h2>

        <button 
         onClick={handleNextDate} 
          className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"
        >
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* --- TAB SWITCHER --- */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
        <button onClick={() => setActiveTab('list')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'list' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500")}>
            {t('list_tab')}
        </button>
        <button onClick={() => setActiveTab('analysis')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'analysis' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500")}>
            {t('analysis_tab')}
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      {activeTab === 'list' ? (
        <>
            {/* Total Card */}
            <div className={cn("p-6 rounded-3xl mb-4 text-white shadow-lg transition-colors tour-list-total", 
                type === 'income' ? "bg-emerald-500 shadow-cyan-500/50" : "bg-blue-600 shadow-blue-500/50" 
            )}>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">
                {selectedCategory === 'All' 
                    ? (type === 'income' ? t('total_income') : t('total_expenses')) 
                    : `${selectedCategory} ${t('total')}`}
                </p>
                <h1 className="text-4xl font-black tracking-tight">{formatCurrency(totalAmount)}</h1>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar -mx-2 px-2 tour-list-filters">
                <button 
                onClick={() => setSelectedCategory('All')}
                className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xl border",
                    selectedCategory === 'All' 
                    ? (type === 'income' ? "bg-emerald-600 text-white border-emerald-600" : "bg-blue-600 text-white border-blue-600")
                    : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                )}
                >
                {t('all')}
                </button>

                {activeCategories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xl border flex items-center gap-2",
                    selectedCategory === cat.name
                        ? (type === 'income' ? "bg-emerald-600 text-white border-emerald-600" : "bg-blue-800 text-white border-blue-600")
                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    )}
                >
                    <div 
                    className={cn("w-2 h-2 rounded-full", selectedCategory === cat.name ? "bg-white" : "")} 
                    style={{ backgroundColor: selectedCategory === cat.name ? undefined : cat.color }} 
                    />
                    {cat.name}
                </button>
                ))}
            </div>

            {/* Transaction List */}
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
                    
                    const familyId = t.recurringId || (t.isRecurring ? t.id : null);
                    const parent = familyId ? transactions.find(tx => tx.id === familyId && tx.isRecurring) : null;
                    const frequency = parent?.frequency || t.frequency;

                    const freqDisplay = frequency ? {
                    weekly: 'Weekly',
                    biweekly: 'Bi-Weekly',
                    monthly: 'Monthly',
                    yearly: 'Yearly'
                    }[frequency] : null;

                    return (
                    <div 
                        key={t.id} 
                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 flex shadow-lg items-center justify-between group active:scale-98 transition-transform"
                    >
                        <div className="flex items-center gap-4">
                        <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-xl" 
                            style={{ backgroundColor: cat.color || '#94a3b8' }}
                        >
                            <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">{t.category}</h3>
                            <p className="text-slate-900 dark:text-white">{t.notes}</p>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-2 flex-wrap">
                            {format(parseISO(t.date), 'MMM dd')}
                            {freqDisplay && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-purple-600 bg-purple-50 dark:bg-purple-900/30">
                                {freqDisplay}
                                </span>
                            )}
                            </p>
                        </div>
                        </div>
                        <div className="text-right">
                        <span className={cn("block font-black text-lg", 
                            type === 'income' ? "text-emerald-500" : "text-slate-900 dark:text-white"
                        )}>
                            {type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                        <div className="flex gap-3 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(t)} className="text-blue-400 hover:text-blue-600">
                            <Edit2 className="w-4 h-4"/>
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500">
                            <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                        </div>
                    </div>
                    );
                })
                )}
            </div>

            {/* Floating Add Button (Only on List View) */}
            <button 
                onClick={handleAddNew} 
                className={cn(
                "fixed bottom-32 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-transform active:scale-90 z-[60] flex items-center gap-2 font-bold tour-add-btn", 
                type === 'income' ? "bg-emerald-500 shadow-emerald-500/40" : "bg-blue-600 shadow-blue-600/40"
                )}
            >
                <Plus className="w-8 h-8" />
            </button>
        </>
      ) : (
        // --- ANALYSIS VIEW ---
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            {/* Total Yearly Balance Card */}
            <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 tour-YearlyTotal">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{t('balance')}</p>
                <h1 className={cn("text-4xl font-black", type === 'income' ? "text-emerald-500" : "text-slate-900 dark:text-white")}>
                    {formatCurrency(analysisData.totalYearly)}
                </h1>
                <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-100 dark:bg-slate-700 inline-block px-3 py-1 rounded-full">
                    {format(currentDate, 'yyyy')}
                </p>
            </div>

            {/* Averages Cards */}
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

            {/* Bar Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 tour-YearlyDetail">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-900 dark:text-white">{t('yearly_detail')}</h3>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysisData.chartData}>
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-slate-900 text-white text-xs p-2 rounded-lg shadow-xl">
                                                <p className="font-bold mb-1">{payload[0].payload.fullMonth}</p>
                                                <p>{formatCurrency(payload[0].value)}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#94a3b8'}} 
                                dy={10}
                            />
                            <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20}>
                                {analysisData.chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={type === 'income' ? '#10B981' : '#3B82F6'} 
                                        opacity={entry.value > 0 ? 1 : 0.1} // Dim months with no data
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* Form Modal */}
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