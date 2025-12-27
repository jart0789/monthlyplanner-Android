import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Filter, X, Edit2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { format, isSameMonth, isSameWeek, subMonths, parseISO } from 'date-fns';
import { useFinance } from '../contexts/FinanceContext';
import TransactionForm from './TransactionForm';

export default function TransactionList({ type }) {
  const { transactions, deleteTransaction, formatCurrency, categories, t } = useFinance();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState('This Month'); 

  const isExpense = type === 'expense';

  // --- FILTER LOGIC ---
  const visibleTransactions = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(tr => {
        if (tr.type !== type) return false;
        const txDate = parseISO(tr.date);
        
        if (timeFilter === 'This Week') return isSameWeek(txDate, now, { weekStartsOn: 1 });
        if (timeFilter === 'This Month') return isSameMonth(txDate, now);
        if (timeFilter === 'Last 6 Months') return txDate >= subMonths(now, 6);
        
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, type, timeFilter]);

  const getCategoryStyles = (transaction) => {
    let cat = categories.find(c => c.id === transaction.categoryId);
    if (!cat && transaction.category) {
      cat = categories.find(c => c.name === transaction.category);
    }
    const iconName = cat?.icon || 'Tag'; 
    const Icon = LucideIcons[iconName] ? LucideIcons[iconName] : LucideIcons.Tag;
    const color = cat?.color || '#94a3b8';
    
    return { Icon, color };
  };

  const handleAddNew = () => { setEditingItem(null); setIsFormOpen(true); };

  const handleEdit = (item) => {
    setSelectedItem(null);
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this?')) {
      deleteTransaction(id);
      setSelectedItem(null);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-slate-900 py-4 z-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{t(type === 'income' ? 'income' : 'expenses')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg border ${showFilters ? 'bg-blue-100 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>
             <Filter className="w-5 h-5" />
          </button>
          <button onClick={handleAddNew} className={`p-2 text-white rounded-lg shadow-md ${isExpense ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2">
           <p className="text-xs font-bold text-slate-400 uppercase mb-2">Time Period</p>
           <div className="flex gap-2">
             {['This Week', 'This Month', 'Last 6 Months'].map(f => (
               <button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${timeFilter === f ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                 {f}
               </button>
             ))}
           </div>
        </div>
      )}

      {/* List Rendering */}
      <div className="space-y-3">
        {visibleTransactions.length === 0 ? (
           <p className="text-center text-slate-400 py-10">No transactions found.</p>
        ) : (
           visibleTransactions.map(tr => {
              const { Icon, color } = getCategoryStyles(tr);
              
              return (
                <div 
                  key={tr.id} 
                  onClick={() => setSelectedItem(tr)} 
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      {/* Category Name */}
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {categories.find(c => c.id === tr.categoryId)?.name || tr.category || "Uncategorized"}
                      </span>
                      
                      {/* --- NEW: Show Notes Below Category --- */}
                      {tr.notes && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5 line-clamp-1 italic">
                          {tr.notes}
                        </span>
                      )}

                      {/* Date */}
                      <span className="text-xs text-slate-400">{format(parseISO(tr.date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className={`block font-bold ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                       {isExpense ? '-' : '+'}{formatCurrency(tr.amount)}
                     </span>
                  </div>
                </div>
              );
           })
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedItem(null)}>
           <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Details</h3>
                <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-4 h-4"/></button>
              </div>

              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50">
                 <h1 className={`text-4xl font-black mb-2 ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                   {formatCurrency(selectedItem.amount)}
                 </h1>
                 <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                   {categories.find(c => c.id === selectedItem.categoryId)?.name || selectedItem.category}
                 </span>
              </div>

              <div className="p-6 space-y-4">
                 <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-sm text-slate-500">Date</span>
                    <span className="font-bold text-slate-900 dark:text-white">{format(parseISO(selectedItem.date), 'MMMM dd, yyyy')}</span>
                 </div>
                 {selectedItem.notes && (
                   <div className="pt-2">
                      <span className="text-xs text-slate-400 uppercase font-bold block mb-2">Notes</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{selectedItem.notes}</p>
                   </div>
                 )}
              </div>

              <div className="p-4 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                 <button 
                   onClick={() => handleEdit(selectedItem)} 
                   className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                 >
                   <Edit2 className="w-4 h-4" /> Edit
                 </button>
                 <button 
                   onClick={() => handleDelete(selectedItem.id)} 
                   className="flex-1 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-rose-100"
                 >
                   <Trash2 className="w-4 h-4" /> Delete
                 </button>
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