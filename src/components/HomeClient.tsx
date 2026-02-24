"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@stackframe/stack";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Upload,
  Music2,
  Wand2,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Headphones,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileAudio,
  X,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Settings,
  Zap,
  Mail,
  Bell,
  Crown,
  User,
  LogIn,
  HardDrive,
  Mic,
  Video,
  Film,
  Palette,
} from "lucide-react";
import FileDropzone from "@/components/FileDropzone";

// Dynamic imports for components not needed on initial load
const WaveformAnimation = dynamic(() => import("@/components/WaveformAnimation"), {
  loading: () => <div className="h-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" /></div>,
});

const AudioPlayer = dynamic(() => import("@/components/AudioPlayer"), {
  loading: () => <div className="h-20 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />,
});

const ThemeSelector = dynamic(() => import("@/components/ThemeSelector"), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.1)] animate-pulse" />,
});

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
  "Extracting tonal fingerprints...",
  "Running neural clarity enhancement...",
  "Optimizing dynamic range vectors...",
  "Computing psychoacoustic profiles...",
  "Aligning phase coherence nodes...",
  "Detecting sibilance hotspots...",
  "Smoothing transient artifacts...",
  "Balancing stereo field geometry...",
  "Enhancing vocal presence layers...",
  "Calculating loudness normalization...",
  "Applying perceptual weighting curves...",
  "Reconstructing harmonic overtones...",
  "Fine-tuning mid-side separation...",
  "Running multi-band processing...",
  "Engaging transparent limiting...",
  "Applying intelligent gain staging...",
  "Running final quality check...",
  "Packaging mastered audio...",
  "Finalizing your masterpiece...",
];

