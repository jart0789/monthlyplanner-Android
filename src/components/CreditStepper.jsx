import React, { useState } from 'react';
import { CreditCard, Landmark, ChevronLeft, ChevronRight, Check, Calendar, DollarSign, Percent, X, RefreshCcw } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { cn } from '../lib/utils';

export default function CreditStepper({ onClose, initialData = null }) {
  const { addCredit, updateCredit } = useFinance();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'creditCard',
    totalAmount: initialData?.totalAmount || '',
    currentBalance: initialData?.currentBalance || '',
    interestRate: initialData?.interestRate || initialData?.apr || '',
    minPayment: initialData?.minPayment || '',
    dueDate: initialData?.dueDate ? initialData.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
    autopay: initialData?.autopay || false,
  });

  const handleNext = () => {
    // Step 1 Validation
    if (step === 1 && !formData.name) return alert("Please enter a name");

    // Step 2 Validation (Amounts)
    if (step === 2) {
        if (!formData.totalAmount || !formData.currentBalance) return alert("Please enter amounts");
        
        // VALIDATION: Balance vs Limit
        const limit = parseFloat(formData.totalAmount);
        const balance = parseFloat(formData.currentBalance);

        if (balance > limit) {
            return alert(`Error: Current balance ($${balance}) cannot be higher than the Credit Limit ($${limit}).`);
        }
    }
    
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleFinish = () => {
    // Step 3 Validation (Min Payment)
    const balance = parseFloat(formData.currentBalance);
    const minPayment = parseFloat(formData.minPayment || 0);

    if (minPayment > balance) {
        return alert(`Error: Minimum payment ($${minPayment}) cannot exceed the amount owed ($${balance}).`);
    }

    if (initialData) {
      updateCredit(initialData.id, formData);
    } else {
      addCredit(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
               {step}/3
             </div>
             <h2 className="font-bold text-lg text-slate-900 dark:text-white">
               {initialData ? 'Edit Credit' : 'Add New Credit'}
             </h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                <input 
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Chase Sapphire"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setFormData({...formData, type: 'creditCard'})}
                    className={cn("p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all", formData.type === 'creditCard' ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-100 dark:border-slate-700 hover:border-slate-200")}
                  >
                    <CreditCard className="w-6 h-6"/>
                    <span className="font-bold text-sm">Credit Card</span>
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, type: 'loan'})}
                    className={cn("p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all", formData.type === 'loan' ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-100 dark:border-slate-700 hover:border-slate-200")}
                  >
                    <Landmark className="w-6 h-6"/>
                    <span className="font-bold text-sm">Loan</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AMOUNTS */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
               <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                   {formData.type === 'loan' ? 'Original Loan Amount' : 'Total Credit Limit'}
                </label>
                <div className="relative">
                   <DollarSign className="absolute left-4 top-4 w-5 h-5 text-slate-400"/>
                   <input 
                    type="number"
                    inputMode="decimal"
                    value={formData.totalAmount}
                    onChange={e => setFormData({...formData, totalAmount: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                   Currently Owed (Balance)
                </label>
                <div className="relative">
                   <DollarSign className="absolute left-4 top-4 w-5 h-5 text-slate-400"/>
                   <input 
                    type="number"
                    inputMode="decimal"
                    value={formData.currentBalance}
                    onChange={e => setFormData({...formData, currentBalance: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">APR / Interest Rate</label>
                <div className="relative">
                   <Percent className="absolute left-4 top-4 w-5 h-5 text-slate-400"/>
                   <input 
                    type="number"
                    inputMode="decimal"
                    value={formData.interestRate}
                    onChange={e => setFormData({...formData, interestRate: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DATES & PAYMENT */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Minimum Monthly Payment</label>
                <div className="relative">
                   <DollarSign className="absolute left-4 top-4 w-5 h-5 text-slate-400"/>
                   <input 
                    type="number"
                    inputMode="decimal"
                    value={formData.minPayment}
                    onChange={e => setFormData({...formData, minPayment: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Next Due Date</label>
                <div className="relative">
                   <Calendar className="absolute left-4 top-4 w-5 h-5 text-slate-400"/>
                   <input 
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer" onClick={() => setFormData({...formData, autopay: !formData.autopay})}>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><RefreshCcw className="w-5 h-5"/></div>
                   <div>
                     <p className="font-bold text-sm text-slate-900 dark:text-white">Autopay Enabled</p>
                     <p className="text-xs text-slate-400">Receive notifications on payment day</p>
                   </div>
                </div>
                <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors", formData.autopay ? "bg-blue-600 border-blue-600" : "border-slate-300")}>
                   {formData.autopay && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Footer / Navigation */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-bottom">
        <div className="flex gap-3 max-w-md mx-auto">
          {step > 1 && (
            <button 
              onClick={handleBack}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
          )}
          
          {step < 3 ? (
             <button 
               onClick={handleNext}
               className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
             >
               Next Step <ChevronRight className="w-5 h-5" />
             </button>
          ) : (
             <button 
               onClick={handleFinish}
               className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
             >
               <Check className="w-5 h-5" /> Save {formData.type === 'loan' ? 'Loan' : 'Card'}
             </button>
          )}
        </div>
      </div>
    </div>
  );
}