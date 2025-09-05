import React from 'react';

interface LoaderProps {
    title?: string;
    subtitle?: string;
}

export const Loader: React.FC<LoaderProps> = ({ 
    title = "Processing...", 
    subtitle 
}) => (
  <div className="flex flex-col items-center justify-center gap-4 text-center">
    <div className="w-12 h-12 border-4 border-neutral-600 border-t-brand-primary rounded-full animate-spin"></div>
    <p className="text-neutral-300 text-lg">{title}</p>
    {subtitle && <p className="text-neutral-400 text-sm">{subtitle}</p>}
  </div>
);