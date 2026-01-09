import React, { useState, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Moon, Sun, Globe, DollarSign, Plus, Trash2, Edit2, Check, Bell, CreditCard, RefreshCw, Smartphone, Brain, DownloadCloud, AlertTriangle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../lib/utils';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useModelManager } from '../hooks/useModelManager';
import { Preferences } from '@capacitor/preferences';

// Expanded Icon Options
const ICON_OPTIONS = [
  'Tag', 'Home', 'Coffee', 'Car', 'Zap', 'Smartphone', 'Briefcase', 'ShoppingBag', 
  'Utensils', 'Plane', 'Heart', 'Music', 'Book', 'Gift', 'Shield', 'Wifi',
  'CreditCard', 'Banknote', 'Landmark', 'PiggyBank', 'Receipt', 'Wallet', 'TrendingUp', 
  'CircleDollarSign', 'ShoppingCart', 'Basket', 'Truck', 'Package',
  'Stethoscope', 'Pill', 'Dumbbell', 'Activity', 'Gamepad', 'Tv', 'Monitor', 'Camera', 
  'Headphones', 'Wrench', 'Droplet', 'Hammer', 'Lightbulb', 'GraduationCap', 'School', 
  'Award', 'Baby', 'Dog', 'Cat', 'Users', 'User', 'Sun', 'Moon', 'Umbrella', 'Cloud',
  'Globe', 'Map', 'MapPin', 'Smile', 'Star', 'Key', 'Lock', 'Flag', 'Anchor', 'Bus', 'Train'
];

const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
  '#F43F5E', // Rose
  '#EAB308', // Yellow
  '#78716C', // Stone
  '#475569', // Slate Dark
  '#000000', // Black
];
export default function Settings() {
  const { settings, setTheme, setLanguage, setCurrency, updateNotificationSetting, categories, addCategory, updateCategory, deleteCategory, t, notificationTime } = useFinance();
  const [activeTab, setActiveTab] = useState('general'); 
  const { isReady, fileExists, isDownloading, downloadProgress, downloadModel, deleteModel } = useModelManager();
  
  // --- NEW: API KEY STATE ---
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
     checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
     const { value } = await Preferences.get({ key: 'user_google_api_key' });
     setHasApiKey(!!value);
  };

  const handleRemoveKey = async () => {
     if(confirm("Disconnect your Google API Key? You will need to enter it again to use the AI Advisor.")) {
         await Preferences.remove({ key: 'user_google_api_key' });
         setHasApiKey(false);
     }
  };
  // ---------------------------

  // --- CATEGORY FORM STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#3B82F6', icon: 'Tag', notificationsEnabled: false });

  const resetForm = () => { setCatForm({ name: '', type: 'expense', color: '#3B82F6', icon: 'Tag', notificationsEnabled: false }); setIsEditing(false); setEditingId(null); };
  const handleEditClick = (cat) => { setCatForm({ name: cat.name, type: cat.type, color: cat.color || '#94a3b8', icon: cat.icon || 'Tag', notificationsEnabled: cat.notificationsEnabled || false }); setEditingId(cat.id); setIsEditing(true); setActiveTab('categories'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSaveCategory = () => {
    if (!catForm.name) return alert("Category name is required");
    if (isEditing && editingId) { updateCategory(editingId, catForm); } else { addCategory(catForm.name, catForm.type, catForm.icon, catForm.color, catForm.notificationsEnabled); }
    resetForm();
  };

  const getNotifState = (key) => settings.notifications ? settings.notifications[key] : false;
  const getNotifValue = (key) => settings.notifications ? (settings.notifications[key] || 0) : 0;
  
  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings')}</h1>

      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button onClick={() => setActiveTab('general')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'general' ? "bg-white dark:bg-slate-700 shadow-xl text-slate-900 dark:text-white" : "text-slate-500")}>General</button>
        <button onClick={() => setActiveTab('categories')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'categories' ? "bg-white dark:bg-slate-700 shadow-xl text-slate-900 dark:text-white" : "text-slate-500")}>Categories</button>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">{settings.theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-500"/> : <Sun className="w-5 h-5 text-amber-500"/>}</div>
              <span className="font-bold text-slate-700 dark:text-white">Dark Mode</span>
            </div>
            <button onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')} className={cn("w-12 h-7 rounded-full transition-colors relative", settings.theme === 'dark' ? "bg-indigo-500" : "bg-slate-300")}>
              <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-xl", settings.theme === 'dark' ? "left-6" : "left-1")} />
            </button>
          </div>

          <h4 className="text-xs font-bold text-slate-400 uppercase mt-4 ml-1">{t('notifications')}</h4>
          <div className="space-y-3">
             
             {/* 1. Bill Reminders */}
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-slate-700 text-indigo-600 rounded-lg"><Bell className="w-5 h-5"/></div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-white">Bill Reminders</span>
                    <span className="text-xs text-slate-400">Alerts for categories with reminders on.</span>
                  </div>
                </div>
                <button onClick={() => updateNotificationSetting('bill_reminders', !getNotifState('bill_reminders'))} className={cn("w-12 h-7 rounded-full transition-colors relative", getNotifState('bill_reminders') ? "bg-indigo-600" : "bg-slate-300")}>
                  <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-xl", getNotifState('bill_reminders') ? "left-6" : "left-1")} />
                </button>
             </div>

             {/* 2. Loan Dates */}
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-slate-700 text-blue-600 rounded-lg"><CreditCard className="w-5 h-5"/></div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-white">Loans & Credit Cards</span>
                        <span className="text-xs text-slate-400">Alert before payment is due.</span>
                      </div>
                    </div>
                    <button onClick={() => updateNotificationSetting('loan_dates', !getNotifState('loan_dates'))} className={cn("w-12 h-7 rounded-full transition-colors relative", getNotifState('loan_dates') ? "bg-blue-600" : "bg-slate-300")}>
                      <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-xl", getNotifState('loan_dates') ? "left-6" : "left-1")} />
                    </button>
                </div>
                <div className={cn("flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 transition-opacity", getNotifState('loan_dates') ? "opacity-100" : "opacity-40 pointer-events-none")}>
                    <span className="text-xs font-bold text-slate-500">Days Before Due Date:</span>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" max="30" value={getNotifValue('loan_notify_days')} onChange={(e) => updateNotificationSetting('loan_notify_days', parseInt(e.target.value))} className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                        <span className="text-xs text-slate-400">days</span>
                    </div>
                </div>
             </div>

             {/* 3. Autopayments */}
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-slate-700 text-emerald-600 rounded-lg"><RefreshCw className="w-5 h-5"/></div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-white">Autopay Alerts</span>
                    <span className="text-xs text-slate-400">Notify for automatic payments.</span>
                  </div>
                </div>
                <button onClick={() => updateNotificationSetting('autopay', !getNotifState('autopay'))} className={cn("w-12 h-7 rounded-full transition-colors relative", getNotifState('autopay') ? "bg-emerald-600" : "bg-slate-300")}>
                  <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-xl", getNotifState('autopay') ? "left-6" : "left-1")} />
                </button>
             </div>

          </div>
          {/* ... Regional Settings ... */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-500"/></div>
                <span className="font-bold text-slate-700 dark:text-white">Currency</span>
             </div>
             <select value={settings.currency} onChange={(e) => setCurrency(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 font-bold text-sm text-slate-700 dark:text-white outline-none">
               <option value="USD">USD ($)</option>
               <option value="EUR">EUR (€)</option>
               <option value="GBP">GBP (£)</option>
               <option value="JPY">JPY (¥)</option>
             </select>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Globe className="w-5 h-5 text-blue-500"/></div>
                <span className="font-bold text-slate-700 dark:text-white">Language</span>
             </div>
             <select value={settings.language} onChange={(e) => setLanguage(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 font-bold text-sm text-slate-700 dark:text-white outline-none">
               <option value="en">English</option>
               <option value="es">Español</option>
               <option value="pt">Português</option>
               <option value="fr">Français</option>
             </select>
          </div>
       
         {/* API KEY CONFIG */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
             <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Brain className="w-5 h-5"/></div>
                <div className="flex flex-col">
                   <span className="font-bold text-slate-700 dark:text-white">AI Configuration</span>
                   <span className="text-xs text-slate-400">
                     {hasApiKey ? "API Key Connected" : "Not Configured"}
                   </span>
                </div>
             </div>
             
             {hasApiKey ? (
                <button onClick={handleRemoveKey} className="w-full py-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900">
                   <Trash2 className="w-4 h-4"/> Disconnect API Key
                </button>
             ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 mb-2">Connect your Google Gemini Key to enable the AI Advisor.</p>
                    <span className="text-xs font-bold text-indigo-500">Go to Dashboard &gt; Chat to setup.</span>
                </div>
             )}
          </div>

        </div>
      )}

      {/* --- CATEGORIES TAB --- */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl">
             <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
               {isEditing ? <Edit2 className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
               {isEditing ? 'Edit Category' : 'Add New Category'}
             </h3>
             <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Name</label>
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. Groceries" className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Type</label>
                      <div className="flex p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                         <button onClick={() => setCatForm({...catForm, type: 'expense'})} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", catForm.type === 'expense' ? "bg-white dark:bg-slate-700 shadow-xl text-rose-500" : "text-slate-400")}>Expense</button>
                         <button onClick={() => setCatForm({...catForm, type: 'income'})} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", catForm.type === 'income' ? "bg-white dark:bg-slate-700 shadow-xl text-emerald-500" : "text-slate-400")}>Income</button>
                      </div>
                   </div>
                </div>
                {catForm.type === 'expense' && (
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl flex justify-between items-center border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Bell className="w-4 h-4"/></div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-white">Bill Reminders</span>
                          <span className="text-[10px] text-slate-400">Alert on transaction date (Note included)</span>
                       </div>
                    </div>
                    <button onClick={() => setCatForm({...catForm, notificationsEnabled: !catForm.notificationsEnabled})} className={cn("w-10 h-6 rounded-full transition-colors relative", catForm.notificationsEnabled ? "bg-indigo-500" : "bg-slate-300")}>
                      <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-xl", catForm.notificationsEnabled ? "left-5" : "left-1")} />
                    </button>
                  </div>
                )}
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Color</label>
                   <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} onClick={() => setCatForm({...catForm, color: c})} className={cn("w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center", catForm.color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800" : "")} style={{ backgroundColor: c }}>
                          {catForm.color === c && <Check className="w-4 h-4 text-white"/>}
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Icon</label>
                   <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {ICON_OPTIONS.map(iconName => {
                         const Icon = LucideIcons[iconName] || LucideIcons.Tag;
                         return (
                           <button key={iconName} onClick={() => setCatForm({...catForm, icon: iconName})} className={cn("p-2 rounded-lg border transition-all", catForm.icon === iconName ? "bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400" : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700")}>
                             <Icon className="w-5 h-5"/>
                           </button>
                         )
                      })}
                   </div>
                </div>
                <div className="flex gap-3 pt-2">
                   {isEditing && (
                     <button onClick={resetForm} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-xl">Cancel</button>
                   )}
                   <button onClick={handleSaveCategory} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                     {isEditing ? <SaveIcon className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                     {isEditing ? 'Update Category' : 'Add Category'}
                   </button>
                </div>
             </div>
          </div>
          {/* List - Income */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Income Categories</h4>
            <div className="space-y-2">
               {categories.filter(c => c.type === 'income').map(cat => (
                 <CategoryItem key={cat.id} cat={cat} onEdit={() => handleEditClick(cat)} onDelete={() => deleteCategory(cat.id)} />
               ))}
            </div>
          </div>
          {/* List - Expense */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Expense Categories</h4>
            <div className="space-y-2">
               {categories.filter(c => c.type === 'expense').map(cat => (
                 <CategoryItem key={cat.id} cat={cat} onEdit={() => handleEditClick(cat)} onDelete={() => deleteCategory(cat.id)} />
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function CategoryItem({ cat, onEdit, onDelete }) {
  const Icon = LucideIcons[cat.icon] || LucideIcons.Tag;
  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group">
       <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xl" style={{ backgroundColor: cat.color || '#94a3b8' }}>
             <Icon className="w-5 h-5"/>
          </div>
          <div className="flex flex-col">
             <span className="font-bold text-slate-700 dark:text-white">{cat.name}</span>
             {cat.notificationsEnabled && (
                <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold">
                    <Bell className="w-3 h-3"/> Reminders On
                </div>
             )}
          </div>
       </div>
       <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
             <Edit2 className="w-4 h-4"/>
          </button>
          <button onClick={() => { if(confirm('Delete this category?')) onDelete(); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
             <Trash2 className="w-4 h-4"/>
          </button>
       </div>
    </div>
  );
}
function SaveIcon({ className }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
}