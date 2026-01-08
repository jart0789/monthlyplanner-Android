import React, { useState } from 'react';
import { X, Key, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

export default function ApiKeyModal({ isOpen, onClose, onSave }) {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim().startsWith('AIza')) {
        alert("Invalid Key. It should start with 'AIza'.");
        return;
    }
    setIsSaving(true);
    // Save securely
    await Preferences.set({ key: 'user_google_api_key', value: apiKey.trim() });
    setIsSaving(false);
    onSave(); // Notify parent to refresh
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                <Key className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Unlock AI Advisor</h2>
            <p className="text-indigo-100 text-sm mt-1">Connect your own Brain to FinTracker</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
            
            {/* Disclaimer Box */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900 p-4 rounded-xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong>Note:</strong> You are using the Free Tier of Google Gemini. 
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>Limit: <strong>15 requests per minute</strong>.</li>
                        <li>This is usually enough for personal use.</li>
                        <li>Your data is sent to Google for processing.</li>
                    </ul>
                </div>
            </div>

            {/* Step 1: Get Key */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Step 1: Get your Free Key</label>
                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between w-full p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors group"
                >
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Open Google AI Studio</span>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </a>
            </div>

            {/* Step 2: Paste Key */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Step 2: Paste Key Here</label>
                <input 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
            </div>

            {/* Actions */}
            <button 
                onClick={handleSave}
                disabled={!apiKey}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                {isSaving ? "Verifying..." : "Save & Connect"} 
                {!isSaving && <CheckCircle className="w-5 h-5" />}
            </button>
            
            <button onClick={onClose} className="w-full py-3 text-slate-400 text-sm font-medium hover:text-slate-600">
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
}