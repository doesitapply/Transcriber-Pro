import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };
    
    const onButtonClick = () => {
        inputRef.current?.click();
    };

    return (
        <div 
            className="w-full flex flex-col items-center justify-center gap-6"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="audio/*,video/*"
                onChange={handleChange}
                disabled={disabled}
            />
            <div
                onClick={onButtonClick}
                className={`w-full max-w-md h-48 border-2 border-dashed rounded-xl flex flex-col justify-center items-center text-center p-4 cursor-pointer transition-colors duration-300 ${dragActive ? 'border-brand-primary bg-neutral-700' : 'border-neutral-600 hover:border-brand-primary hover:bg-neutral-700'}`}
            >
                <UploadIcon className="w-10 h-10 text-neutral-400 mb-2"/>
                <p className="text-lg text-neutral-300">
                    Drag & drop an audio or video file
                </p>
                <p className="text-neutral-500">or click to browse</p>
            </div>
             <p className="text-sm text-neutral-500 max-w-sm">Your file is processed securely and is not stored after transcription.</p>
        </div>
    );
};
