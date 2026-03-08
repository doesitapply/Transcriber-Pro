import React, { useState, useEffect, useRef } from 'react';
import { Message, Status } from '../types';
import { SendIcon } from './Icons';
import { Loader } from './Loader';

interface ChatPanelProps {
  history: Message[];
  status: Status;
  error?: string;
  onSendMessage: (message: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ history, status, error, onSendMessage }) => {
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status !== Status.Loading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-900 rounded-lg border border-neutral-700">
      <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
        {history.length === 0 && (
          <div className="text-center text-neutral-500 h-full flex items-center justify-center">
            <p>Ask a question about the transcript to get started.</p>
          </div>
        )}
        {history.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xl px-4 py-2 rounded-lg ${
                msg.role === 'user' ? 'bg-brand-primary text-white' : 'bg-neutral-700 text-neutral-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {status === Status.Loading && (
          <div className="flex justify-start">
             <div className="max-w-xl px-4 py-2 rounded-lg bg-neutral-700 text-neutral-200">
                <Loader title="" subtitle="Thinking..."/>
             </div>
          </div>
        )}
        {status === Status.Error && (
            <div className="flex justify-start">
                <div className="max-w-xl px-4 py-2 rounded-lg bg-brand-danger/20 text-red-300 border border-brand-danger/50">
                    <p><strong>Error:</strong> {error || 'Could not get a response.'}</p>
                </div>
            </div>
        )}
      </div>
      <div className="flex-shrink-0 p-4 border-t border-neutral-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the transcript..."
            disabled={status === Status.Loading}
            className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === Status.Loading || !input.trim()}
            className="p-2 bg-brand-primary text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};