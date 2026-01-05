import { AlertCircle, Lightbulb, CheckCircle } from 'lucide-react';
import { startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';

let insightIdCounter = 0; // Simple counter for unique IDs

export const analyzeFinances = (transactions, credits, stats) => {
  const insights = [];
  insightIdCounter = 0; // Reset per call for consistency

  // 1. Check Spending vs Income
  if (stats.projectedSavingsRate < 0) {
     insights.push({
        id: ++insightIdCounter,
        type: 'critical',
        title: 'Deficit Alert',
        text: `You are projected to overspend by $${Math.abs(stats.netForecast).toFixed(0)} this month.`,
        Icon: AlertCircle,
        gradient: 'from-rose-500 to-red-600'
     });
  } else if (stats.projectedSavingsRate < 10 && stats.projectedSavingsRate >= 0) {
     insights.push({
        id: ++insightIdCounter,
        type: 'warning',
        title: 'Savings Goal',
        text: `You are saving ${stats.projectedSavingsRate.toFixed(1)}%. Try to aim for 20%.`,
        Icon: Lightbulb,
        gradient: 'from-amber-500 to-orange-600'
     });
  } else if (stats.projectedSavingsRate >= 10) {
     insights.push({
        id: ++insightIdCounter,
        type: 'success',
        title: 'Great Job',
        text: `You are on track to save ${stats.projectedSavingsRate.toFixed(0)}% of your income.`,
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
          title: 'High Utilization',
          text: `${card.name} is at ${utilPercent}% utilization. Pay it down to improve your score.`,
          Icon: AlertCircle,
          gradient: 'from-purple-500 to-indigo-600'
      });
  });

  return insights;
};

// --- CHATBOT ENGINE (unchanged except minor cleanup) ---
export const processUserMessage = (msg, transactions, credits, stats, categories) => {
  const text = msg.toLowerCase();
  
  let startDate = startOfMonth(new Date());
  let endDate = new Date();
  let timeLabel = "this month";

  if (text.includes('last month')) {
    const lastMonth = subDays(new Date(), 30);
    startDate = startOfMonth(lastMonth);
    endDate = endOfMonth(lastMonth);
    timeLabel = "last month";
  } else if (text.includes('last week')) {
    startDate = subDays(new Date(), 7);
    timeLabel = "last week";
  }

  if (text.includes('afford')) {
    const match = text.match(/\$?(\d+)/);
    if (match) {
      const amount = parseFloat(match[1]);
      const affordable = amount <= stats.netForecast ? 'yes' : 'no';
      return { text: `Based on your forecast, ${affordable}! You have $${stats.netForecast.toFixed(2)} left after bills.` };
    }
  }

  if (text.includes('highest') || text.includes('most expensive')) {
    const topExpense = transactions
      .filter(t => t.type === 'expense' && parseISO(t.date) >= startDate && parseISO(t.date) <= endDate)
      .sort((a, b) => b.amount - a.amount)[0];
    if (topExpense) {
      return { text: `Your highest expense ${timeLabel} was $${topExpense.amount} on ${topExpense.category}.` };
    }
  }

  if (text.includes('subscription') || text.includes('recurring') || text.includes('bills')) {
      const subs = transactions.filter(t => t.type === 'expense' && t.isRecurring);
      const totalSubs = subs.reduce((acc, t) => acc + parseFloat(t.amount), 0);
      const list = subs.slice(0, 3).map(s => s.category).join(', ') || 'none';
      return { text: `You have ${subs.length} recurring subscriptions totaling $${totalSubs.toFixed(2)}/month. Includes: ${list}.` };
  }

  const spendingKeywords = ['spend', 'spent', 'cost', 'pay', 'much'];
  if (spendingKeywords.some(w => text.includes(w))) {
    const matchedCategory = categories.find(c => text.includes(c.name.toLowerCase()));
    if (matchedCategory) {
      const total = transactions
        .filter(t => t.categoryId === matchedCategory.id && parseISO(t.date) >= startDate && parseISO(t.date) <= endDate)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      return { text: `You spent $${total.toFixed(2)} on ${matchedCategory.name} ${timeLabel}.` };
    }
    if (text.includes('total')) {
        const total = transactions
            .filter(t => t.type === 'expense' && parseISO(t.date) >= startDate && parseISO(t.date) <= endDate)
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
        return { text: `Total expenses ${timeLabel}: $${total.toFixed(2)}` };
    }
  }

  if (text.includes('cut') || text.includes('save more')) {
    const topExpenses = transactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map(t => `${t.category}: $${t.amount}`);
    const list = topExpenses.length > 0 ? topExpenses.join(', ') : 'none';
    return { text: `Top areas to cut: ${list}. Reducing these could help you save more.` };
  }

  if (text.includes('flow') || text.includes('budget')) {
     const status = stats.netForecast >= 0 ? "positive" : "negative";
     return { text: `Cash flow is ${status}. You have $${stats.netForecast.toFixed(2)} remaining after bills.` };
  }

  if (text.includes('debt') || text.includes('owe')) {
    const totalDebt = credits.reduce((acc, c) => acc + (parseFloat(c.currentBalance || 0)), 0);
    const monthlyMin = credits.reduce((acc, c) => acc + (parseFloat(c.minPayment || 0)), 0);
    return { text: `Total debt: $${totalDebt.toFixed(2)}. Monthly minimum payments: $${monthlyMin.toFixed(2)}.` };
  }

  return { text: "I can help with spending, debt, subscriptions, affordability, and more! Try asking about your highest expense or recurring bills." };
};