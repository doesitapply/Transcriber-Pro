import React, { useRef, useState } from 'react';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };
    
    const onButtonClick = () => {
        inputRef.current?.click();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
                onFileSelect(file);
            } else {
                alert("Please upload a supported audio or video file.");
            }
        }
    };

    return (
        <div className="w-full">
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="audio/*,video/*"
                onChange={handleChange}
                disabled={disabled}
            />
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={onButtonClick}
                className={`
                    relative w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                    ${isDragging 
                        ? 'border-brand-secondary bg-brand-secondary/10 scale-[1.02]' 
                        : 'border-neutral-600 bg-neutral-700/30 hover:border-brand-secondary/50 hover:bg-neutral-700/50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging ? 'bg-brand-secondary/20' : 'bg-neutral-700'}`}>
                    <svg className={`w-8 h-8 ${isDragging ? 'text-brand-secondary' : 'text-neutral-400'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-neutral-200">
                    {isDragging ? "Drop file to upload" : "Click or drag file here"}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                    Supports MP3, WAV, MP4, MOV
                </p>
            </div>
        </div>
    );
};