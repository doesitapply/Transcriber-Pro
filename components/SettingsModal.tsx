import React, { useState, useEffect } from 'react';
import { ApiSettings, ApiProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ApiSettings;
  onSave: (settings: ApiSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [settings, setSettings] = useState<ApiSettings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-neutral-800 rounded-lg border border-neutral-700 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-neutral-100 mb-4">API Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="api-provider" className="block text-sm font-medium text-neutral-300 mb-1">
              AI Provider
            </label>
            <select
              id="api-provider"
              value={settings.provider}
              onChange={(e) => setSettings({ ...settings, provider: e.target.value as ApiProvider, groqApiKey: settings.provider === 'groq' ? settings.groqApiKey: '', localUrl: settings.provider === 'local' ? settings.localUrl : '' })}
              className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none"
            >
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="local">Local LLM (OpenAI-compatible)</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">Select the AI service for text-based analysis.</p>
          </div>
          
          {settings.provider === 'groq' && (
            <div>
              <label htmlFor="groq-api-key" className="block text-sm font-medium text-neutral-300 mb-1">
                Groq API Key
              </label>
              <input
                type="password"
                id="groq-api-key"
                value={settings.groqApiKey || ''}
                onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                placeholder="Enter your Groq API key"
                className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
            </div>
          )}

          {settings.provider === 'local' && (
             <div>
              <label htmlFor="local-url" className="block text-sm font-medium text-neutral-300 mb-1">
                Local Server URL
              </label>
              <input
                type="text"
                id="local-url"
                value={settings.localUrl || ''}
                onChange={(e) => setSettings({ ...settings, localUrl: e.target.value })}
                placeholder="e.g., http://localhost:1234/v1"
                className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
               <p className="text-xs text-neutral-500 mt-1">Provide the base URL for your local OpenAI-compatible API.</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-lg">
           <p className="text-sm text-yellow-300">
             <span className="font-bold">Note:</span> Audio transcription, chat, entity extraction, and segment refinement require the **Google Gemini** provider.
           </p>
        </div>
        
        <div className="flex justify-end mt-6 gap-2 border-t border-neutral-700 pt-4">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
