import React, { useState, useEffect } from 'react';

interface SessionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (sessionName: string, keywords: string[]) => void;
}

export const SessionSetupModal: React.FC<SessionSetupModalProps> = ({ isOpen, onClose, onStart }) => {
  const [sessionName, setSessionName] = useState('');
  const [keywords, setKeywords] = useState('');

  useEffect(() => {
    if (isOpen) {
      const defaultName = `Live Session - ${new Date().toLocaleDateString()}`;
      setSessionName(defaultName);
      setKeywords('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStart = () => {
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
    onStart(sessionName, keywordArray);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-neutral-800 rounded-2xl border border-neutral-700 shadow-2xl p-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">Configure Live Session</h2>
        <p className="text-neutral-400 mb-6">Set up your real-time intelligence monitoring. Both audio and video will be captured for analysis.</p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-neutral-300 mb-1">
              Session Name
            </label>
            <input
              type="text"
              id="session-name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
          </div>
           <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-neutral-300 mb-1">
              Keywords to Track (optional)
            </label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., objection, negligence, Exhibit A"
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
            <p className="text-xs text-neutral-500 mt-1">Separate keywords with commas. The AI will flag these in real-time.</p>
          </div>
        </div>
        
        <div className="flex justify-end mt-8 gap-3 border-t border-neutral-700 pt-6">
          <button onClick={onClose} className="px-5 py-2.5 bg-neutral-600 text-white font-semibold rounded-lg hover:bg-neutral-500 transition-colors">
            Cancel
          </button>
          <button onClick={handleStart} className="px-5 py-2.5 bg-brand-primary text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors">
            Start Live Session
          </button>
        </div>
      </div>
    </div>
  );
};