import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Calendar, Repeat, AlignLeft, Check, Clock } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { cn } from '../lib/utils';
import * as LucideIcons from 'lucide-react';

export default function TransactionForm({ type, existingData, onClose }) {
const { addTransaction, updateTransaction, categories, transactions, t } = useFinance();

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // --- NEW RECURRING STATE ---
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly'); // Default to monthly

  const isExpense = type === 'expense';
  const availableCategories = categories.filter(c => c.type === type);

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

 const handleSave = async () => {
    if (!amount || !categoryId || !date) {
      alert(t('fill_required'));
      return;
    }

    const transactionData = {
      amount,
      category: categories.find(c => c.id === categoryId)?.name,
      categoryId: categoryId,
      date: date, 
      notes,
      isRecurring,
      frequency: isRecurring ? frequency : null,
      type
    };

    // --- LOGIC: HANDLE SPLIT (Versioning) ---
 if (existingData && existingData.splitFromId) {
        // Find old master
        const oldMaster = transactions.find(t => t.id === existingData.splitFromId);
        
        if (oldMaster) {
            // Stop old master YESTERDAY
            const newStartDate = parseISO(date);
            const stopDate = subDays(newStartDate, 1);
            
            await updateTransaction(oldMaster.id, {
                ...oldMaster,
                endDate: stopDate.toISOString()
            });
        }

        // Add NEW transaction
        await addTransaction(transactionData);

    } 
    else if (existingData && existingData.id) {
        await updateTransaction(existingData.id, transactionData);
    } 
    else {
        await addTransaction(transactionData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 dark:bg-slate-900 flex-col animate-in slide-in-from-bottom duration-200">
      
      {/* Header */}
      <div className="px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0 safe-top">
        <button onClick={onClose} className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
          <ChevronLeft className="w-5 h-5 mr-1" /> {t('back')}
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
          {existingData ? t('edit') : t('new')} {type === 'income' ? t('income') : t('expense')}
        </h2>
        <div className="w-16" />
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-5 pb-32">
        {/* Amount */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t('amount')}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl text-3xl font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-blue-500 outline-none shadow-xl"
              autoFocus
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t('category')}</label>
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
                  <div className="w-10 h-4 rounded-full flex items-center justify-center mb-1 text-white shadow-xl"
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
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t('start_date')}</label>
          <div className="relative">
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white outline-none shadow-xl"
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5"/>
          </div>
        </div>

        {/* Recurring Toggle */}
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Repeat className="w-5 h-5"/></div>
                  <span className="font-bold text-slate-700 dark:text-white">{t('recurring')}</span>
                </div>
                <div 
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={cn("w-12 h-7 rounded-full transition-colors relative cursor-pointer", isRecurring ? "bg-blue-500" : "bg-slate-300")}
                >
                  <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-xl", isRecurring ? "left-6" : "left-1")} />
                </div>
            </div>

            {/* --- FREQUENCY DROPDOWN (Conditionally Rendered) --- */}
            {isRecurring && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t('how_often')}</label>
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
                                    {opt === 'biweekly' ? t('biweekly') : t(opt)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            {frequency === 'weekly' && t('freq_weekly_hint')}
                            {frequency === 'biweekly' && t('freq_biweekly_hint')}
                            {frequency === 'monthly' && t('freq_monthly_hint')}
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t('notes')}</label>
          <div className="relative">
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('add_note')}
              rows="3"
              className="w-full p-4 pl-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-white outline-none resize-none shadow-xl"
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
          {t('save')}
        </button>
      </div>

    </div>
  );
}