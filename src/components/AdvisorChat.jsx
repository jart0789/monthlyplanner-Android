import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { processUserMessage } from '../utils/smartAdvisor'; // Ensuring correct import
import { cn } from '../lib/utils';

export default function AdvisorChat({ onClose, visibleStats }) {
  const { transactions, credits, categories } = useFinance();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm your financial assistant. Ask me about your spending, debt, or cash flow.", sender: 'bot' }
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    // 1. Add User Message
    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // 2. Process Reply
    setTimeout(() => {
      const reply = processUserMessage(input, transactions, credits, visibleStats, categories);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: reply.text, sender: 'bot' }]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm shrink-0 safe-top">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Financial Assistant</h3>
            <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", msg.sender === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.sender === 'user' ? "bg-blue-600 text-white" : "bg-indigo-600 text-white")}>
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={cn("p-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm", 
              msg.sender === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area (UPDATED WITH PADDING) */}
      <div 
        className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }} // Extra padding for Android buttons
      >
        <div className="flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your finances..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}