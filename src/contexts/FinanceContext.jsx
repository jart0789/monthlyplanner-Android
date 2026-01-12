import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { parseISO, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next'; // IMPORT HOOK
import '../utils/i18n'; // Init i18n

const FinanceContext = createContext(undefined);

const NOTIFICATION_TIME = "06:00"; 

const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'Housing', type: 'expense', icon: 'Home', color: '#3B82F6', notificationsEnabled: false },
  { id: 'c2', name: 'Food', type: 'expense', icon: 'Coffee', color: '#F59E0B', notificationsEnabled: false },
  { id: 'c3', name: 'Transport', type: 'expense', icon: 'Car', color: '#EF4444', notificationsEnabled: false },
  { id: 'c4', name: 'Utilities', type: 'expense', icon: 'Zap', color: '#10B981', notificationsEnabled: true }, 
  { id: 'c5', name: 'Entertainment', type: 'expense', icon: 'Smartphone', color: '#8B5CF6', notificationsEnabled: false },
  { id: 'c6', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981', notificationsEnabled: false },
];

const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'en',
  currency: 'USD',
  notifications: {
    bill_reminders: true, 
    loan_dates: true,     
    autopay: false,
    loan_notify_days: 3
  },
};

const STORAGE_KEY = 'finance_data';
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const getLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
};

