import React, { useState, useMemo, useEffect } from 'react';
import { CreditCard, Landmark, Plus, Trash2, X, History, Pencil, ChevronDown } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { format, parseISO, isSameDay, addMonths, isAfter } from 'date-fns';
import CreditStepper from './CreditStepper';

// --- DETAIL MODAL ---
const CreditDetailModal = ({ credit, onClose, onDelete, formatCurrency }) => {
  const { recordCreditPayment } = useFinance(); // Hook for recording payment
  const limit = parseFloat(credit.limit || credit.totalAmount || 1);
  const balance = parseFloat(credit.currentBalance || 0);
  const progress = limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
  
  const [payAmount, setPayAmount] = useState('');

  const handlePayment = () => {
    if (!payAmount) return;
    const amount = parseFloat(payAmount);

    // VALIDATION: Manual Payment vs Balance
    if (amount > balance) {
        alert(`Error: Payment amount (${formatCurrency(amount)}) cannot exceed current balance (${formatCurrency(balance)}).`);
        return;
    }

    recordCreditPayment(credit.id, payAmount, new Date().toISOString(), 'Manual Payment');
    setPayAmount('');
    onClose(); // Close modal after payment
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
       <div 
         className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom" 
         onClick={e => e.stopPropagation()} 
         style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
       >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
             <div>
                <h2 className="font-bold text-xl text-slate-900 dark:text-white">{credit.name}</h2>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{credit.type === 'loan' ? 'Loan Account' : 'Credit Card'}</p>
             </div>
             <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
          </div>

          <div className="overflow-y-auto p-6 space-y-6">
             {/* Progress Bar */}
             <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                   <span className="text-slate-500">Utilization</span>
                   <span className={cn(progress > 30 ? "text-rose-500" : "text-emerald-500")}>{Math.round(progress)}%</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                   <div className={cn("h-full transition-all duration-1000 ease-out", progress > 30 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-medium mt-1">
                   <span>{formatCurrency(balance)} Owed</span>
                   <span>{formatCurrency(limit)} Limit</span>
                </div>
             </div>

             {/* Quick Actions */}
             <div className="grid grid-cols-2 gap-3">
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <p className="text-xs text-blue-400 font-bold uppercase mb-1">Min Payment</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(credit.minPayment)}</p>
                    <p className="text-xs text-blue-400/70 mt-1">Due {credit.dueDate ? format(parseISO(credit.dueDate), 'MMM dd') : 'N/A'}</p>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">APR</p>
                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{credit.interestRate}%</p>
                    <p className="text-xs text-slate-400 mt-1">Interest Rate</p>
                 </div>
             </div>
             
             {/* Make Payment */}
             <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="font-bold text-sm text-slate-700 dark:text-white mb-3">Record Payment</p>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <span className="absolute left-3 top-3 text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500 font-bold"
                        placeholder="Amount"
                      />
                   </div>
                   <button 
                     onClick={handlePayment}
                     disabled={!payAmount}
                     className="bg-emerald-500 text-white px-6 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                   >
                     Pay
                   </button>
                </div>
             </div>

             {/* History */}
             <div>
                <p className="font-bold text-sm text-slate-700 dark:text-white mb-3">Recent History</p>
                {credit.history && credit.history.length > 0 ? (
                    <div className="space-y-2">
                        {credit.history.slice().reverse().map((h, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm">
                                <span className="text-slate-500">{format(parseISO(h.date), 'MMM dd, yyyy')}</span>
                                <span className="font-bold text-emerald-600">-{formatCurrency(h.amount)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">No payment history yet.</p>
                )}
             </div>

             {/* Delete */}
             <button 
               onClick={onDelete}
               className="w-full py-4 rounded-xl text-rose-500 bg-rose-50 dark:bg-rose-900/20 font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
             >
                <Trash2 className="w-4 h-4" /> Delete Account
             </button>
          </div>
       </div>
    </div>
  );
};

export default function Credits() {
  const { credits, formatCurrency, deleteCredit } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);

  const handleEditClick = (credit) => {
      setEditingCredit(credit);
      setIsAdding(true);
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Credits & Loans</h1>
        <button onClick={() => setIsAdding(true)} className="p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-90">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        {credits.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                <p>No credit cards or loans yet.</p>
            </div>
        ) : credits.map(c => {
           const limit = parseFloat(c.limit || c.totalAmount || 1);
           const balance = parseFloat(c.currentBalance || 0);
           const progress = limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
           
           return (
            <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-xl", c.type === 'loan' ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-600")}>
                    {c.type === 'loan' ? <Landmark className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{c.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{c.type === 'loan' ? 'Loan' : 'Credit Card'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-0.5">Current Balance</p>
                  <p className="font-black text-xl text-slate-900 dark:text-white">{formatCurrency(c.currentBalance)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 relative z-10 mb-4">
                 <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>{Math.round(progress)}% Used</span>
                    <span>{formatCurrency(limit - balance)} Available</span>
                 </div>
                 <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-1000", progress > 90 ? "bg-rose-500" : progress > 50 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${progress}%` }} />
                 </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-2 relative z-10 mt-2">
                 <button onClick={() => setSelectedCredit(c)} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm">
                    View & Pay
                 </button>
                 <button onClick={() => handleEditClick(c)} className="p-3 bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 hover:text-blue-600 text-slate-500 rounded-xl transition-colors">
                   <Pencil className="w-5 h-5" />
                 </button>
              </div>
            </div>
           );
        })}
      </div>

      {isAdding && (
          <CreditStepper 
              onClose={() => { setIsAdding(false); setEditingCredit(null); }} 
              initialData={editingCredit}
          />
      )}

      {selectedCredit && (
          <CreditDetailModal 
             credit={selectedCredit} 
             onClose={() => setSelectedCredit(null)} 
             onDelete={() => { deleteCredit(selectedCredit.id); setSelectedCredit(null); }}
             formatCurrency={formatCurrency}
          />
      )}
    </div>
  );
}