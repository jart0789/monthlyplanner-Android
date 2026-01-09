import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, AlertTriangle, CheckCircle, HelpCircle, X } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

export default function ApiKeyModal({ isOpen, onClose, onSave }) {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
        setApiKey('');
        setShowDisclaimer(false);
        setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Simple validation
    if (!apiKey.trim().startsWith('AIza')) {
        alert("The key doesn't look quite right. It usually starts with the letters 'AIza'. Please check and try again.");
        return;
    }

    setIsSaving(true);
    await Preferences.set({ key: 'user_google_api_key', value: apiKey.trim() });
    setIsSaving(false);

    // TRIGGER THE POPUP INSTEAD OF CLOSING IMMEDIATELY
    setShowDisclaimer(true);

    // Auto-close after 7 seconds
    setTimeout(() => {
        finishAndClose();
    }, 7000);
  };

  const finishAndClose = () => {
    onSave(); // This refreshes the parent and closes the modal
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] relative">
        
        {/* ====================================================================
            POPUP OVERLAY (Shows after clicking Connect)
           ==================================================================== */}
        {showDisclaimer && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
                <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-2xl border border-slate-700 relative">
                    {/* Close 'X' Button */}
                    <button 
                        onClick={finishAndClose}
                        className="absolute -top-3 -right-3 p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-lg z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-5 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Connected!</h3>
                        
                        {/* YOUR DISCLAIMER CODE */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900 p-4 rounded-xl flex gap-3 text-left">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                                <strong>Note:</strong> You are using the Free Tier of Google Gemini. 
                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                    <li>Limit: <strong>15 requests per minute</strong>.</li>
                                    <li>This is usually enough for personal use.</li>
                                    <li>If you exceed this limit, it will trigger a rate limit error.</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 animate-pulse">Closing in a few seconds...</p>
                        
                        <button 
                            onClick={finishAndClose}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ====================================================================
            MAIN FORM (Hidden visually when disclaimer is up, but kept in DOM)
           ==================================================================== */}
        
        {/* Header */}
        <div className="bg-indigo-600 p-5 flex-none">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                    <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Connect AI Assistant</h2>
                    <p className="text-indigo-100 text-xs">Free, private, and secure.</p>
                </div>
            </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5">
            
            {/* INSTRUCTIONS */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    How to get your key (It takes 30 seconds):
                </h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300 space-y-3 border border-slate-100 dark:border-slate-700">
                    <div className="flex gap-3">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center mt-0.5">1</span>
                        <p>Tap the button below to open Google's secure key page.</p>
                    </div>
                    <div className="flex gap-3">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center mt-0.5">2</span>
                        <p>Tap <strong className="text-indigo-600 dark:text-indigo-400">"Get API key"</strong>, then select <strong className="text-indigo-600 dark:text-indigo-400">"Create API key in new project"</strong>.</p>
                    </div>
                    <div className="flex gap-3">
                        <span className="flex-none w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center mt-0.5">3</span>
                        <p>Copy the long code that starts with <code>AIza</code> and paste it here.</p>
                    </div>
                </div>
            </div>

            {/* ACTION: Link Button */}
            <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between w-full p-4 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl transition-colors group"
            >
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Tap here to get your Key</span>
                    <span className="text-xs text-indigo-500/80">Opens Google AI Studio</span>
                </div>
                <ExternalLink className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
            </a>

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* ACTION: Input */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Paste Key Here</label>
                <input 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm shadow-xl"
                />
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
                <button 
                    onClick={handleSave}
                    disabled={!apiKey}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isSaving ? "Connecting..." : "Connect My Assistant"} 
                    {!isSaving && <CheckCircle className="w-5 h-5" />}
                </button>
                
                <button onClick={onClose} className="w-full py-3 text-slate-400 text-sm font-medium hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    I'll do this later
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}