export default function HomeClient() {
  const [targetFile, setTargetFile] = useState<UploadedFile | null>(null);
  const [templates, setTemplates] = useState<ReferenceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("voice-optimized");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState(false);
  const [targetUploadProgress, setTargetUploadProgress] = useState<UploadProgress | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(PROCESSING_MESSAGES[0]);
  
  const [outputQuality, setOutputQuality] = useState<"standard" | "high">("standard");
  const [limiterMode, setLimiterMode] = useState<"gentle" | "normal" | "loud">("normal");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [notificationEmail, setNotificationEmail] = useState("");
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [emailSubscribing, setEmailSubscribing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const notificationSentRef = useRef(false);

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  const user = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const [hqCredits, setHqCredits] = useState(0);
  const [hqCheckoutLoading, setHqCheckoutLoading] = useState(false);
  const [showHqSuccessToast, setShowHqSuccessToast] = useState(false);

  // Video generator state
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [outputR2Key, setOutputR2Key] = useState<string | null>(null);

  const canUseHqExport = isSubscribed || hqCredits > 0;

  // Lazy load subscription check
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsSubscribed(false);
        setHqCredits(0);
        if (outputQuality === "high") {
          setOutputQuality("standard");
        }
        return;
      }
      
      setCheckingSubscription(true);
      try {
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        setIsSubscribed(data.isSubscribed || false);
        if (!data.isSubscribed && outputQuality === "high") {
          setOutputQuality("standard");
        }
      } catch (error) {
        console.error("Failed to check subscription:", error);
        setIsSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    };
    
    checkSubscription();
  }, [user]);

  useEffect(() => {
    const checkHqCredits = async () => {
      if (!user || isSubscribed) {
        return;
      }
      
      try {
        const res = await fetch("/api/hq-purchase/status");
        const data = await res.json();
        setHqCredits(data.credits || 0);
      } catch (error) {
        console.error("Failed to check HQ credits:", error);
      }
    };
    
    checkHqCredits();
  }, [user, isSubscribed]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hq_success") === "true") {
      setShowHqSuccessToast(true);
      setHqCredits(1);
      setTimeout(() => setShowHqSuccessToast(false), 5000);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleHqPurchase = async () => {
    if (!user) {
      window.location.href = "/handler/sign-up?after_auth_return_to=/";
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

  // Fetch templates - defer until interaction or after initial render
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
    // Defer template fetch to not block initial render
    const timer = setTimeout(fetchTemplates, 100);
    return () => clearTimeout(timer);
  }, []);

  const uploadFile = async (
    file: File,
    onProgress: (progress: UploadProgress) => void
  ): Promise<string> => {
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

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("Upload timed out"));
      });

      xhr.open("PUT", upload_url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.timeout = 36000000;
      xhr.send(file);
    });

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
    setError(null);
    setUploadingTarget(true);
    setTargetUploadProgress({ percent: 0, loaded: 0, total: file.size, speed: 0, timeRemaining: 0 });
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
      setError(err instanceof Error ? err.message : "Failed to upload target file");
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

      if (user?.primaryEmail) {
        fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: data.job_id, email: user.primaryEmail }),
        }).then(() => {
          setEmailSubscribed(true);
        }).catch(() => {});
      }

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

      if (user) {
        if (isSubscribed) {
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

  const downloadResult = () => {
    if (!jobId) return;
    window.open(`${API_URL}/download/${jobId}`, "_blank");
  };

  const [savedToCloud, setSavedToCloud] = useState(false);
  const [savingToCloud, setSavingToCloud] = useState(false);
  
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
        body: JSON.stringify({
          jobId,
          email: notificationEmail,
        }),
      });

      if (response.ok) {
        setEmailSubscribed(true);
      } else {
        const data = await response.json();
        setEmailError(data.error || "Failed to subscribe");
      }
    } catch (err) {
      setEmailError("Failed to subscribe to notifications");
    } finally {
      setEmailSubscribing(false);
    }
  };

  useEffect(() => {
    if (
      status?.status === "completed" &&
      emailSubscribed &&
      jobId &&
      !notificationSentRef.current
    ) {
      notificationSentRef.current = true;
      
      fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch(console.error);
    }
  }, [status?.status, emailSubscribed, jobId]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isProcessing = status?.status === "processing" || status?.status === "pending";
  const isCompleted = status?.status === "completed";
  const isFailed = status?.status === "failed";

  return (
    <>
      {/* Navigation */}
      <nav className="flex items-center justify-between mb-12 md:mb-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center shadow-lg shadow-[rgba(249,115,22,0.3)]">
            <Headphones className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:inline bg-gradient-to-r from-[#f97316] to-[#3b82f6] bg-clip-text text-transparent">
            Free Podcast Mastering
          </span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSelector />
          {user ? (
            <>
              {isSubscribed && (
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[rgba(249,115,22,0.15)] to-[rgba(59,130,246,0.15)] border border-[rgba(249,115,22,0.2)] text-xs font-medium text-[#f97316]">
                  <Crown className="w-3.5 h-3.5" />
                  Unlimited
                </span>
              )}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] hover:border-[#f97316] hover:bg-[rgba(249,115,22,0.1)] transition-all text-sm font-medium"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/handler/sign-in"
                className="flex items-center gap-2 px-4 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#fb923c] hover:to-[#f97316] transition-all text-sm font-semibold text-white shadow-lg shadow-[rgba(249,115,22,0.3)]"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Pricing</span>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="text-center mb-12 md:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(255,255,255,0.05)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[var(--text-secondary)]">100% Free — No signup required</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          <span className="text-gradient">Master Your</span>
          <br />
          <span className="text-gradient">Podcast Audio</span>
        </h1>
        
        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-6 leading-relaxed">
          Professional-grade audio mastering powered by AI. 
          Upload your podcast, get broadcast-ready results in minutes.
        </p>

        {/* Privacy Disclaimer */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#22c55e]/20 via-[#10b981]/20 to-[#22c55e]/20 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />
            <div className="relative px-5 py-4 rounded-xl bg-[rgba(34,197,94,0.08)] backdrop-blur-md border border-[rgba(34,197,94,0.25)] hover:border-[rgba(34,197,94,0.4)] transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#22c55e] to-[#10b981] flex items-center justify-center shadow-lg shadow-[#22c55e]/20">
                  <span className="text-lg">🔒</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#22c55e]">Your Audio is 100% Private</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#22c55e]/20 text-[#22c55e] uppercase tracking-wider">Zero Training</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    We <span className="text-[#22c55e] font-medium">never</span> train AI on your audio. We use it for <span className="text-[#22c55e] font-medium">absolutely nothing</span> except processing your file. 
                    Auto-deleted after 24 hours — honestly, we just don&apos;t want to pay for the storage. 
                    <span className="inline-flex items-center gap-1 ml-1 text-[#22c55e]">
                      <HardDrive className="w-3 h-3" />
                      <span className="font-medium">Your audio = your business.</span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[
            { icon: Mic, text: "Voice Optimized" },
            { icon: Zap, text: "AI-Powered" },
            { icon: Download, text: "Broadcast Ready" },
          ].map((feature) => (
            <div
              key={feature.text}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(255,255,255,0.03)] backdrop-blur-sm border border-[rgba(255,255,255,0.08)] text-sm text-[var(--text-secondary)]"
            >
              <feature.icon className="w-4 h-4 text-[#f97316]" />
              {feature.text}
            </div>
          ))}
        </div>
      </header>

      {/* NEW: Video Generation Feature Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b5cf6]/20 via-[#1a1a2e] to-[#0f0f0f] border border-[#8b5cf6]/30">
          {/* Animated background glow */}
          <div className="absolute inset-0">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#8b5cf6]/20 blur-[100px] animate-pulse" />
            <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-[#f97316]/10 blur-[100px] animate-pulse delay-1000" />
          </div>
          
          <div className="relative z-10 p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Icon */}
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#8b5cf6]/30">
                <Video className="w-8 h-8 text-white" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl md:text-3xl font-bold">Turn Audio Into Video</h2>
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white text-xs font-bold uppercase tracking-wider shadow-lg">
                    FREE
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#a78bfa] text-xs font-bold uppercase tracking-wider">
                    NEW
                  </span>
                </div>
                <p className="text-[var(--text-secondary)] text-lg mb-4">
                  Transform your mastered podcast into stunning videos for YouTube, TikTok, and Instagram — 
                  <span className="text-[#f97316] font-semibold">100% free</span> for all users.
                </p>
                
                {/* Feature highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Film, text: "YouTube & Shorts" },
                    { icon: Sparkles, text: "AI Captions" },
                    { icon: Zap, text: "60fps Export" },
                    { icon: Palette, text: "5 Visual Styles" },
                  ].map((feature) => (
                    <div
                      key={feature.text}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-sm"
                    >
                      <feature.icon className="w-4 h-4 text-[#a78bfa]" />
                      <span className="text-[var(--text-secondary)]">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* CTA */}
              <div className="shrink-0">
                <button
                  onClick={() => {
                    const element = document.getElementById('mastering-tool');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] hover:from-[#9f7aea] hover:to-[#8b5cf6] text-white font-semibold transition-all shadow-lg shadow-[#8b5cf6]/30 flex items-center gap-2"
                >
                  Try It Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Toasts */}
      <AnimatePresence>
        {showHqSuccessToast && (
          <motion.div
            className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-[rgba(34,197,94,0.15)] backdrop-blur-xl border border-[rgba(34,197,94,0.3)] flex items-center gap-3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#22c55e]">HQ Export Unlocked!</p>
              <p className="text-sm text-[var(--text-secondary)]">You have 1 high-quality 24-bit export credit</p>
            </div>
            <button onClick={() => setShowHqSuccessToast(false)} className="ml-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-8 p-4 rounded-2xl bg-[rgba(239,68,68,0.1)] backdrop-blur-xl border border-[rgba(239,68,68,0.3)] flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertCircle className="w-5 h-5 text-[var(--error)] shrink-0" />
            <span className="text-[var(--error)]">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-[var(--error)] hover:text-[var(--text-primary)] transition-colors"
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowLimitModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md glass-card p-8 text-center"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <button
                onClick={() => setShowLimitModal(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[rgba(234,179,8,0.2)] to-[rgba(234,179,8,0.1)] flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-[var(--warning)]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Weekly Limit Reached</h3>
              <p className="text-[var(--text-secondary)] text-sm mb-6">
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

      {/* Storage Limit Modal */}
      <AnimatePresence>
        {showStorageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowStorageModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md glass-card p-8 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <button
                onClick={() => setShowStorageModal(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(239,68,68,0.15)] flex items-center justify-center">
                <HardDrive className="w-8 h-8 text-[var(--error)]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Storage Full</h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                You&apos;ve reached your 5GB storage limit. Delete some files to free up space.
              </p>
              {storageInfo && (
                <div className="mb-6 p-4 rounded-xl bg-[rgba(255,255,255,0.03)]">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--text-muted)]">Used</span>
                    <span className="font-medium">{formatFileSize(storageInfo.used)} / {formatFileSize(storageInfo.limit)}</span>
                  </div>
                  <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ef4444] to-[#f97316] rounded-full"
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
        <div id="mastering-tool">
          {/* Pro Tip Banner */}
          <div className="glass-card p-5 mb-8">
            <button
              onClick={() => setShowTip(!showTip)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(234,179,8,0.2)] to-[rgba(234,179,8,0.1)] flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-[var(--warning)]" />
                </div>
                <span className="font-semibold">Pro Tip: Best Practice for Voice Mastering</span>
              </div>
              {showTip ? (
                <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </button>
            <AnimatePresence>
              {showTip && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 text-sm text-[var(--text-secondary)] space-y-3 pl-13">
                    <p>
                      <strong className="text-[var(--text-primary)]">Upload voice tracks only.</strong>{" "}
                      Remove all intro music, background music, and sound effects before mastering.
                    </p>
                    <Link
                      href="/how-to-master-podcast-audio"
                      className="inline-flex items-center gap-2 text-[#f97316] hover:underline font-medium"
                    >
                      Read the complete guide
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Upload Section */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* File Upload */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center shadow-lg shadow-[rgba(249,115,22,0.2)]">
                  <Music2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Your Podcast</h3>
                  <p className="text-sm text-[var(--text-muted)]">Upload the audio you want to master</p>
                </div>
              </div>

              {targetFile ? (
                <div className="file-info">
                  <div className="file-icon">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{targetFile.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">{formatFileSize(targetFile.size)}</p>
                  </div>
                  <button
                    onClick={() => setTargetFile(null)}
                    className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
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

            {/* Mastering Preset */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-lg shadow-[rgba(59,130,246,0.2)]">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Mastering Preset</h3>
                  <p className="text-sm text-[var(--text-muted)]">Choose your target sound profile</p>
                </div>
              </div>

              <div className="space-y-2">
                {templates.map((template) => (
                  <label
                    key={template.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === template.id
                        ? "border-[#f97316] bg-[rgba(249,115,22,0.1)]"
                        : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.02)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      selectedTemplate === template.id
                        ? "border-[#f97316] bg-[#f97316]"
                        : "border-[var(--text-muted)]"
                    }`}>
                      {selectedTemplate === template.id && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-sm text-[var(--text-muted)] mt-0.5">{template.description}</p>
                    </div>
                  </label>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading presets...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="glass-card mb-8">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Output Settings</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {outputQuality === "high" ? "24-bit" : "16-bit"} • {limiterMode.charAt(0).toUpperCase() + limiterMode.slice(1)} limiter
                  </p>
                </div>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
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
                  <div className="px-5 pb-5 space-y-5">
                    {/* Output Quality */}
                    <div>
                      <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">Output Quality</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setOutputQuality("standard")}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            outputQuality === "standard"
                              ? "border-[#f97316] bg-[rgba(249,115,22,0.1)]"
                              : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
                          }`}
                        >
                          <p className="font-semibold">Standard (16-bit)</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">Great for podcasts</p>
                        </button>
                        <button
                          onClick={() => canUseHqExport && setOutputQuality("high")}
                          disabled={!canUseHqExport}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            outputQuality === "high"
                              ? "border-[#f97316] bg-[rgba(249,115,22,0.1)]"
                              : !canUseHqExport
                                ? "border-[rgba(255,255,255,0.05)] opacity-50 cursor-not-allowed"
                                : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">High Quality (24-bit)</p>
                            {!canUseHqExport && <Crown className="w-4 h-4 text-[var(--warning)]" />}
                            {hqCredits > 0 && !isSubscribed && (
                              <span className="text-xs bg-[rgba(34,197,94,0.15)] text-[#22c55e] px-2 py-0.5 rounded-full">
                                {hqCredits} credit
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {isSubscribed ? "Professional production" : hqCredits > 0 ? "1 credit will be used" : "Unlock below"}
                          </p>
                        </button>
                      </div>
                      
                      {!isSubscribed && hqCredits === 0 && (
                        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[rgba(249,115,22,0.1)] to-[rgba(59,130,246,0.1)] border border-[rgba(249,115,22,0.2)]">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4 text-[#f97316]" />
                                <p className="font-semibold">Try 24-bit HQ for $1</p>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Exact format for Spotify, Apple Podcasts & YouTube
                              </p>
                            </div>
                            <button
                              onClick={handleHqPurchase}
                              disabled={hqCheckoutLoading}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap shadow-lg shadow-[rgba(249,115,22,0.3)]"
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
                      <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Loudness
                        </span>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: "gentle", name: "Gentle", desc: "Dynamic" },
                          { id: "normal", name: "Normal", desc: "Balanced" },
                          { id: "loud", name: "Loud", desc: "Maximum" },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setLimiterMode(mode.id as "gentle" | "normal" | "loud")}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              limiterMode === mode.id
                                ? "border-[#f97316] bg-[rgba(249,115,22,0.1)]"
                                : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
                            }`}
                          >
                            <p className="font-semibold">{mode.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{mode.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={startMastering}
              disabled={!targetFile || !selectedTemplate || isUploading}
              className="btn-primary inline-flex items-center gap-3 text-lg px-10 py-5"
            >
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Wand2 className="w-6 h-6" />
                  Start Mastering
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
            {!targetFile && (
              <p className="text-sm text-[var(--text-muted)] mt-4">
                Upload your podcast to begin mastering
              </p>
            )}
          </div>
        </div>
      ) : isProcessing ? (
        /* Processing View */
        <div className="glass-card p-10 md:p-16 text-center processing-glow">
          <WaveformAnimation />
          <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-3">Mastering Your Audio</h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={processingMessage}
              className="text-[var(--text-secondary)] mb-8 h-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {processingMessage}
            </motion.p>
          </AnimatePresence>

          <div className="max-w-md mx-auto mb-6">
            <div className="progress-container">
              <motion.div
                className="progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${status?.progress || 0}%` }}
              />
            </div>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-[#f97316] to-[#3b82f6] bg-clip-text text-transparent mb-8">
            {status?.progress || 0}%
          </p>

          {/* Email notification */}
          <div className="max-w-md mx-auto p-5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
            {user?.primaryEmail ? (
              <div className="flex items-center justify-center gap-2 text-[#22c55e]">
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium">
                  We&apos;ll email you at {user.primaryEmail} when ready!
                </span>
              </div>
            ) : !emailSubscribed ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-[#f97316]" />
                  <span className="font-semibold text-sm">Get notified when ready</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => {
                      setNotificationEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 rounded-xl text-sm"
                    disabled={emailSubscribing}
                  />
                  <button
                    onClick={subscribeToNotifications}
                    disabled={!notificationEmail || emailSubscribing}
                    className="px-5 py-3 rounded-xl bg-[#f97316] text-white font-semibold text-sm disabled:opacity-50"
                  >
                    {emailSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Notify Me"}
                  </button>
                </div>
                {emailError && <p className="text-xs text-[var(--error)] mt-2">{emailError}</p>}
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-[#22c55e]">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">We&apos;ll email you when ready!</span>
              </div>
            )}
          </div>
        </div>
      ) : isCompleted ? (
        /* Completed View */
        <div className="glass-card p-10 md:p-16 text-center">
          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[rgba(34,197,94,0.3)]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-bold mb-3">Mastering Complete!</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Your podcast has been professionally mastered and is ready for download.
          </p>

          {isSubscribed && (
            <div className="mb-6">
              {savingToCloud ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving to cloud...
                </span>
              ) : savedToCloud ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(34,197,94,0.15)] text-[#22c55e] text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved to cloud
                </span>
              ) : null}
            </div>
          )}

          {!isSubscribed && (
            <p className="text-xs text-[var(--text-muted)] mb-6">
              ⏰ This download link expires in 24 hours.{" "}
              <Link href="/pricing" className="text-[#f97316] hover:underline">Subscribe</Link> to keep forever.
            </p>
          )}

          {jobId && (
            <div className="mb-8">
              <AudioPlayer src={`${API_URL}/download/${jobId}`} />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={downloadResult} className="btn-primary text-lg px-8 py-4">
                <Download className="w-6 h-6" />
                Download Mastered Audio
              </button>
              <button
                onClick={() => {
                  const audio = new Audio(`${API_URL}/download/${jobId}`);
                  audio.addEventListener("loadedmetadata", () => {
                    setAudioDuration(audio.duration);
                    setShowVideoGenerator(true);
                  });
                }}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" />
                Generate Video
              </button>
            </div>
            <button
              onClick={resetSession}
              className="px-8 py-4 rounded-xl border border-[rgba(255,255,255,0.15)] hover:border-[#f97316] hover:bg-[rgba(249,115,22,0.1)] transition-all flex items-center justify-center gap-2 font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              Master Another
            </button>
          </div>
        </div>
      ) : isFailed ? (
        /* Failed View */
        <div className="glass-card p-10 md:p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[rgba(239,68,68,0.15)] flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-[var(--error)]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Mastering Failed</h2>
          <p className="text-[var(--text-secondary)] mb-8">{status?.message || "An error occurred during processing."}</p>
          <button onClick={resetSession} className="btn-primary text-lg px-8 py-4">
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      ) : null}

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
    </>
  );
}
