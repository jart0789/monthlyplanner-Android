import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { X, Check } from 'lucide-react';

export default function PaymentForm({ creditName, monthlyPayment, onSubmit, onCancel }) {
  const { t } = useFinance();
  const [amount, setAmount] = useState(monthlyPayment || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount) return;
    onSubmit(amount, date, notes);
  };

  return (
    <div className="p-6">
       <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('record_payment_for', { name: creditName })}</h3>
       
       <form onSubmit={handleSubmit} className="space-y-4">
         <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('amount')}</label>
           <input 
             type="number" 
             value={amount}
             onChange={e => setAmount(e.target.value)}
             className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none"
             placeholder="0.00"
             autoFocus
           />
         </div>

         <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('date')}</label>
           <input 
             type="date" 
             value={date}
             onChange={e => setDate(e.target.value)}
             className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none"
           />
         </div>

         <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('notes')}</label>
           <textarea 
             value={notes}
             onChange={e => setNotes(e.target.value)}
             className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none resize-none"
             rows={2}
           />
         </div>

         <div className="flex gap-2 mt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-white rounded-xl font-bold">{t('cancel')}</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">{t('save_payment')}</button>
         </div>
       </form>
    </div>
  );
}