export function FinanceProvider({ children }) {
  const { t, i18n } = useTranslation(); // USE HOOK HERE

  const [data, setData] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) { return null; }
  });

  const [transactions, setTransactions] = useState(data?.transactions || []);
  const [credits, setCredits] = useState(data?.credits || []);
  const [categories, setCategories] = useState(data?.categories || DEFAULT_CATEGORIES);
  const [dismissedReminders, setDismissedReminders] = useState([]);

  const [settings, setSettings] = useState(() => {
    const saved = data?.settings || {};
    let safeNotifs = saved.notifications;
    if (typeof safeNotifs === 'boolean') {
        safeNotifs = { 
            bill_reminders: safeNotifs, 
            loan_dates: safeNotifs, 
            autopay: false,
            loan_notify_days: 3
        };
    } else if (!safeNotifs) {
        safeNotifs = DEFAULT_SETTINGS.notifications;
    }
    return { ...DEFAULT_SETTINGS, ...saved, notifications: { ...DEFAULT_SETTINGS.notifications, ...safeNotifs } };
  });

  // --- SYNC LANGUAGE & DIRECTION ---
  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
    document.documentElement.lang = settings.language;
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
  }, [settings.language, i18n]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (settings.theme === 'dark') root.classList.add('dark');
    else root.classList.add('light');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, credits, categories, settings }));
  }, [settings.theme, transactions, credits, categories, settings]);

  // --- 1. RECURRING GENERATOR ENGINE (WITH CHECKPOINTS) ---
  useEffect(() => {
    const processRecurring = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let newItems = [];
      let parentUpdates = [];
      let hasChanges = false;

      const groups = {};
      transactions.forEach(t => {
        if (t.isRecurring || t.recurringId) {
          const familyId = t.recurringId || t.id;
          if (!groups[familyId]) groups[familyId] = [];
          groups[familyId].push(t);
        }
      });

      Object.entries(groups).forEach(([familyId, family]) => {
        const parent = family.find(t => t.isRecurring);
        if (!parent) return;

        let baseDate = parent.lastGenerated ? parseISO(parent.lastGenerated) : parseISO(parent.date);
        let nextDate = new Date(baseDate);
        const freq = (parent.frequency || 'monthly').toLowerCase();
        let iterations = 0;
        let batchLastGenerated = null;

        while (iterations < 36) {
          if (freq === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (freq === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
          else if (freq === 'monthly') {
              nextDate.setMonth(nextDate.getMonth() + 1);
              const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              if (nextDate.getDate() > daysInMonth) nextDate.setDate(daysInMonth);
          }
          else if (freq === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

          if (nextDate > today) break;

          const nextDateStr = nextDate.toISOString().split('T')[0];
          const alreadyExists = family.some(t => t.date.startsWith(nextDateStr));

          if (!alreadyExists) {
            newItems.push({
              ...parent,
              id: generateId(),
              date: nextDate.toISOString(),
              recurringId: familyId,
              isRecurring: false, 
              createdAt: new Date().toISOString()
            });
            hasChanges = true;
          }
          batchLastGenerated = nextDate.toISOString();
          iterations++;
        }

        if (batchLastGenerated) {
            parentUpdates.push({ id: parent.id, lastGenerated: batchLastGenerated });
            hasChanges = true;
        }
      });

      if (hasChanges) {
        setTransactions(prev => {
            let list = prev.map(t => {
                const update = parentUpdates.find(u => u.id === t.id);
                return update ? { ...t, lastGenerated: update.lastGenerated } : t;
            });
            return [...newItems, ...list];
        });
      }
    };
    const timer = setTimeout(processRecurring, 1000);
    return () => clearTimeout(timer);
  }, [transactions.length]);

  // --- 2. AUTO-PAY ENGINE (FIXED) ---
  useEffect(() => {
    const processAutoPay = () => {
      const today = new Date();
      credits.forEach(c => {
        if (c.autopay && c.dueDate && c.minPayment) {
          if ((c.currentBalance || 0) <= 0) return; 

          const due = getLocalDate(c.dueDate);
          if (isSameDay(today, due)) {
            // FIX: Check duplicates to prevent loop
            const alreadyPaid = c.history?.some(h => 
              isSameDay(parseISO(h.date), today) && 
              (h.note === 'Auto-Pay' || h.note === 'Autopay')
            );

            if (!alreadyPaid) {
              recordCreditPayment(c.id, c.minPayment, today.toISOString(), 'Autopay');
            }
          }
        }
      });
    };
    processAutoPay();
    const interval = setInterval(processAutoPay, 86400000); 
    return () => clearInterval(interval);
  }, [credits]);

  // --- 3. NOTIFICATION SCHEDULER ---
  useEffect(() => {
    const scheduleNotifications = async () => {
      try {
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') return; 

        await LocalNotifications.createChannel({
            id: 'finance_alerts',
            name: 'Bill Reminders',
            description: 'Alerts for upcoming bills',
            importance: 5,
            visibility: 1,
            vibration: true,
        });

        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel(pending);
        }

        const notificationsToSchedule = [];
        const now = new Date();
        const [userHour, userMinute] = NOTIFICATION_TIME.split(':').map(Number);
        let notifId = 100; 

        if (settings.notifications.bill_reminders) {
          transactions
            .filter(tx => tx.isRecurring && tx.type === 'expense')
            .forEach(tx => {
               const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.category);
               if (cat && cat.notificationsEnabled) {
                  let current = getLocalDate(tx.date);
                  current.setHours(userHour, userMinute, 0, 0);
                  while (current < now) {
                      const freq = (tx.frequency || 'monthly').toLowerCase();
                      let next = new Date(current);
                      if (freq === 'weekly') next.setDate(next.getDate() + 7);
                      else if (freq === 'biweekly') next.setDate(next.getDate() + 14);
                      else if (freq === 'yearly') next.setFullYear(next.getFullYear() + 1);
                      else next.setMonth(next.getMonth() + 1);
                      current = next;
                  }
                  for (let i = 0; i < 6; i++) {
                      notificationsToSchedule.push({
                          id: notifId++,
                          title: `Bill Due: ${tx.category}`,
                          body: `Friendly reminder: Time to pay ${tx.category} (${formatCurrency(tx.amount)})`,
                          schedule: { at: new Date(current), allowWhileIdle: true }, 
                          channelId: 'finance_alerts',
                      });
                      const freq = (tx.frequency || 'monthly').toLowerCase();
                      if (freq === 'weekly') current.setDate(current.getDate() + 7);
                      else if (freq === 'biweekly') current.setDate(current.getDate() + 14);
                      else if (freq === 'yearly') current.setFullYear(current.getFullYear() + 1);
                      else current.setMonth(current.getMonth() + 1);
                  }
               }
            });
        }

        if (settings.notifications.loan_dates) {
           const bufferDays = parseInt(settings.notifications.loan_notify_days || 0);
           credits.filter(c => !c.autopay && c.dueDate).forEach(c => {
               const savedDate = getLocalDate(c.dueDate);
               const dayOfMonth = savedDate.getDate();
               let current = new Date();
               current.setDate(dayOfMonth);
               current.setHours(userHour, userMinute, 0, 0);
               
               let notifyTime = new Date(current);
               notifyTime.setDate(current.getDate() - bufferDays);

               if (notifyTime < now) current.setMonth(current.getMonth() + 1);

               for(let i=0; i<6; i++) {
                   notifyTime = new Date(current);
                   notifyTime.setDate(current.getDate() - bufferDays);
                   if (notifyTime > now) {
                       notificationsToSchedule.push({
                           id: notifId++,
                           title: `Payment Due`,
                           body: `Payment for ${c.name} is due in ${bufferDays} days.`,
                           schedule: { at: notifyTime, allowWhileIdle: true }, 
                           channelId: 'finance_alerts',
                       });
                   }
                   current.setMonth(current.getMonth() + 1);
               }
           });
        }

        if (settings.notifications.autopay) {
            const bufferDays = 0; 
            credits.filter(c => c.autopay && c.dueDate).forEach(c => {
                const savedDate = getLocalDate(c.dueDate);
                const dayOfMonth = savedDate.getDate();
                let current = new Date();
                current.setDate(dayOfMonth);
                current.setHours(userHour, userMinute, 0, 0);

                let notifyTime = new Date(current);
                notifyTime.setDate(current.getDate() - bufferDays);

                if (notifyTime < now) current.setMonth(current.getMonth() + 1);

                for(let i=0; i<6; i++) {
                    notifyTime = new Date(current);
                    notifyTime.setDate(current.getDate() - bufferDays);
                    if (notifyTime > now) {
                        notificationsToSchedule.push({
                            id: notifId++,
                            title: `Upcoming Autopay`,
                            body: `${c.name} will be autopaid today. Ensure funds are available.`,
                            schedule: { at: notifyTime, allowWhileIdle: true },
                            channelId: 'finance_alerts',
                        });
                    }
                    current.setMonth(current.getMonth() + 1);
                }
            });
        }

        if (notificationsToSchedule.length > 0) {
            await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        }
      } catch (e) { console.error("Notification Error:", e); }
    };
    scheduleNotifications();
  }, [transactions, credits, categories, settings.notifications]); 

  // --- ACTIONS ---
  const addTransaction = (tx) => {
      setTransactions(prev => [{ 
          ...tx, 
          id: generateId(), 
          createdAt: new Date().toISOString(),
          recurringId: tx.isRecurring ? generateId() : undefined 
      }, ...prev]);
  };
  
  const updateTransaction = (id, tx) => setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...tx } : t));
  const deleteTransaction = (id) => setTransactions(prev => prev.filter(t => t.id !== id));
  const addCredit = (c) => setCredits(prev => [...prev, { id: generateId(), history: [], ...c }]);
  const updateCredit = (arg1, arg2) => {
    if (typeof arg1 === 'string') { setCredits(prev => prev.map(c => c.id === arg1 ? { ...c, ...arg2 } : c)); } 
    else { setCredits(prev => prev.map(c => c.id === arg1.id ? arg1 : c)); }
  };
  const deleteCredit = (id) => setCredits(prev => prev.filter(c => c.id !== id));
  
  const recordCreditPayment = (creditId, amount, date, note) => {
    const parsedAmount = parseFloat(amount);
    const credit = credits.find(c => c.id === creditId);
    if (parsedAmount > (credit.currentBalance || 0)) {
      if (!confirm(`Payment exceeds balance. Proceed?`)) return;
    }
    const payment = { id: generateId(), date, amount: parsedAmount, note };
    setCredits(prev => prev.map(c => {
      if (c.id === creditId) {
        return { ...c, history: [...(c.history || []), payment], currentBalance: (c.currentBalance || 0) - parsedAmount };
      } return c;
    }));
  };

  const addCategory = (name, type, icon = 'Tag', color = '#94a3b8', notificationsEnabled = false) => {
    setCategories(prev => [...prev, { id: generateId(), name, type, icon, color, notificationsEnabled }]);
  };
  const updateCategory = (id, updates) => setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  const deleteCategory = (id) => setCategories(prev => prev.filter(c => c.id !== id));
  const updateSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));
  const updateNotificationSetting = (key, val) => {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: val } }));
  };
  const dismissReminder = (id) => { setDismissedReminders(prev => [...prev, id]); };

  // --- FIX IS HERE: FORCE 'en-US' LOCALE FOR FORMATTING ---
  const formatCurrency = (amount) => {
    try { 
        // We use 'en-US' to ensure commas are thousands separators and dots are decimals.
        // We still use settings.currency to show the correct symbol (EUR, JPY, etc.)
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: settings.currency 
        }).format(amount || 0); 
    } catch { 
        return `${settings.currency} ${amount}`; 
    }
  };

  const dailyReminders = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDate();
    const alerts = [];
    if (settings.notifications.bill_reminders) {
        const billAlerts = transactions.filter(tx => tx.isRecurring && tx.type === 'expense').filter(tx => {
            const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.category);
            return cat && cat.notificationsEnabled === true;
        }).filter(tx => getLocalDate(tx.date).getDate() === todayDay).map(tx => ({
            id: tx.id, category: tx.category, note: tx.notes || 'Payment Due', amount: tx.amount, type: 'bill',
            icon: categories.find(c => c.id === tx.categoryId || c.name === tx.category)?.icon || 'AlertCircle'
        }));
        alerts.push(...billAlerts);
    }
    if (settings.notifications.loan_dates) {
        const bufferDays = parseInt(settings.notifications.loan_notify_days || 0);
        const loanAlerts = credits.filter(c => c.dueDate).filter(c => {
            const d = getLocalDate(c.dueDate); 
            const triggerDay = d.getDate() - bufferDays;
            return todayDay === triggerDay; 
        }).map(c => ({
            id: c.id, category: c.name, note: `Due in ${bufferDays} days`, amount: c.minPayment || 0, type: 'loan', icon: 'CreditCard'
        }));
        alerts.push(...loanAlerts);
    }
    return alerts.filter(a => !dismissedReminders.includes(a.id));
  }, [transactions, credits, categories, settings.notifications, dismissedReminders]);

  return (
    <FinanceContext.Provider value={{
      transactions, credits, categories, settings, dailyReminders,
      setTheme: (v) => updateSetting('theme', v),
      setLanguage: (v) => updateSetting('language', v),
      setCurrency: (v) => updateSetting('currency', v),
      updateNotificationSetting, dismissReminder, 
      addTransaction, updateTransaction, deleteTransaction,
      addCredit, updateCredit, deleteCredit, recordCreditPayment,
      addCategory, updateCategory, deleteCategory,
      formatCurrency, t, language: settings.language, theme: settings.theme, currency: settings.currency,
      notificationTime: NOTIFICATION_TIME
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() { return useContext(FinanceContext); }