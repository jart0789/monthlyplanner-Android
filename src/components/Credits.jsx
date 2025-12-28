import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '../lib/utils';
import { CreditCard, Landmark, Plus, Trash2, X, History, Pencil, ChevronDown } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { format, parseISO, isSameDay, addMonths, isAfter } from 'date-fns';
import CreditStepper from './CreditStepper';

// --- DETAIL MODAL ---
const CreditDetailModal = ({ credit, onClose, onDelete, formatCurrency }) => {
  const { recordCreditPayment } = useFinance();
  const limit = parseFloat(credit.limit || credit.totalAmount || 1);
  const balance = parseFloat(credit.currentBalance || 0);
  const progress = limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
  
  const [payAmount, setPayAmount] = useState('');

  // VALIDATION: Prevent payment > balance
  const handlePayment = () => {
    if (!payAmount) return;
    const amount = parseFloat(payAmount);

    if (amount > balance) {
        alert(`Error: Payment amount (${formatCurrency(amount)}) cannot exceed current balance (${formatCurrency(balance)}).`);
        return;
    }

    recordCreditPayment(credit.id, payAmount, new Date().toISOString(), 'Manual Payment');
    setPayAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
       <div 
         className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom" 
         onClick={e => e.stopPropagation()} 
         style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
       >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{credit.name}</h3>
              <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-500 uppercase font-bold">{credit.type}</span>
                 {credit.autopay && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">AUTOPAY ON</span>}
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => { if(confirm('Delete?')) { onDelete(credit.id); onClose(); } }} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-full"><Trash2 className="w-4 h-4"/></button>
               <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-4 h-4"/></button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto">
             <div className="text-center mb-6">
                <span className="text-sm text-slate-400 font-bold uppercase">Current Balance</span>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(balance)}</h1>
                <div className="mt-4 w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500 font-bold">
                    <span>0%</span>
                    <span>{progress.toFixed(0)}% Utilization</span>
                </div>
             </div>

             <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">Payment History</h4>
                <div className="space-y-2">
                  {(!credit.history || credit.history.length === 0) ? (
                    <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">No payments yet</p>
                  ) : (
                    credit.history.slice().reverse().map((h, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div>
                           <span className="font-bold text-emerald-600 block text-sm">{h.note || 'Payment'}</span>
                           <span className="text-xs text-slate-400">{format(parseISO(h.date), 'MMM dd, yyyy')}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(h.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default function Credits() {
  const { credits, deleteCredit, updateCredit, formatCurrency, t } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null); // --- NEW: Track editing item
  const [selectedCredit, setSelectedCredit] = useState(null);

  // --- 1. HANDLE MANUAL PAYMENTS ---
  const processManualPayment = (credit, amount, note) => {
    const currentBalance = parseFloat(credit.currentBalance || 0);
    if (currentBalance < amount || amount <= 0) {
       alert(`Error: Payment amount (${formatCurrency(amount)}) cannot exceed current balance (${formatCurrency(currentBalance)}).`);
      return;
    }
    let newBalance = currentBalance - amount;
    if (newBalance < 0) newBalance = 0;

    const newHistory = [
        ...(credit.history || []),
        { amount: amount, date: new Date().toISOString(), note: note }
    ];

    updateCredit({
        ...credit,
        currentBalance: newBalance,
        history: newHistory
    });
  };

  // --- 2. HANDLE AUTOPAY ---
  const processAutopay = (credit) => {
    const currentBalance = parseFloat(credit.currentBalance || 0);
    const apr = parseFloat(credit.interestRate || credit.apr || 0);
    const minPayment = parseFloat(credit.minPayment || 0);
    const monthlyInterest = (currentBalance * (apr / 100)) / 12;

    let newBalance = (currentBalance + monthlyInterest) - minPayment;
    if (newBalance < 0) newBalance = 0;

    const newDueDate = addMonths(parseISO(credit.dueDate), 1).toISOString();
    const newHistory = [
        ...(credit.history || []),
        { amount: minPayment, date: new Date().toISOString(), note: 'Autopay' }
    ];

    updateCredit({
        ...credit,
        currentBalance: newBalance,
        dueDate: newDueDate,
        history: newHistory
    });
  };

  // --- CHECK FOR AUTOPAY DUE DATE ---
  useEffect(() => {
    const checkAutopay = () => {
      const today = new Date();
      credits.forEach(credit => {
        if (!credit.autopay || !credit.dueDate) return;
        const dueDate = parseISO(credit.dueDate);
        const isDue = isSameDay(today, dueDate) || isAfter(today, dueDate);
        
        if (isDue) {
            const alreadyPaidToday = credit.history?.some(h => 
                isSameDay(parseISO(h.date), today) && h.note === 'Autopay'
            );
            if (!alreadyPaidToday) {
                processAutopay(credit);
            }
        }
      });
    };
    checkAutopay();
  }, [credits]);

  const stats = useMemo(() => {
    const totalDebt = credits.reduce((acc, c) => acc + (parseFloat(c.currentBalance || c.totalAmount) || 0), 0);
    const monthlyCommitment = credits.reduce((acc, c) => acc + (parseFloat(c.minPayment) || 0), 0);
    return { totalDebt, monthlyCommitment };
  }, [credits]);

  const handlePayClick = (credit) => {
    const label = credit.autopay ? `Enter EXTRA payment for ${credit.name}:` : `Enter payment for ${credit.name}:`;
    const defaultAmount = credit.autopay ? '' : credit.minPayment;
    const amountStr = prompt(label, defaultAmount);
    if (amountStr && !isNaN(parseFloat(amountStr))) {
      processManualPayment(credit, parseFloat(amountStr), credit.autopay ? 'Extra Payment' : 'Manual Payment');
    }
  };

  // --- NEW: Helper to open Edit Mode ---
  const handleEditClick = (credit) => {
      setEditingCredit(credit);
      setIsAdding(true);
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-center sticky top-0 bg-slate-50 dark:bg-slate-900 py-4 z-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('credits')}</h1>
        <button onClick={() => { setEditingCredit(null); setIsAdding(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg font-bold hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-500 mb-1">Total Debt</p>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.totalDebt)}</h2>
        </div>
        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-500 mb-1">Monthly Min</p>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.monthlyCommitment)}</h2>
        </div>
      </div>

      {/* Card List */}
      <div className="space-y-4">
        {credits.map(c => {
           const maxAmount = c.limit ? parseFloat(c.limit) : parseFloat(c.totalAmount || 1);
           const current = parseFloat(c.currentBalance || 0);
           const progressPercent = Math.min((current / maxAmount) * 100, 100).toFixed(0);
           const displayApr = c.interestRate || c.apr || 0;
           const displayname = c.name;
           return (
            <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-lg border border-slate-200 relative overflow-hidden">
              {c.autopay && (
                  <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/20">
                      AUTOPAY ACTIVE
                  </div>
              )}

              <div className="flex justify-between items-center mb-2 mt-2">
                <div>
                   <span className="text-slate-400 text-sm mr-2">Min Payment:</span>
                   <span className="text-Grey font-bold text-lg">{formatCurrency(c.minPayment)}</span>              
                </div>
                <div className="text-blue-500 font-bold text-lg mr-2">
                   {displayApr}% APR
                </div>
              </div>
                <div className="flex h-4 items-center mb-2 mt-4">
                   <span className="text-slate-400 text-sm mr-2">Name:</span>
                   <span className="mb-1 text-Grey font-bold text-lg">{displayname}</span>
               </div>
              <div className="flex h-2 justify-between items-end mb-2 mt-4">
                 <span className="text-slate-400 text-sm">Progress</span>
                 <span className="text-grey font-bold">{progressPercent}%</span>
              </div>

              <div className="w-full h-2 bg-slate-400 rounded-full overflow-hidden mb-6">
                 <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>

              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => handlePayClick(c)}
                   className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex flex-col items-center justify-center leading-none"
                 >
                   <span className="text-sm">{c.autopay ? 'Extra Payment' : 'Pay Now'}</span>
                   {c.autopay && <span className="text-[10px] opacity-80 font-normal">Autopay is On</span>}
                 </button>

                 <button onClick={() => setSelectedCredit(c)} className="flex items-center gap-1 bg-slate-400 hover:bg-slate-500 text-slate-900 font-semibold py-3 px-4 rounded-xl transition-colors h-[42px]">
                   <History className="w-4 h-4" />
                   <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                 </button>

                 <button onClick={() => handleEditClick(c)} className="p-3 bg-slate-400 hover:bg-slate-500 text-slate-900 rounded-xl transition-colors h-[42px] w-[42px] flex items-center justify-center">
                   <Pencil className="w-5 h-5" />
                 </button>

                 <button onClick={() => { if(confirm('Delete?')) deleteCredit(c.id); }} className="p-3 bg-slate-400 hover:bg-rose-900/30 text-slate-900 hover:text-rose-500 rounded-xl transition-colors h-[42px] w-[42px] flex items-center justify-center">
                   <Trash2 className="w-5 h-5" />
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
        <CreditDetailModal credit={selectedCredit} onClose={() => setSelectedCredit(null)} onDelete={deleteCredit} formatCurrency={formatCurrency} />
      )}
    </div>
  );
}