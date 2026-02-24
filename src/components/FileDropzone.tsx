"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, FileAudio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
  speed: number;
  timeRemaining: number;
}

interface FileDropzoneProps {
  onFileDrop: (file: File) => void;
  isLoading?: boolean;
  label?: string;
  uploadProgress?: UploadProgress | null;
}

const ACCEPTED_EXTENSIONS = ".wav,.mp3,.flac,.aiff,.aif,.ogg,.m4a";

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Format seconds to human readable time
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "calculating...";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default function FileDropzone({
  onFileDrop,
  isLoading = false,
  label = "Drop your audio file here",
  uploadProgress = null,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileDrop(files[0]);
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileDrop]
  );

  const handleClick = () => {
    if (!isLoading && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
        // Check if it's an audio file
        if (file.type.startsWith("audio/") || ACCEPTED_EXTENSIONS.includes(ext)) {
          onFileDrop(file);
        }
      }
    },
    [onFileDrop]
  );

  const isUploading = isLoading && uploadProgress !== null;

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`dropzone ${isDragActive ? "active" : ""} ${isLoading ? "opacity-90 cursor-wait" : "cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChange}
        disabled={isLoading}
        className="sr-only"
      />
      <AnimatePresence mode="wait">
        {isUploading && uploadProgress ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center w-full"
          >
            {/* Upload icon with progress ring */}
            <div className="relative w-20 h-20 mb-4">
              {/* Background circle */}
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-[var(--bg-tertiary)]"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="url(#progressGradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - uploadProgress.percent / 100)}`}
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--accent-primary)" />
                    <stop offset="100%" stopColor="var(--accent-secondary)" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Percentage in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gradient">{uploadProgress.percent}%</span>
              </div>
            </div>

            {/* Progress text */}
            <p className="text-[var(--text-primary)] font-medium mb-2">Uploading...</p>
            
            {/* Progress bar */}
            <div className="w-full max-w-xs mb-3">
              <div className="progress-container h-2">
                <motion.div
                  className="progress-bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress.percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col items-center gap-1 text-sm text-[var(--text-muted)]">
              <p>
                {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}
              </p>
              <p className="flex items-center gap-2">
                <span>{formatBytes(uploadProgress.speed)}/s</span>
                <span>•</span>
                <span>{formatTime(uploadProgress.timeRemaining)} remaining</span>
              </p>
            </div>
          </motion.div>
        ) : isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
            </div>
            <p className="text-[var(--text-secondary)]">Processing...</p>
          </motion.div>
        ) : isDragActive ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center"
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <FileAudio className="w-8 h-8 text-[var(--bg-primary)]" />
            </motion.div>
            <p className="text-[var(--accent-primary)] font-medium">Drop it here!</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
            </div>
            <p className="text-[var(--text-primary)] font-medium mb-2">{label}</p>
            <p className="text-sm text-[var(--text-muted)]">
              or click to browse • WAV, MP3, FLAC, AIFF, OGG, M4A
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
