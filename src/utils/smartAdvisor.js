import { AlertCircle, Lightbulb, CheckCircle } from 'lucide-react';
import { subMonths } from 'date-fns';
import { Preferences } from '@capacitor/preferences';

/* ============================================================================
   1. CONFIGURATION (Cloud Models)
   ============================================================================ */
// We try these in order. If one fails (e.g. 404 Not Found), we automatically try the next.
const MODEL_NAME = "gemini-2.5-flash-lite";

// Correct URL structure according to Google API docs
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
let insightIdCounter = 0;

export const analyzeFinances = (transactions, credits, stats,t) => {
  const insights = [];
  insightIdCounter = 0; // Reset per call for consistency

  // 1. Check Spending vs Income
  if (stats.projectedSavingsRate < 0) {
     insights.push({
        id: ++insightIdCounter,
        type: 'critical',
        title: t('deficit_alert'),
        text: `${t('overspending')} $${Math.abs(stats.netForecast).toFixed(0)} ${t('this_month')}`,
        Icon: AlertCircle,
        gradient: 'from-rose-500 to-red-600'
     });
  } else if (stats.projectedSavingsRate < 10 && stats.projectedSavingsRate >= 0) {
     insights.push({
        id: ++insightIdCounter,
        type: 'warning',
        title: t('savings_goal'),
        text: t('savings_goal') + ` ${stats.projectedSavingsRate.toFixed(1)}%. ` + t('try_aim_20'), 
        Icon: Lightbulb,
        gradient: 'from-amber-500 to-orange-600'
     });
  } else if (stats.projectedSavingsRate >= 10) {
     insights.push({
        id: ++insightIdCounter,
        type: 'success',
        title: t('great_job'),
        text: `${t('on_track_save')} ${stats.projectedSavingsRate.toFixed(0)}% ${t('of_income')}`,
        Icon: CheckCircle,
        gradient: 'from-emerald-500 to-green-600'
     });
  }

  // 2. Check Debt (High Utilization)
  const highUtilCards = credits.filter(c => {
      const limit = parseFloat(c.limit || c.totalAmount || 0);
      const balance = parseFloat(c.currentBalance || 0);
      const isCredit = (c.type === 'credit' || c.type === 'credit_card' || c.type === 'creditCard');
      const utilization = limit > 0 ? (balance / limit) : 0;
      return isCredit && utilization > 0.30;
  });

  highUtilCards.forEach(card => {
      const limit = parseFloat(card.limit || card.totalAmount || 0); 
      const balance = parseFloat(card.currentBalance || 0);
      const utilPercent = Math.round((balance / limit) * 100);
      
      insights.unshift({ // Push to front for priority
          id: ++insightIdCounter,
          type: 'warning',
          title: t('high_util'),
          text: `${card.name} ${t('is')} ${utilPercent}% ${t('utilization')}. ${t('pay_down_improve')}`,
          Icon: AlertCircle,    
          gradient: 'from-purple-500 to-indigo-600'
      });
  });

  return insights;
};

/* ============================================================================
   3. CLOUD API HANDLER (The "Brain")
============================================================================ */

