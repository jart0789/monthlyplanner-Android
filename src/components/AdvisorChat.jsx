import React, { useState, useEffect, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Send, Bot, User, X, Mic, MicOff } from 'lucide-react';
import { processUserMessage } from '../utils/smartAdvisor';
import { useFinance } from '../contexts/FinanceContext';
import ApiKeyModal from './ApiKeyModal'; 

// Helper for conditional classes
const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function AdvisorChat({ onClose }) {
  // 1. EXTRACT CATEGORIES HERE (Critical update)
  const { transactions, credits, categories } = useFinance();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  
  // Optional: If you have voice logic, keep it; otherwise these defaults work
  const [isListening, setIsListening] = useState(false); 

  const endRef = useRef(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    const { value } = await Preferences.get({ key: 'user_google_api_key' });
    if (value) {
        setHasKey(true);
        if (messages.length === 0) {
            setMessages([{ 
                id: 1, 
                text: "Ask me about your spending, debt, or savings!", 
                sender: 'bot' 
            }]);
        }
    } else {
        setHasKey(false);
        setShowKeyModal(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
    setIsTyping(true);

    // 2. PASS CATEGORIES TO AI FUNCTION
    // This allows the AI to see your budget structure
    const reply = await processUserMessage(userText, transactions, credits, categories);
    
    setMessages(prev => [...prev, { id: Date.now() + 1, text: reply.text, sender: 'bot' }]);
    setIsTyping(false);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  
  return (
    <>
      <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-50 dark:bg-slate-900 w-full h-[100dvh]">
        
        {/* --- HEADER --- */}
        <div className="flex-none flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm pt-safe">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-lg">FinTracker AI</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {hasKey ? "Online (Gemini 2.5)" : "Setup Required"}
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
        </div>

        {/* --- CHAT AREA --- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasKey && (
                <div className="text-center mt-20 px-6 animate-fade-in">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Bot className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Connect Your Brain</h4>
                    <p className="text-slate-500 mb-6 text-sm">You need a free Google API Key to enable the financial assistant.</p>
                    <button 
                        onClick={() => setShowKeyModal(true)} 
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
                    >
                        Connect API Key
                    </button>
                </div>
            )}
            
            {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 max-w-[95%] ${msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.sender === 'user' ? "bg-blue-100 dark:bg-blue-900" : "bg-indigo-100 dark:bg-indigo-900"}`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4 text-blue-600 dark:text-blue-300" /> : <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />}
                </div>
                <div className={`p-3 px-4 rounded-2xl text-[15px] shadow-sm ${msg.sender === 'user' ? "bg-blue-600 text-white rounded-tr-none" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700"}`}>
                    <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                    </div>
                </div>
            </div>
            ))}
            
            {isTyping && (
                <div className="flex gap-2 ml-12 items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            )}
            <div ref={endRef} />
        </div>

        {/* --- INPUT AREA (SAFE AREA FIXED) --- */}
        <div 
            className="flex-none p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
            style={{ 
                // 👇 This prevents the input from being hidden behind Android nav buttons
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                paddingTop: '12px'
            }}
        >
            <div className="flex items-center gap-2">
                {/* Voice Button (Optional) */}
                <button 
                    onClick={startListening} 
                    className={cn(
                        "p-3 rounded-full transition-all active:scale-95", 
                        isListening ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                    )}
                >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={!hasKey}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={hasKey ? "Ask a question..." : "Connect Key first"}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 h-12 rounded-full px-5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent transition-all"
                />
                
                <button 
                    onClick={handleSend} 
                    disabled={!input.trim()} 
                    className="p-3 bg-indigo-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      {/* --- API KEY MODAL --- */}
      <ApiKeyModal 
        isOpen={showKeyModal} 
        onClose={() => {
            setShowKeyModal(false);
            if (!hasKey) onClose(); 
        }} 
        onSave={() => {
            setShowKeyModal(false);
            checkKey(); 
        }} 
      />
    </>
  );
}