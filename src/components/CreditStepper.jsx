import React, { useState } from 'react';
import { CreditCard, Landmark, ChevronLeft, ChevronRight, Check, Calendar, DollarSign, Percent, X, RefreshCcw } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { cn } from '../lib/utils';

export default function CreditStepper({ onClose, initialData = null }) {
  const { addCredit, updateCredit } = useFinance();
  const [step, setStep] = useState(1);
  
  // Initialize with existing data if available
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
    if (step === 1 && !formData.name) return alert("Please enter a name");
    
    // VALIDATION 1: Balance vs Limit
    if (step === 2) {
        if (!formData.totalAmount || !formData.currentBalance) return alert("Please enter amounts");
        
        const limit = parseFloat(formData.totalAmount);
        const balance = parseFloat(formData.currentBalance);
        
        if (balance > limit) {
            return alert(`Error: The balance ($${balance}) cannot exceed the credit limit ($${limit}).`);
        }
    }
    
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleFinish = () => {
    // VALIDATION 2: Min Payment vs Balance
    const balance = parseFloat(formData.currentBalance);
    const minPayment = parseFloat(formData.minPayment || 0);

    if (minPayment > balance) {
        return alert(`Error: Minimum payment ($${minPayment}) cannot exceed the current balance ($${balance}).`);
    }

    if (initialData) {
      updateCredit(initialData.id, formData);
    } else {
      addCredit(formData);
    }
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
      
      {/* Header */}
      <div className="px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
          <X className="w-6 h-6" />
        </button>
        
        {/* Step Indicators */}
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", i === step ? "bg-blue-600" : (i < step ? "bg-blue-200" : "bg-slate-200 dark:bg-slate-700"))} />
          ))}
        </div>
        
        <div className="w-10" /> 
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto">
          
          {/* STEP 1: TYPE & NAME */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {initialData ? 'Edit Credit' : 'What type of credit?'}
                </h2>
                <p className="text-slate-500">Choose the category that best fits.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setFormData({...formData, type: 'creditCard'})}
                  className={cn(
                    "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                    formData.type === 'creditCard' 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" 
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"
                  )}
                >
                  <CreditCard className="w-8 h-8" />
                  <span className="font-bold">Credit Card</span>
                </button>
                <button 
                  onClick={() => setFormData({...formData, type: 'loan'})}
                  className={cn(
                    "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                    formData.type === 'loan' 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" 
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"
                  )}
                >
                  <Landmark className="w-8 h-8" />
                  <span className="font-bold">Loan</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Account Name</label>
                <input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder={formData.type === 'creditCard' ? "e.g. Chase Sapphire" : "e.g. Car Loan"}
                  className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* STEP 2: AMOUNTS */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">The Numbers</h2>
                <p className="text-slate-500">How much do you owe?</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  {formData.type === 'creditCard' ? 'Total Credit Limit' : 'Total Loan Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="number"
                    value={formData.totalAmount}
                    onChange={e => setFormData({...formData, totalAmount: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-4 pl-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Current Balance Owed</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="number"
                    value={formData.currentBalance}
                    onChange={e => setFormData({...formData, currentBalance: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-4 pl-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DETAILS */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Final Details</h2>
                <p className="text-slate-500">Interest and Payments</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">APR %</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={formData.interestRate}
                      onChange={e => setFormData({...formData, interestRate: e.target.value})}
                      placeholder="0.00"
                      className="w-full p-4 pl-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Min Payment</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={formData.minPayment}
                      onChange={e => setFormData({...formData, minPayment: e.target.value})}
                      placeholder="0.00"
                      className="w-full p-4 pl-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Next Due Date</label>
                <div className="relative">
                  <input 
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"/>
                </div>
              </div>

              {/* AUTOPAY TOGGLE */}
              <div 
                onClick={() => setFormData(d => ({...d, autopay: !d.autopay}))}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                  formData.autopay 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    formData.autopay ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                  )}>
                    <RefreshCcw className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className={cn("font-bold", formData.autopay ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white")}>
                      Enable Autopay
                    </p>
                    <p className="text-xs text-slate-500">Automatically record Min Payment on due date</p>
                  </div>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  formData.autopay ? "bg-emerald-500 border-emerald-500" : "border-slate-300 dark:border-slate-600"
                )}>
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
               <Check className="w-5 h-5" /> Save {initialData ? 'Changes' : 'Debt'}
             </button>
          )}
        </div>
      </div>

    </div>
  );
}