//
import { startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';

export const analyzeFinances = (transactions, credits, stats) => {
  const insights = [];

  // 1. Check Spending vs Income
  if (stats.projectedSavingsRate < 0) {
     insights.push({
        type: 'critical',
        title: 'Deficit Alert',
        text: `You are projected to overspend by $${Math.abs(stats.netForecast).toFixed(0)} this month.`,
     });
  } else if (stats.projectedSavingsRate < 10 && stats.projectedSavingsRate >= 0) {
     insights.push({
        type: 'warning',
        title: 'Savings Goal',
        text: `You are saving ${stats.projectedSavingsRate.toFixed(1)}%. Try to aim for 20%.`,
     });
  } else {
     insights.push({
        type: 'success',
        title: 'Great Job',
        text: `You are on track to save ${stats.projectedSavingsRate.toFixed(0)}% of your income.`,
     });
  }

  // Add to function
if (text.includes('cut') || text.includes('save more')) {
  const topExpenses = transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map(t => `${t.category}: $${t.amount}`);
  return { text: `Top areas to cut: ${topExpenses.join(', ')}. Reduce by 10% to save extra.`, sender: 'bot' };
}

  // 2. Check Debt (High Utilization)
  const highUtilCards = credits.filter(c => {
      // Handle 'limit' OR 'totalAmount' (CreditStepper uses totalAmount)
      const limit = parseFloat(c.limit || c.totalAmount || 0);
      const balance = parseFloat(c.currentBalance || 0);
      
      // FIX: Added 'creditCard' to match CreditStepper.jsx
      const isCredit = (c.type === 'credit' || c.type === 'credit_card' || c.type === 'creditCard');
      const utilization = limit > 0 ? (balance / limit) : 0;

      return isCredit && utilization > 0.30; // > 30%
  });

  // Loop through ALL results
  highUtilCards.forEach(card => {
      const limit = parseFloat(card.limit || card.totalAmount || 0); 
      const balance = parseFloat(card.currentBalance || 0);
      const utilPercent = Math.round((balance / limit) * 100);
      
      insights.unshift({
          type: 'warning',
          title: 'High Utilization',
          text: `${card.name} is at ${utilPercent}% utilization. Pay it down to improve your score.`,
      });
  });

  return insights;
};


// --- LOGIC 2: CHATBOT ENGINE (The Bot) ---
export const processUserMessage = (msg, transactions, credits, stats, categories) => {
  const text = msg.toLowerCase();
  
  // Default Timeframe: This Month
  let startDate = startOfMonth(new Date());
  let endDate = new Date();
  let timeLabel = "this month";

  // 1. Detect Time Override
  if (text.includes('last month')) {
    const lastMonth = subDays(new Date(), 30);
    startDate = startOfMonth(lastMonth);
    endDate = endOfMonth(lastMonth);
    timeLabel = "last month";
  }

  // --- SKILL A: "CAN I AFFORD X?" ---
  if (text.includes('afford') || text.includes('buy')) {
      const numbers = text.match(/\d+/);
      
      if (numbers) {
          const cost = parseFloat(numbers[0]);
          const freeCash = stats.netForecast; 
          
          if (freeCash > cost) {
              return { 
                  text: `Yes, likely. You have $${freeCash.toFixed(2)} in projected free cash flow. Buying this leaves you with $${(freeCash - cost).toFixed(2)}.`, 
                  sender: 'bot' 
              };
          } else {
              return { 
                  text: `Be careful. That costs $${cost}, but you only have $${freeCash.toFixed(2)} projected free cash. This would put you in a deficit of $${Math.abs(freeCash - cost).toFixed(2)}.`, 
                  sender: 'bot' 
              };
          }
      }
  }

  // --- SKILL B: "HIGHEST SPENDING" ---
  if (text.includes('highest') || text.includes('most expensive') || text.includes('top spend')) {
      const categoryTotals = {};
      
      transactions
        .filter(t => t.type === 'expense' && parseISO(t.date) >= startDate && parseISO(t.date) <= endDate)
        .forEach(t => {
            const catName = t.category || 'Uncategorized';
            categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
        });

      const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

      if (sortedCats.length > 0) {
          const [topCat, topAmount] = sortedCats[0];
          return { text: `Your highest expense ${timeLabel} is ${topCat} at $${topAmount.toFixed(2)}.`, sender: 'bot' };
      } else {
          return { text: `You haven't recorded any expenses ${timeLabel}.`, sender: 'bot' };
      }
  }

  // --- SKILL C: "SUBSCRIPTIONS" ---
  if (text.includes('subscription') || text.includes('recurring') || text.includes('bills')) {
      const subs = transactions.filter(t => t.type === 'expense' && t.isRecurring);
      const totalSubs = subs.reduce((acc, t) => acc + parseFloat(t.amount), 0);
      
      return { 
          text: `You have ${subs.length} recurring subscriptions totaling $${totalSubs.toFixed(2)}/month. This includes things like ${subs.slice(0, 3).map(s => s.category).join(', ')}.`, 
          sender: 'bot' 
      };
  }

  // --- SKILL D: SPENDING QUERIES ---
  const spendingKeywords = ['spend', 'spent', 'cost', 'pay', 'much'];
  if (spendingKeywords.some(w => text.includes(w))) {
    const matchedCategory = categories.find(c => text.includes(c.name.toLowerCase()));
    
    if (matchedCategory) {
      const total = transactions
        .filter(t => {
          const d = parseISO(t.date);
          return t.categoryId === matchedCategory.id && d >= startDate && d <= endDate;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      return { text: `You spent $${total.toFixed(2)} on ${matchedCategory.name} ${timeLabel}.`, sender: 'bot' };
    }
    
    if (text.includes('total')) {
        const total = transactions
            .filter(t => t.type === 'expense' && parseISO(t.date) >= startDate && parseISO(t.date) <= endDate)
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
        return { text: `Total expenses for ${timeLabel}: $${total.toFixed(2)}`, sender: 'bot' };
    }
  }

  // --- SKILL E: CASH FLOW & DEBT ---
  if (text.includes('flow') || text.includes('budget')) {
     const status = stats.netForecast >= 0 ? "positive" : "negative";
     return { text: `Cash Flow is ${status}. You have $${stats.netForecast.toFixed(2)} remaining after bills.`, sender: 'bot' };
  }

  if (text.includes('debt') || text.includes('owe')) {
    const totalDebt = credits.reduce((acc, c) => acc + (parseFloat(c.currentBalance || c.totalAmount) || 0), 0);
    const monthlyMin = credits.reduce((acc, c) => acc + (parseFloat(c.minPayment) || 0), 0);
    return { text: `Total Debt: $${totalDebt.toFixed(2)}. Monthly Min Payments: $${monthlyMin.toFixed(2)}.`, sender: 'bot' };
  }

  return { text: "I can help! Ask: 'Can I afford $200?', 'What is my highest expense?', or 'List my subscriptions'.", sender: 'bot' };
};