const getFinancialContext = (userText, transactions, credits) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let income = 0;
  let expenses = 0;
  let minDebtPayments = 0; // New tracker for mandatory debt payments
  
  const categoryTotals = {};
  
  // 1. BUILD TRANSACTION INDEX & TOTALS
  const searchableIndex = transactions.map(t => {
      if (t.date && new Date(t.date) >= monthStart) {
          const amt = Number(t.amount || 0);
          if (t.type === 'income') income += amt;
          if (t.type === 'expense') {
              expenses += amt;
              const cat = t.category || 'Misc';
              categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
          }
      }

      return {
          ...t,
          searchBlob: `${t.category || ''} ${t.name || ''} ${t.description || ''} ${t.notes || ''} ${t.frequency || ''}`.toLowerCase()
      };
  });

  // 2. FILTER TRANSACTIONS (Hybrid Search)
  let relevantTx = [];
  if (userText && userText.length > 2) {
      const keywords = userText.toLowerCase()
        .replace(/[?.,]/g, '')
        .split(' ')
        .filter(w => w.length > 2 && !['how','much','the','what','when','does'].includes(w));

      if (keywords.length > 0) {
          relevantTx = searchableIndex.filter(t => 
              keywords.some(k => t.searchBlob.includes(k))
          );
      }
  }

  const recentTx = searchableIndex.sort((a,b) => new Date(b.date) - new Date(a.date));
  const finalTxList = [...new Set([...relevantTx, ...recentTx])].slice(0, 100);


  // 3. PROCESS DEBTS & MINIMUM PAYMENTS
  let totalDebt = 0;
  
  const debtDetails = credits.map(c => {
    const balance = Number(c.currentBalance || 0);
    const minPay = Number(c.minPayment || 0);
    const limit = Number(c.limit || c.totalAmount || 0);
    const utilization = limit > 0 ? Math.round((balance / limit) * 100) : 0;
    
    totalDebt += balance;
    minDebtPayments += minPay; // Sum up the mandatory monthly payments

    return `- ${c.name} (${c.type || 'Loan'}): Bal $${balance}, Min Pay $${minPay}, Util ${utilization}%, APR ${c.apr || 'N/A'}%`;
  });

  // 4. CALCULATE TRUE NET CASH FLOW
  // Formula: Income - (Expenses + Mandatory Debt Payments)
  const trueNetCashFlow = income - expenses - minDebtPayments;

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([c, v]) => `${c}:$${v.toFixed(0)}`).join(', ');

  // 5. RETURN THE UPDATED CONTEXT
  return `
FINANCIAL_PROFILE
MONTHLY_INCOME: $${income.toFixed(0)}
MONTHLY_EXPENSES: $${expenses.toFixed(0)}
MANDATORY_DEBT_PAYMENTS: $${minDebtPayments.toFixed(0)}
NET_CASH_FLOW (Income - Expenses - MinDebt): $${trueNetCashFlow.toFixed(0)}

DEBT_SUMMARY
TOTAL_DEBT: $${totalDebt.toFixed(0)}
ACCOUNTS:
${debtDetails.join('\n')}

TOP_SPENDING_CATEGORIES:
${topCategories}

TRANSACTION_LOG (Most Relevant):
${finalTxList.map(t => {
    return `${t.date.split('T')[0]} | ${t.category} | ${t.name || ''} | $${t.amount} | ${t.frequency || ''} | ${t.type}`;
}).join('\n')}
`;
};

export const processUserMessage = async (userText, transactions, credits) => {
  try {
    const { value: apiKey } = await Preferences.get({ key: 'user_google_api_key' });
    if (!apiKey) return { text: "🔒 Please set up your API Key in Settings." };

    const context = getFinancialContext(userText, transactions, credits);

    console.log("Connecting to AI...");

    const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `
                    Role: Financial Advisor AI.
                    Context: You have access to the user's live financial data below.
                    
                    USER DATA:
                    ${context}
                    
                    USER QUESTION: "${userText}"
                    
                    RULES:
                    1. Use the [TRANSACTION_LOG] to find specific prices.
                    2. Note that NET_CASH_FLOW accounts for expenses AND minimum debt payments.
                    3. If Net Cash Flow is negative, warn the user they are over budget.
                    4. Be concise and friendly.
                    `
                }]
            }]
        })
    });

    const data = await response.json();

    if (!response.ok) {
        return { text: `⚠️ Google API Error: ${data.error?.message || "Unknown"}` };
    }

    if (data.candidates && data.candidates.length > 0) {
        return { text: data.candidates[0].content.parts[0].text };
    } else {
        return { text: "⚠️ AI returned no response." };
    }

  } catch (error) {
    console.error("Network Error:", error);
    return { text: `⚠️ Connection Error: ${error.message}` };
  }
};