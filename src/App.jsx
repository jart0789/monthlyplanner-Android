import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import Credits from './components/Credits';
import Settings from './components/Settings';
import { FinanceProvider } from './contexts/FinanceContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'income': return <TransactionList key="income-list" type="income" />;
      case 'expenses': return <TransactionList key="expense-list" type="expense" />;
      case 'credits': return <Credits />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="max-w-md mx-auto w-full pt-6 px-4 pb-24">
        {renderContent()}
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <AppContent />
      </div>
    </FinanceProvider>
  );
}