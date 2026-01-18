import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PaymentModal({ isOpen, onClose, onConfirm, credit }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');

  // Reset/Preset amount when the modal opens
  useEffect(() => {
    if (isOpen && credit) {
      // If Autopay: Start empty (User decides extra amount)
      // If Manual: Start with Min Payment suggestion
      setAmount(credit.autopay ? '' : credit.minPayment || '');
    }
  }, [isOpen, credit]);

  if (!isOpen || !credit) return null;

  const isAutopay = credit.autopay;
  const title = isAutopay ? t('extra_payment') : t('make_payment');
  const description = isAutopay 
    ? t('autopay_payment_desc', { name: credit.name })
    : t('manual_payment_desc', { name: credit.name });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    onConfirm(parseFloat(amount), isAutopay ? 'Extra Payment' : 'Manual Payment');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {title}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('amount')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="number"
                step="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-lg font-medium transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!amount}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('pay_now')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}