"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@stackframe/stack";
import Link from "next/link";
import {
  Music2,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  FileAudio,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Zap,
  Mail,
  Crown,
  HardDrive,
  Video,
} from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import WaveformAnimation from "@/components/WaveformAnimation";
import AudioPlayer from "@/components/AudioPlayer";
import dynamic from "next/dynamic";

const VideoGenerator = dynamic(() => import("@/components/video/VideoGenerator"), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teylersf--podcast-mastering-fastapi-app.modal.run";

interface UploadedFile {
  file: File;
  fileId: string;
  name: string;
  size: number;
}

interface ProcessingStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string | null;
  output_file: string | null;
}

interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
  speed: number;
  timeRemaining: number;
}

interface ReferenceTemplate {
  id: string;
  name: string;
  description: string;
}

const PROCESSING_MESSAGES = [
  "Analyzing vocal frequency signatures...",
  "Mapping harmonic resonance patterns...",
  "Calibrating spectral density matrix...",
  "Optimizing dynamic range vectors...",
  "Computing psychoacoustic profiles...",
  "Enhancing vocal presence layers...",
  "Calculating loudness normalization...",
  "Applying perceptual weighting curves...",
  "Running multi-band processing...",
  "Applying intelligent gain staging...",
  "Running final quality check...",
  "Finalizing your masterpiece...",
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface MasteringToolProps {
  compact?: boolean;
  showHeader?: boolean;
}

export default function MasteringTool({ compact = false, showHeader = true }: MasteringToolProps) {
  const [targetFile, setTargetFile] = useState<UploadedFile | null>(null);
  const [templates, setTemplates] = useState<ReferenceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("voice-optimized");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState(false);
  const [targetUploadProgress, setTargetUploadProgress] = useState<UploadProgress | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState(PROCESSING_MESSAGES[0]);
  
  // Mastering settings
  const [outputQuality, setOutputQuality] = useState<"standard" | "high">("standard");
  const [limiterMode, setLimiterMode] = useState<"gentle" | "normal" | "loud">("normal");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Email notification state
  const [notificationEmail, setNotificationEmail] = useState("");
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [emailSubscribing, setEmailSubscribing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const notificationSentRef = useRef(false);
  const conversionTrackedRef = useRef(false);

  // Rate limiting state
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // Storage limit state (for subscribers)
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  // User and subscription state
  const user = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Auto-save to Blob storage for subscribers
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [savingToCloud, setSavingToCloud] = useState(false);

  // HQ purchase state
  const [hqCredits, setHqCredits] = useState(0);
  const [hqCheckoutLoading, setHqCheckoutLoading] = useState(false);
  const [showHqSuccessToast, setShowHqSuccessToast] = useState(false);

  // Video generator state
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [outputR2Key, setOutputR2Key] = useState<string | null>(null);

  // Fetch subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsSubscribed(false);
        return;
      }
      
      try {
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        setIsSubscribed(data.isSubscribed || false);
      } catch (error) {
        console.error("Failed to check subscription:", error);
        setIsSubscribed(false);
      }
    };
    
    checkSubscription();
  }, [user]);

  // Fetch HQ credits status
  useEffect(() => {
    const checkHqCredits = async () => {
      if (!user || isSubscribed) {
        setHqCredits(0);
        return;
      }
      
      try {
        const res = await fetch("/api/hq-purchase/status");
        const data = await res.json();
        setHqCredits(data.credits || 0);
      } catch (error) {
        console.error("Failed to check HQ credits:", error);
        setHqCredits(0);
      }
    };
    
    checkHqCredits();
  }, [user, isSubscribed]);

  // Check for HQ purchase success in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hq_success") === "true") {
      setShowHqSuccessToast(true);
      setHqCredits(1);
      setTimeout(() => setShowHqSuccessToast(false), 5000);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Handle HQ purchase
  const handleHqPurchase = async () => {
    if (!user) {
      // Redirect to sign in
      window.location.href = "/handler/sign-in";
      return;
    }
    
    setHqCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/purchase-hq", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error("HQ checkout error:", error);
      setError("Failed to start checkout");
    } finally {
      setHqCheckoutLoading(false);
    }
  };

  // Check if user can use HQ export
  const canUseHqExport = isSubscribed || hqCredits > 0;

  // Reset to standard quality if user can't use HQ
  useEffect(() => {
    if (!canUseHqExport && outputQuality === "high") {
      setOutputQuality("standard");
    }
  }, [canUseHqExport, outputQuality]);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${API_URL}/templates`);
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates);
          if (data.templates.length > 0) {
            setSelectedTemplate(data.templates[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
        setTemplates([{
          id: "voice-optimized",
          name: "Recommended - Optimized for Voices",
          description: "Professional voice-optimized preset"
        }]);
      }
    };
    fetchTemplates();
  }, []);

  // Upload file using presigned URL pattern (same as home page)
  const uploadFile = async (
    file: File,
    onProgress: (progress: UploadProgress) => void
  ): Promise<string> => {
    // Step 1: Get presigned upload URL from backend
    onProgress({ percent: 0, loaded: 0, total: file.size, speed: 0, timeRemaining: 0 });
    
    const contentType = file.type || "application/octet-stream";
    const urlResponse = await fetch(
      `${API_URL}/get-upload-url?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(contentType)}`,
      { method: "POST" }
    );
    
    if (!urlResponse.ok) {
      const error = await urlResponse.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to get upload URL");
    }
    
    const { file_id, upload_url } = await urlResponse.json();
    
    // Step 2: Upload directly to R2 using XHR (for progress tracking)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          const loadedDiff = event.loaded - lastLoaded;
          
          const instantSpeed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
          const elapsed = (now - startTime) / 1000;
          const avgSpeed = elapsed > 0 ? event.loaded / elapsed : 0;
          const speed = avgSpeed > 0 ? (instantSpeed * 0.3 + avgSpeed * 0.7) : instantSpeed;
          
          const remaining = event.total - event.loaded;
          const timeRemaining = speed > 0 ? remaining / speed : 0;

          // Scale to 0-95% for upload phase
          onProgress({
            percent: Math.round((event.loaded / event.total) * 95),
            loaded: event.loaded,
            total: event.total,
            speed,
            timeRemaining,
          });

          lastLoaded = event.loaded;
          lastTime = now;
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload to storage failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
      xhr.addEventListener("timeout", () => reject(new Error("Upload timed out")));

      // Upload directly to R2 presigned URL
      xhr.open("PUT", upload_url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.timeout = 36000000; // 10 hours
      xhr.send(file);
    });

    // Step 3: Confirm upload to backend
    onProgress({ percent: 98, loaded: file.size, total: file.size, speed: 0, timeRemaining: 0 });
    
    const confirmResponse = await fetch(
      `${API_URL}/confirm-upload?file_id=${file_id}&size=${file.size}`,
      { method: "POST" }
    );
    
    if (!confirmResponse.ok) {
      const error = await confirmResponse.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to confirm upload");
    }

    onProgress({ percent: 100, loaded: file.size, total: file.size, speed: 0, timeRemaining: 0 });
    
    return file_id;
  };

  const handleTargetDrop = useCallback(async (file: File) => {
    setUploadingTarget(true);
    setTargetUploadProgress({ percent: 0, loaded: 0, total: file.size, speed: 0, timeRemaining: 0 });
    setError(null);

    try {
      const fileId = await uploadFile(file, (progress) => {
        setTargetUploadProgress(progress);
      });
      
      setTargetFile({
        file,
        fileId,
        name: file.name,
        size: file.size,
      });
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploadingTarget(false);
      setTargetUploadProgress(null);
    }
  }, []);

  const startMastering = async () => {
    if (!targetFile || !selectedTemplate) return;

    setError(null);
    setIsUploading(true);

    try {
      // Check storage limit for subscribers
      if (isSubscribed) {
        const storageCheck = await fetch("/api/storage/check");
        const storageData = await storageCheck.json();
        
        if (!storageData.canUpload) {
          setStorageInfo({
            used: storageData.used,
            limit: storageData.limit,
            remaining: storageData.remaining,
          });
          setShowStorageModal(true);
          setIsUploading(false);
          return;
        }
      } else {
        // Check rate limit for free users
        const limitUrl = user?.id 
          ? `/api/rate-limit/check?userId=${encodeURIComponent(user.id)}`
          : "/api/rate-limit/check";
        const limitCheck = await fetch(limitUrl);
        const limitData = await limitCheck.json();
        
        if (!limitData.allowed) {
          setShowLimitModal(true);
          setIsUploading(false);
          return;
        }
      }

      const params = new URLSearchParams({
        target_file_id: targetFile.fileId,
        template_id: selectedTemplate,
        output_quality: outputQuality,
        limiter_mode: limiterMode,
      });
      
      const response = await fetch(
        `${API_URL}/master?${params.toString()}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start mastering");
      }

      const data = await response.json();
      
      // Record usage for rate limiting (skip for subscribers)
      if (!isSubscribed) {
        try {
          const recordRes = await fetch("/api/rate-limit/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: data.job_id, userId: user?.id || null }),
          });
          if (!recordRes.ok) {
            console.error("Failed to record usage:", await recordRes.text());
          }
        } catch (err) {
          console.error("Failed to record usage:", err);
        }
      }

      // Consume HQ credit if using high quality and not a subscriber
      if (outputQuality === "high" && !isSubscribed && hqCredits > 0) {
        try {
          const hqRes = await fetch("/api/hq-purchase/status", { method: "POST" });
          const hqData = await hqRes.json();
          if (hqData.success) {
            setHqCredits(hqData.creditsRemaining);
          }
        } catch (err) {
          console.error("Failed to consume HQ credit:", err);
        }
      }

      setJobId(data.job_id);
      setStatus({
        job_id: data.job_id,
        status: "pending",
        progress: 0,
        message: "Starting...",
        output_file: null,
      });

      // Auto-subscribe signed-in users for email notifications
      if (user?.primaryEmail) {
        fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: data.job_id, email: user.primaryEmail }),
        }).then(() => {
          setEmailSubscribed(true);
        }).catch(() => {});
      }

      // Send admin notification
      const templateInfo = templates.find(t => t.id === selectedTemplate);
      fetch("/api/admin/notify-job-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: data.job_id,
          fileName: targetFile.name,
          fileSize: formatFileSize(targetFile.size),
          fileId: targetFile.fileId,
          templateName: templateInfo?.name || selectedTemplate,
          outputQuality,
          limiterMode,
        }),
      }).catch(() => {});

      // Track file for signed-in users (for dashboard display)
      if (user) {
        if (isSubscribed) {
          // Premium user - track job so webhook can save to Blob
          fetch("/api/files/premium-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: data.job_id,
              fileName: targetFile.name,
              fileSize: targetFile.size,
            }),
          }).catch((err) => console.error("Failed to track premium job:", err));
        } else {
          // Free user - track for temporary display
          fetch("/api/files/free-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: data.job_id,
              fileName: targetFile.name,
              fileSize: targetFile.size,
            }),
          }).catch(() => {});
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start mastering");
    } finally {
      setIsUploading(false);
    }
  };

  // Poll for status updates
  useEffect(() => {
    if (!jobId || status?.status === "completed" || status?.status === "failed") {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status/${jobId}`);
        if (response.ok) {
          const data: ProcessingStatus = await response.json();
          setStatus(data);
          // Capture R2 key for transcription
          if (data.output_file) {
            setOutputR2Key(data.output_file);
          }
        }
      } catch (err) {
        console.error("Failed to poll status:", err);
      }
    };

    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [jobId, status?.status]);

  // Cycle through processing messages
  useEffect(() => {
    if (status?.status !== "processing" && status?.status !== "pending") {
      return;
    }

    const cycleMessages = () => {
      setProcessingMessage(prev => {
        const currentIndex = PROCESSING_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % PROCESSING_MESSAGES.length;
        return PROCESSING_MESSAGES[nextIndex];
      });
    };

    const getRandomInterval = () => 2000 + Math.random() * 2000;
    
    let timeoutId: NodeJS.Timeout;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        cycleMessages();
        scheduleNext();
      }, getRandomInterval());
    };
    
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [status?.status]);

  // Track Google Ads conversion when mastering completes
  useEffect(() => {
    if (status?.status === "completed" && !conversionTrackedRef.current) {
      conversionTrackedRef.current = true;
      // Call the Google Ads conversion tracking function
      if (typeof window !== "undefined" && typeof (window as unknown as { gtag_report_conversion: (url?: string) => void }).gtag_report_conversion === "function") {
        (window as unknown as { gtag_report_conversion: (url?: string) => void }).gtag_report_conversion();
      }
    }
  }, [status?.status]);

  // Auto-save for subscribers
  useEffect(() => {
    const saveToSubscriberStorage = async () => {
      if (
        status?.status !== "completed" ||
        !isSubscribed ||
        !jobId ||
        savedToCloud ||
        savingToCloud ||
        !targetFile
      ) {
        return;
      }

      setSavingToCloud(true);
      try {
        const response = await fetch(`${API_URL}/download/${jobId}`);
        if (!response.ok) throw new Error("Failed to fetch file");
        
        const blob = await response.blob();
        const fileName = `mastered-${targetFile.name}`;
        const file = new File([blob], fileName, { type: blob.type });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "output");
        formData.append("jobId", jobId);

        const uploadRes = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          setSavedToCloud(true);
        }
      } catch (error) {
        console.error("Failed to save to cloud storage:", error);
      } finally {
        setSavingToCloud(false);
      }
    };

    saveToSubscriberStorage();
  }, [status?.status, isSubscribed, jobId, savedToCloud, savingToCloud, targetFile]);

  const downloadResult = () => {
    if (!jobId) return;
    window.open(`${API_URL}/download/${jobId}`, "_blank");
  };

  const resetSession = () => {
    setTargetFile(null);
    setSelectedTemplate(templates[0]?.id || "voice-optimized");
    setJobId(null);
    setStatus(null);
    setError(null);
    setNotificationEmail("");
    setEmailSubscribed(false);
    setEmailError(null);
    notificationSentRef.current = false;
    conversionTrackedRef.current = false;
    setSavedToCloud(false);
    setSavingToCloud(false);
  };

  const subscribeToNotifications = async () => {
    if (!jobId || !notificationEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(notificationEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailSubscribing(true);
    setEmailError(null);

    try {
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, email: notificationEmail }),
      });

      if (!response.ok) throw new Error("Failed to subscribe");
      setEmailSubscribed(true);
    } catch (err) {
      setEmailError("Failed to subscribe. Please try again.");
    } finally {
      setEmailSubscribing(false);
    }
  };

  const isProcessing = status?.status === "processing" || status?.status === "pending";
  const isCompleted = status?.status === "completed";
  const isFailed = status?.status === "failed";

  return (
    <div className={compact ? "" : ""}>
      {/* HQ Purchase Success Toast */}
      <AnimatePresence>
        {showHqSuccessToast && (
          <motion.div
            className="mb-6 p-4 rounded-xl bg-(--success-muted) border border-[rgba(34,197,94,0.3)] flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Sparkles className="w-5 h-5 text-(--success) shrink-0" />
            <div>
              <p className="font-medium text-(--success)">HQ Export Unlocked!</p>
              <p className="text-sm text-(--text-secondary)">You now have 1 high-quality 24-bit export credit</p>
            </div>
            <button
              onClick={() => setShowHqSuccessToast(false)}
              className="ml-auto text-(--success) hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-6 p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertCircle className="w-5 h-5 text-(--error) shrink-0" />
            <span className="text-(--error)">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-(--error) hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rate Limit Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowLimitModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md glass-card p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                onClick={() => setShowLimitModal(false)}
                className="absolute top-4 right-4 text-(--text-muted) hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(234,179,8,0.1)] flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-(--warning)" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">Weekly Limit Reached</h3>
              <p className="text-(--text-secondary) text-sm mb-6 text-center">
                Free users can master 2 files per week. Upgrade for unlimited mastering.
              </p>
              <Link href="/pricing" className="btn-primary w-full">
                <Crown className="w-5 h-5" />
                Upgrade to Unlimited
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storage Limit Modal (for subscribers) */}
      <AnimatePresence>
        {showStorageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowStorageModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md glass-card p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                onClick={() => setShowStorageModal(false)}
                className="absolute top-4 right-4 text-(--text-muted) hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
                <HardDrive className="w-8 h-8 text-(--error)" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">Storage Full</h3>
              <p className="text-(--text-secondary) text-sm mb-4 text-center">
                You&apos;ve reached your 5GB storage limit. Delete some files to free up space.
              </p>
              {storageInfo && (
                <div className="mb-6 p-3 rounded-lg bg-(--bg-tertiary)">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-(--text-muted)">Used</span>
                    <span className="font-medium">{formatFileSize(storageInfo.used)} / {formatFileSize(storageInfo.limit)}</span>
                  </div>
                  <div className="h-2 bg-(--bg-secondary) rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-(--error) rounded-full"
                      style={{ width: `${Math.min((storageInfo.used / storageInfo.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <Link href="/dashboard" className="btn-primary w-full">
                <HardDrive className="w-5 h-5" />
                Manage Files
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {!isProcessing && !isCompleted && !isFailed ? (
        <div>
          {/* Upload Section */}
          <div className={`grid ${compact ? "grid-cols-1" : "md:grid-cols-2"} gap-5 mb-6`}>
            {/* Target Upload */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-(--accent-muted) flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-(--accent-primary)" />
                </div>
                <div>
                  <h3 className="font-semibold">Your Podcast</h3>
                  <p className="text-sm text-(--text-muted)">Upload the audio to master</p>
                </div>
              </div>

              {targetFile ? (
                <div className="file-info">
                  <div className="file-icon">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{targetFile.name}</p>
                    <p className="text-sm text-(--text-muted)">{formatFileSize(targetFile.size)}</p>
                  </div>
                  <button
                    onClick={() => setTargetFile(null)}
                    className="p-2 hover:bg-(--bg-secondary) rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-(--text-muted)" />
                  </button>
                </div>
              ) : (
                <FileDropzone
                  onFileDrop={handleTargetDrop}
                  isLoading={uploadingTarget}
                  label="Drop your podcast audio"
                  uploadProgress={targetUploadProgress}
                />
              )}
            </div>

            {/* Mastering Preset Selector */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-(--accent-muted) flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-(--accent-primary)" />
                </div>
                <div>
                  <h3 className="font-semibold">Mastering Preset</h3>
                  <p className="text-sm text-(--text-muted)">Choose your sound profile</p>
                </div>
              </div>

              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedTemplate === template.id
                        ? "border-(--accent-primary) bg-(--accent-muted)"
                        : "border-(--border-subtle) hover:border-(--border-medium)"
                    }`}
                  >
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-(--text-muted) mt-0.5">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="glass-card mb-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-(--text-muted)" />
                <span className="font-medium">Advanced Settings</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-(--text-muted)" />
              ) : (
                <ChevronDown className="w-5 h-5 text-(--text-muted)" />
              )}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    {/* Output Quality */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-(--text-secondary)">Output Quality</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setOutputQuality("standard")}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            outputQuality === "standard"
                              ? "border-(--accent-primary) bg-(--accent-muted)"
                              : "border-(--border-subtle) hover:border-(--border-medium)"
                          }`}
                        >
                          <p className="font-medium text-sm">Standard (16-bit)</p>
                          <p className="text-xs text-(--text-muted) mt-0.5">Great for podcasts</p>
                        </button>
                        <button
                          onClick={() => canUseHqExport && setOutputQuality("high")}
                          disabled={!canUseHqExport}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            outputQuality === "high"
                              ? "border-(--accent-primary) bg-(--accent-muted)"
                              : !canUseHqExport
                                ? "border-(--border-subtle) opacity-60 cursor-not-allowed"
                                : "border-(--border-subtle) hover:border-(--border-medium)"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">High Quality (24-bit)</p>
                            {!canUseHqExport && <Crown className="w-3 h-3 text-(--warning)" />}
                            {hqCredits > 0 && !isSubscribed && (
                              <span className="text-xs bg-(--success-muted) text-(--success) px-1.5 py-0.5 rounded">
                                {hqCredits} credit
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-(--text-muted) mt-0.5">
                            {isSubscribed ? "Professional production" : hqCredits > 0 ? "1 credit will be used" : "Unlock below"}
                          </p>
                        </button>
                      </div>
                      
                      {/* $1 HQ Purchase Option */}
                      {!isSubscribed && hqCredits === 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-linear-to-r from-[rgba(224,122,76,0.08)] to-[rgba(196,105,61,0.08)] border border-[rgba(224,122,76,0.25)]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">Try 24-bit HQ Export — $1</p>
                              <p className="text-xs text-(--text-muted)">Exact format for Spotify, Apple Podcasts & YouTube</p>
                            </div>
                            <button
                              onClick={handleHqPurchase}
                              disabled={hqCheckoutLoading}
                              className="px-4 py-2 rounded-lg bg-linear-to-r from-[#e07a4c] to-[#c4693d] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
                            >
                              {hqCheckoutLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  $1
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Limiter Mode */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                        <span className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5" />
                          Loudness
                        </span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "gentle", name: "Gentle", desc: "Dynamic" },
                          { id: "normal", name: "Normal", desc: "Balanced" },
                          { id: "loud", name: "Loud", desc: "Maximum" },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setLimiterMode(mode.id as typeof limiterMode)}
                            className={`p-3 rounded-lg border text-center transition-all ${
                              limiterMode === mode.id
                                ? "border-(--accent-primary) bg-(--accent-muted)"
                                : "border-(--border-subtle) hover:border-(--border-medium)"
                            }`}
                          >
                            <p className="font-medium text-sm">{mode.name}</p>
                            <p className="text-xs text-(--text-muted)">{mode.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Master Button */}
          <button
            onClick={startMastering}
            disabled={!targetFile || !selectedTemplate || isUploading}
            className="btn-primary w-full justify-center py-4"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Master My Podcast</span>
              </>
            )}
          </button>
        </div>
      ) : isProcessing ? (
        /* Processing View */
        <div className="glass-card p-8 text-center">
          <div className="mb-6">
            <WaveformAnimation />
          </div>
          <h2 className="text-xl font-semibold mb-2">Mastering in Progress</h2>
          <p className="text-(--text-secondary) text-sm mb-4">{processingMessage}</p>
          
          <div className="w-full bg-(--bg-tertiary) rounded-full h-2 mb-4">
            <div
              className="bg-(--accent-primary) h-2 rounded-full transition-all duration-500"
              style={{ width: `${status?.progress || 0}%` }}
            />
          </div>
          <p className="text-sm text-(--text-muted)">{status?.progress || 0}% complete</p>

          {/* Email notification */}
          {user?.primaryEmail ? (
            // Signed-in user - auto-subscribed
            <div className="mt-6 p-4 rounded-lg bg-(--bg-secondary) border border-(--border-subtle)">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-(--success)" />
                <p className="text-sm">
                  We&apos;ll email you at <span className="font-medium">{user.primaryEmail}</span> when ready.
                </p>
              </div>
              <p className="text-xs text-(--text-muted) mt-2">You can close this window safely.</p>
            </div>
          ) : !emailSubscribed ? (
            // Guest user - show email form
            <div className="mt-6 p-4 rounded-lg bg-(--bg-secondary) border border-(--border-subtle)">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-(--accent-primary)" />
                <p className="text-sm font-medium">Get notified when ready</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 rounded-lg bg-(--bg-tertiary) border border-(--border-subtle) text-sm"
                />
                <button
                  onClick={subscribeToNotifications}
                  disabled={emailSubscribing || !notificationEmail}
                  className="px-4 py-2 rounded-lg bg-(--accent-primary) text-white text-sm font-medium"
                >
                  {emailSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Notify Me"}
                </button>
              </div>
              {emailError && <p className="text-xs text-(--error) mt-2">{emailError}</p>}
              <p className="text-xs text-(--text-muted) mt-2">You can close this window. We&apos;ll email you when ready.</p>
            </div>
          ) : (
            // Guest user - already subscribed
            <div className="mt-6 p-4 rounded-lg bg-(--bg-secondary) border border-(--border-subtle)">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-(--success)" />
                <p className="text-sm">We&apos;ll email you when ready. You can close this window.</p>
              </div>
            </div>
          )}
        </div>
      ) : isCompleted ? (
        /* Completed View */
        <div className="glass-card p-8 text-center">
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <CheckCircle2 className="w-8 h-8 text-(--success)" />
          </motion.div>

          <h2 className="text-xl font-semibold mb-2">Mastering Complete!</h2>
          <p className="text-(--text-secondary) text-sm mb-4">Your podcast is ready for download.</p>

          {isSubscribed && (
            <div className="mb-4">
              {savingToCloud ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--bg-secondary) text-xs text-(--text-secondary)">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving to cloud...
                </span>
              ) : savedToCloud ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--success-muted) text-xs text-(--success)">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved to cloud
                </span>
              ) : null}
            </div>
          )}

          {!isSubscribed && (
            <p className="text-xs text-(--text-muted) mb-4">
              ⏰ Link expires in 24h.{" "}
              <Link href="/pricing" className="text-(--warning) hover:underline">Subscribe</Link> to keep forever.
            </p>
          )}

          {jobId && (
            <div className="mb-6">
              <AudioPlayer src={`${API_URL}/download/${jobId}`} />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={downloadResult} className="btn-primary">
                <Download className="w-5 h-5" />
                Download Audio
              </button>
              <button
                onClick={() => {
                  // Get audio duration before opening video generator
                  const audio = new Audio(`${API_URL}/download/${jobId}`);
                  audio.addEventListener("loadedmetadata", () => {
                    setAudioDuration(audio.duration);
                    setShowVideoGenerator(true);
                  });
                }}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" />
                Generate Video
              </button>
            </div>
            <button
              onClick={resetSession}
              className="px-4 py-3 rounded-xl border border-(--border-subtle) hover:border-(--accent-primary) transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Master Another
            </button>
          </div>
        </div>
      ) : (
        /* Failed View */
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-(--error)" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Mastering Failed</h2>
          <p className="text-(--text-secondary) text-sm mb-4">{status?.message || "An error occurred"}</p>
          <button onClick={resetSession} className="btn-primary">
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      )}

      {/* Video Generator Modal */}
      <AnimatePresence>
        {showVideoGenerator && jobId && (
          <VideoGenerator
            audioUrl={`${API_URL}/download/${jobId}`}
            audioDuration={audioDuration}
            fileName={targetFile?.name || "mastered_podcast"}
            r2Key={outputR2Key || undefined}
            onClose={() => setShowVideoGenerator(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

