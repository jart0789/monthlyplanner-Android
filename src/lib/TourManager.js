import { driver } from "driver.js"; 
import "driver.js/dist/driver.css";

let driverObj = null;

// --- INTERACTION LOCK ---
// This injects a CSS rule that freezes the app AND the highlighted element,
// but keeps the tutorial popover clickable.
const addInteractionLock = () => {
  // Add the class to body to trigger the lock
  document.body.classList.add('tour-ui-locked');

  if (document.getElementById('tour-interaction-lock')) return;
  
  const style = document.createElement('style');
  style.id = 'tour-interaction-lock';
  style.innerHTML = `
    /* 1. Disable the app background (inherits down) */
    body.tour-ui-locked {
      pointer-events: none !important;
      user-select: none !important;
    }

    /* 2. STRICTLY DISABLE the element being highlighted.
       driver.js tries to enable this by default, so we must override it. */
    .driver-active-element,
    .driver-active-element * {
      pointer-events: none !important;
    }

    /* 3. RE-ENABLE the Popover (Next/Back buttons) */
    .driver-popover,
    .driver-popover * {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);
};

const removeInteractionLock = () => {
  document.body.classList.remove('tour-ui-locked');
  const style = document.getElementById('tour-interaction-lock');
  if (style) style.remove();
};

export const TourManager = {
  // 1. CLEANUP
  cleanup: () => {
    removeInteractionLock();
    if (driverObj) {
      try { driverObj.destroy(); } catch (e) {}
      driverObj = null;
    }
  },

  // 2. RUN
  run: (pageName, onNavigate, t, localActions = {}) => {
    const cleanPageName = pageName === 'expense' ? 'expenses' : pageName;

    const isCompleted = localStorage.getItem('fintracker_tutorial_completed');
    const currentStep = localStorage.getItem('tutorial_step') || 'dashboard';
    
    if (isCompleted === 'true' || currentStep !== cleanPageName) return;

    TourManager.cleanup();

    // --- ACTIVATE LOCKDOWN ---
    addInteractionLock();

    const dummyStep = { 
        element: 'body', 
        popover: { className: 'hidden-driver-popover', title: ' ', description: ' ' } 
    };

    const commonConfig = {
        showProgress: true,
        animate: true,
        allowClose: false,
        overlayClickNext: false,
        nextBtnText: 'Next',
        doneBtnText: 'Done',
    };

    const stepsConfig = {
      dashboard: [
        { popover: { title: t('tour_welcome_title'), description: t('tour_welcome_desc') } },
        { element: '.tour-summary-cards', popover: { title: t('tour_quick_title'), description: t('tour_quick_desc') } },
        { element: '.tour-budget-chart', popover: { title: t('tour_budget_title'), description: t('tour_budget_desc') } },
        { element: '.tour-ai-button', popover: { title: t('tour_ai_advisor_title'), description: t('tour_ai_advisor_desc') } },
        { element: '.tour-next-bills', popover: { title: t('tour_bills_title'), description: t('tour_bills_desc') } },
        { element: '.tour-Ai-Adivses', popover: { title: t('tour_ai_advise_title'), description: t('tour_ai_advise_desc') } },
        { 
            element: '.tour-main', // Fallback element for transition
            popover: { 
                title: t('tour_next_income_title') || 'Next: Income', 
                description: t('tour_next_income_desc') || 'Let\'s track your earnings.',
                nextBtnText: 'Go to Income',
                onNextClick: () => TourManager.switchTab('income', onNavigate)
            } 
        },
       dummyStep
      ],
      income: [
        { element: '.tour-add-btn', popover: { title: t('tour_add_income_title'), description: t('tour_add_income_desc'),  side: "top", align: 'end' } },
        { element: '.tour-list-months', popover: { title: t('tour_list_months_title'), description: t('tour_list_months_desc'),    
          onNextClick: () => {
                   if (localActions.setTab) {
                       localActions.setTab('analysis');
                       setTimeout(() => { if(driverObj) driverObj.moveNext(); }, 500);
                   } else {
                       if(driverObj) driverObj.moveNext();
                   }
                } 
              }
            },
        { element: '.tour-YearlyTotal', popover: { title: t('tour_inc_yearlytotal_title'), description: t('tour_inc_yearlytotal_desc') } }, 
        { element: '.tour-YearlySummary', popover: { title: t('tour_inc_yearlysummary_title'), description: t('tour_inc_yearlysummary_desc') } }, 
        { element: '.tour-YearlyDetail', popover: { title: t('tour_inc_yearlydetail_title'), description: t('tour_inc_yearlydetail_desc'),  
          onNextClick: () => {
                   if (localActions.setTab) {
                       localActions.setTab('list');
                       setTimeout(() => { if(driverObj) driverObj.moveNext(); }, 500);
                   } else {
                       if(driverObj) driverObj.moveNext();
                   }
                } 
              }
            },

        { element: '.tour-list-total', popover: { title: t('tour_totalincome_title'), description: t('tour_totalincome_desc') } },
        { element: '.tour-list-filters', popover: { title: t('tour_filters_title'), description: t('tour_filters_desc') } },
        { element: '.tour-list-container', popover: { title: t('tour_history_title'), description: t('tour_history_desc') } },
        { 
            element: '.tour-page-title', 
            popover: { 
                title: t('tour_next_expenses_title'), 
                description: t('tour_next_expenses_desc'), 
                nextBtnText: t('tour_go_expenses'),
                onNextClick: () => TourManager.switchTab('expenses', onNavigate)
            } 
        },
     dummyStep
      ],
      expenses: [
         { element: '.tour-add-btn', popover: { title: t('tour_add_expense_title'), description: t('tour_add_expense_desc'),  side: "top", align: 'end' } },
        { element: '.tour-list-months', popover: { title: t('tour_exp_list_months_title'), description: t('tour_exp_list_months_desc'),    
          onNextClick: () => {
                   if (localActions.setTab) {
                       localActions.setTab('analysis');
                       setTimeout(() => { if(driverObj) driverObj.moveNext(); }, 500);
                   } else {
                       if(driverObj) driverObj.moveNext();
                   }
                } 
              }
            },
          { element: '.tour-YearlyTotal', popover: { title: t('tour_exp_yearlytotal_title'), description: t('tour_exp_yearlytotal_desc') } }, 
          { element: '.tour-YearlySummary', popover: { title: t('tour_exp_yearlysummary_title'), description: t('tour_exp_yearlysummary_desc') } }, 
          { element: '.tour-YearlyDetail', popover: { title: t('tour_exp_yearlydetail_title'), description: t('tour_exp_yearlydetail_desc'),  
            onNextClick: () => {
                   if (localActions.setTab) {
                       localActions.setTab('list');
                       setTimeout(() => { if(driverObj) driverObj.moveNext(); }, 500);
                   } else {
                       if(driverObj) driverObj.moveNext();
                   }
                } 
              }
            },

        { element: '.tour-list-total', popover: { title: t('tour_totalexpense_title'), description: t('tour_totalexpense_desc') } },
        { element: '.tour-list-filters', popover: { title: t('tour_exp_filters_title'), description: t('tour_exp_filters_desc') } },
        { element: '.tour-list-container', popover: { title: t('tour_exp_history_title'), description: t('tour_exp_history_desc') } },
        { 
            element: '.tour-page-title', 
            popover: { 
                title: 'Next: Debts', 
                description: 'Let\'s manage your credits.', 
                nextBtnText: 'Go to Debts',
                onNextClick: () => TourManager.switchTab('credits', onNavigate)
            } 
        },
   dummyStep
      ],
      credits: [
        { element: '.tour-add-credit', popover: { title: t('tour_add_debt_title'), description: t('tour_add_debt_desc') } },
        { element: '.tour-filter-credit', popover: { title: t('tour_filter_credit_title'), description: t('tour_filter_credit_desc') } },
        { element: '.tour-total-credit', popover: { title: t('tour_total_debt_title'), description: t('tour_total_debt_desc') } },
        { element: '.tour-monthlymin-credit', popover: { title: t('tour_monthlymin_title'), description: t('tour_monthlymin_desc') } },
        { element: '.tour-credit_items', popover: { title: t('tour_credititems_title'), description: t('tour_credititems_desc') } },
      { 
            element: '.tour-page-title', 
            popover: { 
                title: 'Next: Snapshot', // UPDATED
                description: 'Let\'s view your monthly summary.',
                nextBtnText: 'Go to Snapshot',
                onNextClick: () => TourManager.switchTab('snapshot', onNavigate) // UPDATED
            }
        },
     dummyStep
      ],
      snapshot: [
        { popover: { title: t('tour_snapshot_title'), description: t('tour_snapshot_desc') } },
        { element: '.tour-snapshot-earnings', popover: { title: t('tour_earnings_title'), description: t('tour_earnings_desc') } },
        { element: '.tour-snapshot-bills', popover: { title: t('tour_bills_title'), description: t('tour_bills_desc') } },
        { element: '.tour-snapshot-debt', popover: { title: t('tour_creditsloans_title'), description: t('tour_creditsloans_desc') } },
        { element: '.tour-snapshot-breakdown', popover: { title: t('tour_spendingbreakdown_title'), description: t('tour_spendingbreakdown_desc') } },
        { 
            // Fallback element if others aren't visible
            popover: { 
                title: 'Next: Settings', 
                description: 'Finally, let\'s configure your app.',
                nextBtnText: 'Go to Settings',
                onNextClick: () => TourManager.switchTab('settings', onNavigate)
            } 
        },
        dummyStep
      ],
      settings: [
        { popover: { title: t('tour_settings_title') || 'Settings', description: t('tour_settings_desc') || 'Customize your experience here.' } },
        { 
            element: '.tour-categories-tab', 
            popover: { 
                title: t('tour_cats_title') || 'Categories', 
                description: t('tour_cats_desc') || 'Tap here to add or edit transaction categories.',
                // LOGIC TO SWITCH TABS INSIDE SETTINGS
               onNextClick: () => {
                   if (localActions.setTab) {
                       localActions.setTab('categories');
                       setTimeout(() => { if(driverObj) driverObj.moveNext(); }, 500);
                   } else {
                       if(driverObj) driverObj.moveNext();
                   }
                } 
            } 
        },
        // These elements only exist AFTER the tab switch above
        { element: '.tour-categories-name', popover: { title: t('tour_cat_name') || 'Category Name', description: t('tour_cat_name_desc') || 'Provide a name for your category.' } },
        { element: '.tour-categories-type', popover: { title: t('tour_cat_type') || 'Category Type', description: t('tour_cat_type_desc') || 'Select whether this category is for income or expense.' } },
        { element: '.tour-categories-billremind', popover: { title: t('tour_cat_billremind') || 'Category Bill Reminder', description: t('tour_cat_billremind_desc') || 'Enable or disable bill reminders for this category.' } },
        { element: '.tour-categories-color', popover: { title: t('tour_cat_color') || 'Category Color', description: t('tour_cat_color_desc') || 'Select a color for your category.' } },
        { element: '.tour-categories-icon', popover: { title: t('tour_cat_icon') || 'Category Icon', description: t('tour_cat_icon_desc') || 'Select an icon for your category.' } },
        { element: '.tour-categories-save', popover: { title: t('tour_cat_save') || 'Category Save Button', description: t('tour_cat_save_desc') || 'Save your category changes.' } },
        { element: '.tour-categories-income', popover: { title: t('tour_cat_income') || 'Category Income', description: t('tour_cat_income_desc') || 'These categories will be shown in the income section.' } },
        { 
            element: '.tour-categories-expense', 
            popover: { 
                title: t('tour_cat_expense') || 'Category Expense', 
                description: t('tour_cat_expense_desc') || 'These categories will be shown in the expense section.',  side: "top", align: 'end',
                // SWITCH BACK TO GENERAL TAB
                onNextClick: () => {
                   if (localActions.setTab) {
                       localActions.setTab('general');
                       setTimeout(() => { if(driverObj) driverObj.moveNext(); }, 500);
                   } else {
                       if(driverObj) driverObj.moveNext();
                   }
                }
            } 
        },
        { element: '.tour-dark-mode', popover: { title: t('tour_dark_mode_title') || 'Dark Mode', description: t('tour_dark_mode_desc') || 'Switch between light and dark themes.' } },
        { element: '.tour-notifications', popover: { title: t('tour_notifs_title') || 'Notifications', description: t('tour_notifs_desc') || 'Manage reminders for bills and loans.' } },
        { element: '.tour-notifications_billremind', popover: { title: t('tour_notifs_billremind') || 'Bill Reminders', description: t('tour_notifs_descbillremind') || 'Enable or Disable alerts for categories with reminders.' } },
        { element: '.tour-notifications_loanremind', popover: { title: t('tour_notifs_loanremind') || 'Loan Reminders', description: t('tour_notifs_descloanremind') || 'Enable or Disable alerts before payment is due.' } },
        { element: '.tour-notifications_loanreminddays', popover: { title: t('tour_notifs_loanreminddays') || 'Reminder Days', description: t('tour_notifs_descloanreminddays') || 'Select how many days before due date to be reminded.' } },
        { element: '.tour-notifications_autopay', popover: { title: t('tour_notifs_autopay') || 'Auto Pay Reminders', description: t('tour_notifs_descautopay') || 'Enable or disable automatic payments notifications.' } },
        { element: '.tour-general-currency', popover: { title: t('tour_notifs_currency') || 'Currency Settings', description: t('tour_desc_currency') || 'Set your preferred currency.' } },
        { element: '.tour-general-language', popover: { title: t('tour_notifs_language') || 'Language Settings', description: t('tour_desc_language') || 'Change the language of the application.' } },
        { element: '.tour-general-AI', popover: { title: t('tour_title_AI') || 'AI Settings', description: t('tour_desc_AI') || 'Manage your API key for enhanced financial insights.' } },
        { 
            popover: { 
                title: t('tour_done_title') || 'All Done!', 
                description: t('tour_done_desc') || 'You are ready to use FinTracker!',
                doneBtnText: t('tour_finish_btn') || 'Finish',
                onNextClick: () => TourManager.finish(onNavigate)
            } 
        }
      ]
    };

    const steps = stepsConfig[cleanPageName];
    if (!steps) return;

    // Use a small timeout to ensure the DOM is painted
    setTimeout(() => {
        driverObj = driver({
            ...commonConfig,
            steps: steps,
            onNextClick: (el, step) => {
                if (step.options && step.options.onNextClick) {
                    step.options.onNextClick();
                } else {
                    driverObj.moveNext();
                }
            }
        });
        driverObj.drive();
    }, 600);
  },

  // 3. SWITCH TAB
  switchTab: (nextStep, onNavigate) => {
    TourManager.cleanup(); 
    localStorage.setItem('tutorial_step', nextStep); 
    if (onNavigate) onNavigate(nextStep); 
  },

  // 4. FINISH
  finish: (onNavigate) => {
    TourManager.cleanup();
    localStorage.removeItem('tutorial_step');
    localStorage.setItem('fintracker_tutorial_completed', 'true');
    if (onNavigate) onNavigate('dashboard');
  }
};