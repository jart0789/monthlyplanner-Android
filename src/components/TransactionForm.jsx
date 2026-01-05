import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Calendar, Repeat, AlignLeft, Check, Clock } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { cn } from '../lib/utils';
import * as LucideIcons from 'lucide-react';

export default function TransactionForm({ type, existingData, onClose }) {
  const { addTransaction, updateTransaction, categories } = useFinance();

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // --- NEW RECURRING STATE ---
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly'); // Default to monthly

  const isExpense = type === 'expense';
  const availableCategories = categories.filter(c => c.type === type);

// In state
const [endDate, setEndDate] = useState('');

// In form
<div className="mb-6">
  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">End Date (Optional)</label>
  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-white outline-none" />
</div>

// In handleSave, add to transactionData
endDate: endDate ? new Date(endDate).toISOString() : null
  
  useEffect(() => {
    if (existingData) {
      setAmount(existingData.amount);
      // Try to find category by ID or Name
      const cat = categories.find(c => c.id === existingData.categoryId) || categories.find(c => c.name === existingData.category);
      if (cat) setCategoryId(cat.id);
      
      setDate(existingData.date ? existingData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setNotes(existingData.notes || '');
      setIsRecurring(existingData.isRecurring || false);
      setFrequency(existingData.frequency || 'monthly');
    }
  }, [existingData, categories]);

  const handleSave = () => {
    if (!amount || !categoryId) {
      alert("Please enter an amount and select a category");
      return;
    }

    const selectedCategory = categories.find(c => c.id === categoryId);
    
    const transactionData = {
      amount: parseFloat(amount),
      // Save ID for robustness, Name for legacy support
      categoryId: selectedCategory?.id, 
      category: selectedCategory ? selectedCategory.name : 'Uncategorized',
      type: type,
      date: new Date(date).toISOString(),
      notes,
      isRecurring,
      // Save the frequency only if recurring is true
      frequency: isRecurring ? frequency : null 
    };

    if (existingData) {
      updateTransaction(existingData.id, transactionData);
    } else {
      addTransaction(transactionData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-200">
      
      {/* Header */}
      <div className="px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0 safe-top">
        <button onClick={onClose} className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
          {existingData ? 'Edit' : 'New'} {type === 'income' ? 'Income' : 'Expense'}
        </h2>
        <div className="w-16" />
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-5 pb-32">
        {/* Amount */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl text-3xl font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 outline-none shadow-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Category</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {availableCategories.map(cat => {
              const IconTag = LucideIcons[cat.icon] || LucideIcons.Tag;
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800"
                  )}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1 text-white shadow-sm"
                       style={{ backgroundColor: isSelected ? '#3B82F6' : (cat.color || '#94a3b8') }}>
                    {isSelected ? <Check className="w-5 h-5"/> : <IconTag className="w-5 h-5"/>}
                  </div>
                  <span className={cn("text-[10px] font-bold truncate w-full text-center", isSelected ? "text-blue-600" : "text-slate-500")}>
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Due Date</label>
          <div className="relative">
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white outline-none shadow-sm"
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5"/>
          </div>
        </div>

        {/* Recurring Toggle */}
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Repeat className="w-5 h-5"/></div>
                  <span className="font-bold text-slate-700 dark:text-white">Recurring</span>
                </div>
                <div 
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={cn("w-12 h-7 rounded-full transition-colors relative cursor-pointer", isRecurring ? "bg-blue-500" : "bg-slate-300")}
                >
                  <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", isRecurring ? "left-6" : "left-1")} />
                </div>
            </div>

            {/* --- FREQUENCY DROPDOWN (Conditionally Rendered) --- */}
            {isRecurring && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">How Often?</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['weekly', 'biweekly', 'monthly'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setFrequency(opt)}
                                    className={cn(
                                        "py-2 rounded-lg text-xs font-bold capitalize border transition-all",
                                        frequency === opt 
                                            ? "bg-blue-600 text-white border-blue-600" 
                                            : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                                    )}
                                >
                                    {opt === 'biweekly' ? 'Bi-Weekly' : opt}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            {frequency === 'weekly' && "Multiplies amount by 4 for monthly stats."}
                            {frequency === 'biweekly' && "Multiplies amount by 2 for monthly stats."}
                            {frequency === 'monthly' && "Counts once per month."}
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Notes</label>
          <div className="relative">
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              rows="3"
              className="w-full p-4 pl-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-white outline-none resize-none shadow-sm"
            />
            <AlignLeft className="absolute left-3 top-5 text-slate-400 w-5 h-5"/>
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-bottom">
        <button 
          onClick={handleSave}
          className={cn(
            "w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-2",
            isExpense ? "bg-rose-600" : "bg-emerald-600"
          )}
        >
          <Save className="w-5 h-5" />
          Save
        </button>
      </div>

    </div>
  );
}