import React, { useState, useMemo } from 'react';
import { Moon, Sun, Globe, DollarSign, Plus, Trash2, Edit2, Check, Bell, ChevronLeft, ChevronRight, CreditCard, RefreshCw, Smartphone, Brain, DownloadCloud, AlertTriangle, Tag, Filter } from 'lucide-react'; // Fixed: Added Filter
import * as LucideIcons from 'lucide-react'; // Added to map icon strings to components
import { useFinance } from '../contexts/FinanceContext';
import { format, subMonths, addMonths, isSameMonth, parseISO } from 'date-fns';

import { cn } from '../lib/utils';
import TransactionForm from './TransactionForm';

export default function TransactionList({ type = 'expense' }) {
  const { transactions, deleteTransaction, formatCurrency, categories, t } = useFinance();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // All possible categories for this tab (income or expense)
  const allCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  // All transactions in the currently viewed month
  const monthlyTransactions = useMemo(() => {
    return transactions
      .filter(t => t.type === type)
      .filter(t => isSameMonth(parseISO(t.date), currentDate));
  }, [transactions, currentDate, type]);

  // Filtered transactions based on selected category
  const filteredTransactions = useMemo(() => {
    return monthlyTransactions
      .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [monthlyTransactions, selectedCategory]);

  const totalAmount = filteredTransactions.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  // NEW: Only show categories that have at least one transaction in the current month
  const activeCategories = useMemo(() => {
    // Get unique category names from current month's transactions
    const activeCategoryNames = new Set(monthlyTransactions.map(t => t.category));
    
    // Return only the full category objects that match those names
    return allCategories.filter(cat => activeCategoryNames.has(cat.name));
  }, [monthlyTransactions, allCategories]);

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

  return (
    <div className="h-full flex flex-col pb-20 animate-in fade-in relative">
      
      {/* Month Navigation */}
      <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
        <button 
          onClick={() => setCurrentDate(prev => subMonths(prev, 1))} 
          className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
        <h2 className="font-bold text-slate-700 dark:text-white text-lg">
      {t('month_' + format(currentDate, 'MMMM').toLowerCase())} {format(currentDate, 'yyyy')}
        </h2>
        <button 
         onClick={() => setCurrentDate(prev => addMonths(prev, 1))} 
          className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"
        >
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Total Card */}
      <div className={cn("p-6 rounded-3xl mb-4 text-white shadow-lg transition-colors", 
        type === 'income' ? "bg-emerald-500 shadow-cyan-500/50" : "bg-blue-600 shadow-blue-500/50" 
      )}>
        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">
          {selectedCategory === 'All' 
            ? (type === 'income' ? t('total_income') : t('total_expenses')) 
            : `${selectedCategory} ${t('total')}`}
        </p>
        <h1 className="text-4xl font-black tracking-tight">{formatCurrency(totalAmount)}</h1>
      </div>

      {/* Category Filter Chips — Only active ones + "All" */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar -mx-2 px-2">
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
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Filter className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-bold opacity-50">{t('no_transactions_found')}</p>
          </div>
        ) : (
          filteredTransactions.map(t => {
            const cat = categories.find(c => c.name === t.category) || {};
            const IconComponent = LucideIcons[cat.icon] || Tag; // Resolved icon component
             
            // Frequency badge logic
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
                  {/* Changed from charAt(0) to IconComponent */}
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

      {/* Floating Add Button */}
      <button 
        onClick={handleAddNew} 
        className={cn(
          "fixed bottom-32 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-transform active:scale-90 z-[60] flex items-center gap-2 font-bold", 
          type === 'income' ? "bg-emerald-500 shadow-emerald-500/40" : "bg-blue-600 shadow-blue-600/40"
        )}
      >
        <Plus className="w-8 h-8" />
      </button>

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