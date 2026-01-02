import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { TRANSLATIONS } from '../utils/i18n';
import { LocalNotifications } from '@capacitor/local-notifications';

const FinanceContext = createContext(undefined);

// --- CONFIGURATION ---
// Set to "06:00" for production
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

// Helper: Parse date strictly as local YYYY-MM-DD
const getLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
};

export function FinanceProvider({ children }) {
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

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (settings.theme === 'dark') root.classList.add('dark');
    else root.classList.add('light');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, credits, categories, settings }));
  }, [settings.theme, transactions, credits, categories, settings]);


  // --- AUTO-GENERATOR ENGINE ---
  useEffect(() => {
    const processRecurringTransactions = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newTransactions = [];
        let hasChanges = false;

        // 1. Group by recurringId (Treat items without recurringId as their own 'root')
        const recurringGroups = {};
        
        transactions.forEach(t => {
            if (t.isRecurring) {
                // Compatibility: If older data lacks recurringId, use its own ID
                const groupId = t.recurringId || t.id; 
                if (!recurringGroups[groupId]) recurringGroups[groupId] = [];
                recurringGroups[groupId].push(t);
            }
        });

        // 2. Process each group to find the LATEST entry
        Object.keys(recurringGroups).forEach(groupId => {
            const group = recurringGroups[groupId];
            // Sort by date descending (newest first)
            group.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const latestTx = group[0];
            const latestDate = getLocalDate(latestTx.date);
            
            // Calculate NEXT occurrence
            let nextDate = new Date(latestDate);
            
            // Logic to advance date
            // We use a loop to catch up if user missed multiple months
            // But strict limit (e.g. 12) to prevent infinite loops
            let iterations = 0;
            
            while (iterations < 12) {
                // Advance based on frequency
                if (latestTx.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (latestTx.frequency === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
                else if (latestTx.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                else nextDate.setMonth(nextDate.getMonth() + 1); // Default Monthly

                // STOP if nextDate is in the future
                if (nextDate > today) break;

                // GENERATE NEW TRANSACTION
                const newTx = {
                    ...latestTx,
                    id: generateId(),
                    date: nextDate.toISOString().split('T')[0],
                    recurringId: groupId, // Ensure it links to the family
                    createdAt: new Date().toISOString(),
                    isGenerated: true // Optional flag for debugging
                };

                newTransactions.push(newTx);
                hasChanges = true;
                
                // Move cursor forward for next iteration
                // (We don't need to re-sort, just base next loop on this new date)
                // Note: Javascript Date objects are mutable reference types? 
                // No, we modify 'nextDate' in place, but we need to ensure we don't start from 'latestDate' again.
                // Actually, the while loop already modifies 'nextDate'. 
                // We just need to make sure we don't push the SAME object twice if we loop.
                // But simplified: effectively we are walking 'nextDate' forward.
                
                iterations++;
            }
        });

        if (hasChanges && newTransactions.length > 0) {
            console.log(`Generated ${newTransactions.length} recurring transactions.`);
            setTransactions(prev => [...newTransactions, ...prev]);
        }
    };
    
    // Run once on mount (with a small timeout to ensure data loaded)
    const timer = setTimeout(processRecurringTransactions, 1000);
    return () => clearTimeout(timer);
  }, [transactions.length]); // Dependency: run when count changes, but internal logic prevents duplicates


  // --- NOTIFICATION SCHEDULER (Logic Preserved) ---
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

        // 1. BILL REMINDERS
        if (settings.notifications.bill_reminders) {
          transactions
            .filter(tx => tx.isRecurring && tx.type === 'expense')
            .forEach(tx => {
               const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.category);
               
               if (cat && cat.notificationsEnabled) {
                  let current = getLocalDate(tx.date);
                  current.setHours(userHour, userMinute, 0, 0);
                  
                  while (current < now) {
                      let next = new Date(current);
                      if (tx.frequency === 'weekly') next.setDate(next.getDate() + 7);
                      else if (tx.frequency === 'biweekly') next.setDate(next.getDate() + 14);
                      else if (tx.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
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
                      
                      if (tx.frequency === 'weekly') current.setDate(current.getDate() + 7);
                      else if (tx.frequency === 'biweekly') current.setDate(current.getDate() + 14);
                      else if (tx.frequency === 'yearly') current.setFullYear(current.getFullYear() + 1);
                      else current.setMonth(current.getMonth() + 1);
                  }
               }
            });
        }

        // 2. LOAN DUE DATES
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

               if (notifyTime < now) {
                   current.setMonth(current.getMonth() + 1);
               }

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

        // 3. AUTOPAY ALERTS
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

                if (notifyTime < now) {
                    current.setMonth(current.getMonth() + 1);
                }

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
            console.log(`Scheduled ${notificationsToSchedule.length} alerts for ${NOTIFICATION_TIME}.`);
        }
      } catch (e) {
          console.error("Notification Error:", e);
      }
    };

    scheduleNotifications();
  }, [transactions, credits, categories, settings.notifications]); 

  // --- ACTIONS ---
  const addTransaction = (tx) => {
      // Ensure recurring items get a family ID (recurringId)
      const newItem = { 
          ...tx, 
          id: generateId(), 
          createdAt: new Date().toISOString(),
          recurringId: tx.isRecurring ? generateId() : undefined // Set root recurringId
      };
      setTransactions(prev => [newItem, ...prev]);
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
    const payment = { id: generateId(), date, amount: parseFloat(amount), note };
    setCredits(prev => prev.map(c => {
      if (c.id === creditId) {
        return { ...c, history: [...(c.history || []), payment], currentBalance: c.type === 'loan' ? (c.currentBalance - parseFloat(amount)) : c.currentBalance };
      } return c;
    }));
    addTransaction({ amount: parseFloat(amount), type: 'expense', category: 'Debt Payment', date, notes: `Paid ${note}`, isRecurring: false });
  };
  const addCategory = (name, type, icon = 'Tag', color = '#94a3b8', notificationsEnabled = false) => {
    setCategories(prev => [...prev, { id: generateId(), name, type, icon, color, notificationsEnabled }]);
  };
  const updateCategory = (id, updates) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };
  const deleteCategory = (id) => setCategories(prev => prev.filter(c => c.id !== id));
  const updateSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));
  const updateNotificationSetting = (key, val) => {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: val } }));
  };
  const dismissReminder = (id) => { setDismissedReminders(prev => [...prev, id]); };

  const dailyReminders = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDate();
    const alerts = [];
    if (settings.notifications.bill_reminders) {
        const billAlerts = transactions.filter(tx => tx.isRecurring && tx.type === 'expense').filter(tx => {
            const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.category);
            return cat && cat.notificationsEnabled === true;
        }).filter(tx => {
            // Check logic same as generator to see if TODAY is a recurrence
            // But simple check: just convert to date
            const txDate = getLocalDate(tx.date);
            return txDate.getDate() === todayDay; 
        }).map(tx => ({
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

  const formatCurrency = (amount) => {
    try { return new Intl.NumberFormat(settings.language === 'en' ? 'en-US' : 'es-ES', { style: 'currency', currency: settings.currency }).format(amount || 0); } catch { return `${settings.currency} ${amount}`; }
  };
  const t = (key) => {
    const keys = key.split('.');
    let val = TRANSLATIONS[settings.language];
    for (const k of keys) val = val?.[k];
    return val || key;
  };

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