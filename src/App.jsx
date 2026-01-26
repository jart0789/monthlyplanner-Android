import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Snapshot from './components/Snapshot'; 
import TransactionList from './components/TransactionList';
import Credits from './components/Credits';
import Settings from './components/Settings';
import { FinanceProvider } from './contexts/FinanceContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'income': return <TransactionList key="income-list" type="income" onNavigate={setActiveTab} />;
      case 'expenses': return <TransactionList key="expense-list" type="expense" onNavigate={setActiveTab} />;
      case 'credits': return <Credits onNavigate={setActiveTab} />;
      case 'snapshot': return <Snapshot onNavigate={setActiveTab} />; 
      case 'settings': return <Settings onNavigate={setActiveTab} />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

 return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
       {/* Just the content, no providers wrapping it */}
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