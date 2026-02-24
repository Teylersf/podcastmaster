"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Player } from "@remotion/player";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@stackframe/stack";
import {
  Video,
  Download,
  Settings,
  Type,
  Palette,
  Music,
  X,
  Loader2,
  Play,
  Smartphone,
  Monitor,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Wand2,
  Subtitles,
  Zap,
  LayoutGrid,
  Film,
  Mail,
  Bell,
  Clock,
} from "lucide-react";
import { PodcastVideo, PodcastVideoProps, CaptionSegment } from "@/remotion/PodcastVideo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teylersf--podcast-mastering-fastapi-app.modal.run";

interface VideoGeneratorProps {
  audioUrl: string;
  audioDuration: number;
  fileName: string;
  r2Key?: string; // For transcription
  onClose: () => void;
}

type AspectRatio = "16:9" | "9:16";
type BackgroundType = "gradient" | "solid";
type TemplateType = "waveform" | "audiogram" | "circles" | "bars" | "particles";
type CaptionStyle = "highlight" | "karaoke" | "simple";
type QualityPreset = "web" | "hd" | "4k";
type ExportStatus = "idle" | "transcribing" | "recording" | "muxing" | "complete" | "error";

interface VideoSettings {
  title: string;
  subtitle: string;
  aspectRatio: AspectRatio;
  backgroundType: BackgroundType;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  showWaveform: boolean;
  showProgressBar: boolean;
  logoUrl: string | null;
  template: TemplateType;
  backgroundImageUrl: string | null;
  captionStyle: CaptionStyle;
  quality: QualityPreset;
  enableCaptions: boolean;
}

const PRESETS = {
  podcast: { gradientFrom: "#1a1a2e", gradientTo: "#16213e", accentColor: "#f97316" },
  ocean: { gradientFrom: "#0f2027", gradientTo: "#203a43", accentColor: "#00d9ff" },
  sunset: { gradientFrom: "#2d1b4e", gradientTo: "#1a1a2e", accentColor: "#ff6b6b" },
  forest: { gradientFrom: "#1a2f1a", gradientTo: "#0d1f0d", accentColor: "#4ade80" },
  minimal: { gradientFrom: "#0a0a0a", gradientTo: "#1a1a1a", accentColor: "#ffffff" },
  fire: { gradientFrom: "#2d1b1b", gradientTo: "#1a0f0f", accentColor: "#ff4444" },
};

const TEMPLATES: { id: TemplateType; name: string; icon: string }[] = [
  { id: "waveform", name: "Classic Wave", icon: "〰️" },
  { id: "audiogram", name: "Circular", icon: "⭕" },
  { id: "bars", name: "Frequency", icon: "📊" },
  { id: "particles", name: "Particles", icon: "✨" },
  { id: "circles", name: "Pulse", icon: "🔘" },
];

const QUALITY_SETTINGS: Record<QualityPreset, { fps: number; bitrate: number; label: string }> = {
  web: { fps: 30, bitrate: 5000000, label: "Web (30fps)" },
  hd: { fps: 60, bitrate: 12000000, label: "HD (60fps)" },
  "4k": { fps: 60, bitrate: 25000000, label: "Ultra (60fps)" },
};

export default function VideoGenerator({
  audioUrl,
  audioDuration,
  fileName,
  r2Key,
  onClose,
}: VideoGeneratorProps) {
  const user = useUser();
  
  const [settings, setSettings] = useState<VideoSettings>({
    title: fileName.replace(/\.[^/.]+$/, ""),
    subtitle: "Powered by Free Podcast Mastering",
    aspectRatio: "16:9",
    backgroundType: "gradient",
    backgroundColor: "#1a1a2e",
    gradientFrom: "#1a1a2e",
    gradientTo: "#16213e",
    accentColor: "#f97316",
    showWaveform: true,
    showProgressBar: true,
    logoUrl: null,
    template: "waveform",
    backgroundImageUrl: null,
    captionStyle: "highlight",
    quality: "hd",
    enableCaptions: false,
  });

  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [transcriptionJobId, setTranscriptionJobId] = useState<string | null>(null);
  
  // Email notification state
  const [notificationEmail, setNotificationEmail] = useState("");
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [emailSubscribing, setEmailSubscribing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  
  const playerRef = useRef<React.ElementRef<typeof Player>>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const durationInFrames = Math.max(Math.ceil(audioDuration * QUALITY_SETTINGS[settings.quality].fps), 30);
  const fps = QUALITY_SETTINGS[settings.quality].fps;

  // Initialize email from user if available
  useEffect(() => {
    if (user?.primaryEmail) {
      setNotificationEmail(user.primaryEmail);
    }
  }, [user]);

  const startTranscription = async () => {
    // Validate audioUrl is available
    if (!audioUrl) {
      console.error("[Transcription] Error: audioUrl is not provided");
      setExportStatus("error");
      setErrorMessage("Audio URL is not available. Please try again.");
      return;
    }
    
    // Use R2 key if available, otherwise use the audio URL
    const hasR2Key = r2Key && r2Key.trim().length > 0;
    
    console.log("[Transcription] Starting...", { hasR2Key, r2Key: r2Key?.slice(0, 20), audioUrl: audioUrl?.slice(0, 30) });
    
    setExportStatus("transcribing");
    setExportStage("Starting transcription...");
    
    try {
      // Build query params - use r2_key if available, otherwise use url
      const queryParams = hasR2Key 
        ? `audio_r2_key=${encodeURIComponent(r2Key!)}`
        : `audio_url=${encodeURIComponent(audioUrl)}`;
      
      const fullUrl = `${API_URL}/transcribe?${queryParams}`;
      console.log("[Transcription] Fetching:", fullUrl.slice(0, 80) + "...");
      
      const response = await fetch(fullUrl, {
        method: "POST",
      });
      
      console.log("[Transcription] Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Transcription] Error response:", errorText);
        throw new Error(`Failed to start transcription: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log("[Transcription] Job started:", data.job_id);
      setTranscriptionJobId(data.job_id);
      
      // Poll for transcription results
      pollTranscription(data.job_id);
    } catch (error) {
      console.error("[Transcription] Error:", error);
      setExportStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to start transcription");
      // Don't disable captions on error - show the error instead
    }
  };

  const pollTranscription = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        console.log("[Transcription] Polling job:", jobId);
        const response = await fetch(`${API_URL}/transcribe/${jobId}`);
        
        if (!response.ok) {
          console.error("[Transcription] Poll error:", response.status);
          setExportStatus("error");
          setErrorMessage(`Failed to check transcription status: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        console.log("[Transcription] Status:", data.status, "Progress:", data.progress);
        
        if (data.status === "completed") {
          setCaptions(data.segments || []);
          setSettings(s => ({ ...s, enableCaptions: true }));
          setExportStatus("idle");
          setExportStage("");
        } else if (data.status === "failed") {
          setExportStatus("error");
          setErrorMessage(data.error || "Transcription failed");
        } else {
          // Show detailed progress messages
          const progress = data.progress || 0;
          let stageMessage = "";
          
          if (progress < 20) {
            stageMessage = "⬇️ Downloading audio...";
          } else if (progress < 35) {
            stageMessage = "🧠 Loading AI model... (one-time setup)";
          } else if (progress < 50) {
            stageMessage = "🤖 Starting AI transcription...";
          } else if (progress < 90) {
            stageMessage = "✍️ Transcribing speech to text...";
          } else {
            stageMessage = "📝 Finalizing captions...";
          }
          
          setExportStage(`${stageMessage} ${progress}%`);
          setExportProgress(progress);
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        console.error("[Transcription] Polling error:", error);
        setExportStatus("error");
        setErrorMessage("Lost connection to transcription service");
      }
    };
    checkStatus();
  };

  const inputProps: PodcastVideoProps = {
    audioUrl,
    title: settings.title,
    subtitle: settings.subtitle,
    captions: settings.enableCaptions ? captions : [],
    backgroundType: settings.backgroundType,
    backgroundColor: settings.backgroundColor,
    gradientFrom: settings.gradientFrom,
    gradientTo: settings.gradientTo,
    accentColor: settings.accentColor,
    showWaveform: settings.showWaveform,
    showProgressBar: settings.showProgressBar,
    logoUrl: settings.logoUrl,
    aspectRatio: settings.aspectRatio,
    template: settings.template,
    backgroundImageUrl: settings.backgroundImageUrl,
    captionStyle: settings.captionStyle,
  };

  const subscribeToNotifications = async (jobId: string, email: string) => {
    try {
      const response = await fetch("/api/video/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          email,
          videoTitle: settings.title,
        }),
      });

      if (response.ok) {
        setEmailSubscribed(true);
        console.log(`[VIDEO] Subscribed ${email} to job ${jobId}`);
      } else {
        const data = await response.json();
        console.error("[VIDEO] Failed to subscribe:", data.error);
      }
    } catch (err) {
      console.error("[VIDEO] Failed to subscribe to notifications:", err);
    }
  };

  const handleExport = useCallback(async () => {
    // If no email is set and user is not logged in, show email input first
    if (!user?.primaryEmail && !notificationEmail) {
      setShowEmailInput(true);
      return;
    }

    await startRender();
  }, [user?.primaryEmail, notificationEmail]);

  const startRender = async () => {
    setExportStatus("recording");
    setExportProgress(5);
    setExportStage("Initializing video render...");
    setErrorMessage(null);
    setShowEmailInput(false);

    try {
      // Call the API to render the video server-side
      const response = await fetch(`${API_URL}/video/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_url: audioUrl,
          title: settings.title,
          subtitle: settings.subtitle,
          captions: settings.enableCaptions ? captions : [],
          gradient_from: settings.gradientFrom,
          gradient_to: settings.gradientTo,
          accent_color: settings.accentColor,
          show_progress_bar: settings.showProgressBar,
          aspect_ratio: settings.aspectRatio,
          duration_seconds: Math.ceil(audioDuration),
          fps: QUALITY_SETTINGS[settings.quality].fps,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Video render error response:", error);
        const errorMessage = Array.isArray(error.detail) 
          ? error.detail.map((e: any) => e.msg || e).join(", ")
          : (error.detail || error.error || "Failed to start video render");
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.job_id) {
        setRenderJobId(data.job_id);
        setExportStage("Rendering video on server... This may take a while.");
        setExportProgress(10);
        
        // Subscribe to email notifications
        const emailToUse = user?.primaryEmail || notificationEmail;
        if (emailToUse) {
          await subscribeToNotifications(data.job_id, emailToUse);
        }
        
        // Poll for job completion
        pollRenderJob(data.job_id);
      } else {
        throw new Error("No job ID received");
      }

    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const pollRenderJob = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/video/status/${jobId}`);
        
        if (!response.ok) {
          throw new Error("Failed to check status");
        }
        
        const data = await response.json();
        
        if (data.status === "completed") {
          setExportedVideoUrl(data.download_url);
          setExportStatus("complete");
          setExportProgress(100);
          
          // Trigger email notification from frontend (fallback if webhook wasn't called)
          // This ensures users get an email even if the Modal backend webhook isn't set up
          const emailToUse = user?.primaryEmail || notificationEmail;
          if (emailToUse) {
            console.log("[VIDEO] Completion detected, triggering email notification fallback");
            fetch("/api/video/notify-complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jobId,
                downloadUrl: data.download_url,
                videoTitle: settings.title,
              }),
            }).then(() => {
              console.log("[VIDEO] Completion email triggered successfully");
            }).catch(err => {
              console.error("[VIDEO] Failed to trigger completion email:", err);
            });
          }
        } else if (data.status === "failed") {
          setExportStatus("error");
          setErrorMessage(data.error || "Video rendering failed");
        } else {
          // Still processing
          setExportProgress(prev => Math.min(prev + 2, 95));
          setExportStage(data.message || "Rendering video...");
          setTimeout(checkStatus, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error("Render polling error:", error);
        setExportStatus("error");
        setErrorMessage("Failed to check render status");
      }
    };
    checkStatus();
  };

  const handleDownload = useCallback(() => {
    if (!exportedVideoUrl) return;
    
    // Create download URL with download parameter to force download
    const downloadUrl = exportedVideoUrl.includes("?") 
      ? `${exportedVideoUrl}&download=1` 
      : `${exportedVideoUrl}?download=1`;
    
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${settings.title.replace(/\s+/g, "_")}_video.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [exportedVideoUrl, settings.title]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "background") => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSettings(s => ({ 
        ...s, 
        [type === "logo" ? "logoUrl" : "backgroundImageUrl"]: url 
      }));
    }
  };

  const applyPreset = (preset: keyof typeof PRESETS) => {
    const colors = PRESETS[preset];
    setSettings(s => ({
      ...s,
      gradientFrom: colors.gradientFrom,
      gradientTo: colors.gradientTo,
      accentColor: colors.accentColor,
    }));
  };

  const playerWidth = settings.aspectRatio === "16:9" ? 640 : 360;
  const playerHeight = settings.aspectRatio === "16:9" ? 360 : 640;
  const compositionWidth = settings.aspectRatio === "16:9" ? 1920 : 1080;
  const compositionHeight = settings.aspectRatio === "16:9" ? 1080 : 1920;

  const isExporting = exportStatus !== "idle" && exportStatus !== "complete" && exportStatus !== "error";

  // Calculate estimated time
  const estimatedHours = Math.ceil(audioDuration / 3600);
  const estimatedMinutes = Math.ceil((audioDuration % 3600) / 60);
  const timeEstimate = estimatedHours > 0 
    ? `~${estimatedHours} hour${estimatedHours > 1 ? 's' : ''}${estimatedMinutes > 0 ? ` ${estimatedMinutes} min` : ''}`
    : `~${estimatedMinutes} min`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={!isExporting ? onClose : undefined} />

      <motion.div
        className="relative z-10 w-full max-w-6xl max-h-[92vh] bg-[#0c0c0c] rounded-3xl border border-[rgba(255,255,255,0.08)] overflow-hidden flex flex-col shadow-2xl"
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        style={{ height: "auto", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.06)] bg-gradient-to-r from-[rgba(249,115,22,0.05)] to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center shadow-lg shadow-[rgba(249,115,22,0.3)]">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Video Studio</h2>
              <p className="text-sm text-[rgba(255,255,255,0.45)]">
                Professional video generation on your device
              </p>
            </div>
          </div>
          {!isExporting && (
            <button onClick={onClose} className="p-2.5 hover:bg-[rgba(255,255,255,0.08)] rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Email Input Modal - Shown before render for non-logged-in users */}
        <AnimatePresence>
          {showEmailInput && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-w-md w-full mx-6"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[rgba(139,92,246,0.15)] flex items-center justify-center border border-[rgba(139,92,246,0.3)]">
                    <Mail className="w-10 h-10 text-[#a78bfa]" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Get Notified When Ready</h3>
                  <p className="text-[rgba(255,255,255,0.5)] text-sm">
                    Video rendering can take {timeEstimate}. We&apos;ll email you the download link when it&apos;s done so you don&apos;t have to wait.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
                    <Clock className="w-5 h-5 text-[#f97316]" />
                    <div className="text-sm">
                      <span className="text-[rgba(255,255,255,0.6)]">Estimated render time: </span>
                      <span className="font-medium text-white">{timeEstimate}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => {
                        setNotificationEmail(e.target.value);
                        setEmailError(null);
                      }}
                      placeholder="your@email.com"
                      className="flex-1 px-4 py-3 bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm focus:border-[#f97316] focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && notificationEmail) {
                          startRender();
                        }
                      }}
                    />
                    <button
                      onClick={startRender}
                      disabled={!notificationEmail || emailSubscribing}
                      className="px-6 py-3 rounded-xl bg-[#f97316] text-white font-semibold text-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      {emailSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Render"}
                    </button>
                  </div>
                  
                  {emailError && (
                    <p className="text-xs text-[#ef4444]">{emailError}</p>
                  )}

                  <button
                    onClick={() => setShowEmailInput(false)}
                    className="w-full py-3 text-sm text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success View */}
        {exportStatus === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="w-24 h-24 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center mb-8 border border-[rgba(34,197,94,0.3)]"
            >
              <CheckCircle2 className="w-12 h-12 text-[#22c55e]" />
            </motion.div>
            <h3 className="text-3xl font-bold mb-3">Video Ready!</h3>
            <p className="text-[rgba(255,255,255,0.5)] mb-8 text-center max-w-md">
              Your professional video has been generated with {settings.enableCaptions ? "AI captions" : "custom styling"}.
            </p>
            
            {emailSubscribed && (
              <div className="flex items-center gap-2 mb-6 text-sm text-[#22c55e]">
                <Mail className="w-4 h-4" />
                <span>We also sent a download link to your email</span>
              </div>
            )}
            
            <div className="flex gap-4">
              <button onClick={handleDownload} className="btn-primary text-lg px-8 py-4">
                <Download className="w-5 h-5" />
                Download MP4
              </button>
              <button onClick={() => { setExportStatus("idle"); setExportedVideoUrl(null); setEmailSubscribed(false); }} className="px-6 py-4 rounded-xl border border-[rgba(255,255,255,0.15)] hover:border-[#f97316] transition-colors">
                Create Another
              </button>
            </div>
          </div>
        )}

        {/* Error View */}
        {exportStatus === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-24 h-24 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center mb-8 border border-[rgba(239,68,68,0.3)]">
              <AlertCircle className="w-12 h-12 text-[#ef4444]" />
            </div>
            <h3 className="text-3xl font-bold mb-3">{transcriptionJobId ? "Transcription Failed" : "Export Failed"}</h3>
            <p className="text-[rgba(255,255,255,0.5)] mb-8 text-center max-w-md">{errorMessage || "An unknown error occurred"}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setExportStatus("idle");
                  setErrorMessage(null);
                  if (transcriptionJobId) {
                    // Reset transcription state
                    setTranscriptionJobId(null);
                    setSettings(s => ({ ...s, enableCaptions: false }));
                  }
                }} 
                className="btn-primary"
              >
                {transcriptionJobId ? "Back to Settings" : "Try Again"}
              </button>
              <button onClick={onClose} className="px-6 py-3 rounded-xl border border-[rgba(255,255,255,0.15)]">Close</button>
            </div>
          </div>
        )}

        {/* Main Interface */}
        {!showEmailInput && !["complete", "error"].includes(exportStatus) && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-[rgba(255,255,255,0.06)] px-4">
              {["preview", "settings"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  disabled={isExporting}
                  className={`px-6 py-4 text-sm font-medium transition-all flex items-center gap-2 capitalize ${
                    activeTab === tab
                      ? "text-[#f97316] border-b-2 border-[#f97316]"
                      : "text-[rgba(255,255,255,0.4)] hover:text-white"
                  }`}
                >
                  {tab === "preview" ? <Play className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="flex flex-col lg:flex-row h-full">
                {/* Preview */}
                <div className={`flex-1 p-8 flex items-center justify-center bg-[#050505] ${activeTab === "preview" ? "flex" : "hidden lg:flex"}`}>
                  <div ref={playerContainerRef} className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-[rgba(255,255,255,0.1)]" style={{ width: playerWidth, height: playerHeight }}>
                    <Player
                      ref={playerRef}
                      component={PodcastVideo}
                      durationInFrames={durationInFrames}
                      fps={fps}
                      compositionWidth={compositionWidth}
                      compositionHeight={compositionHeight}
                      inputProps={inputProps}
                      controls
                      style={{ width: "100%", height: "100%" }}
                      loop
                    />
                  </div>
                </div>

                {/* Settings Panel */}
                <div className={`w-full lg:w-[420px] border-l border-[rgba(255,255,255,0.06)] bg-[#0f0f0f] overflow-y-auto max-h-[calc(92vh-140px)] ${activeTab === "settings" ? "block" : "hidden lg:block"}`}>
                  <div className="p-5 space-y-6 pb-24">
                    
                    {/* Format */}
                    <div>
                      <label className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3 block">Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "16:9", icon: Monitor, label: "YouTube" },
                          { id: "9:16", icon: Smartphone, label: "Shorts" },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            onClick={() => setSettings(s => ({ ...s, aspectRatio: fmt.id as AspectRatio }))}
                            disabled={isExporting}
                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              settings.aspectRatio === fmt.id
                                ? "border-[#f97316] bg-[rgba(249,115,22,0.1)]"
                                : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
                            }`}
                          >
                            <fmt.icon className="w-4 h-4" />
                            <span className="text-sm">{fmt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Templates */}
                    <div>
                      <label className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5" /> Visualization
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSettings(s => ({ ...s, template: t.id }))}
                            disabled={isExporting}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              settings.template === t.id
                                ? "border-[#f97316] bg-[rgba(249,115,22,0.1)]"
                                : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
                            }`}
                          >
                            <span className="text-xl block mb-1">{t.icon}</span>
                            <span className="text-[10px]">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text */}
                    <div>
                      <label className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Type className="w-3.5 h-3.5" /> Text
                      </label>
                      <input
                        type="text"
                        value={settings.title}
                        onChange={e => setSettings(s => ({ ...s, title: e.target.value }))}
                        disabled={isExporting}
                        className="w-full px-4 py-3 bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm mb-2 focus:border-[#f97316] focus:outline-none"
                        placeholder="Video Title"
                      />
                      <input
                        type="text"
                        value={settings.subtitle}
                        onChange={e => setSettings(s => ({ ...s, subtitle: e.target.value }))}
                        disabled={isExporting}
                        className="w-full px-4 py-3 bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm focus:border-[#f97316] focus:outline-none"
                        placeholder="Subtitle"
                      />
                    </div>

                    {/* AI Captions */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[rgba(139,92,246,0.1)] to-[rgba(59,130,246,0.1)] border border-[rgba(139,92,246,0.2)]">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-[#a78bfa]" />
                          <span className="font-medium">AI Captions</span>
                        </div>
                        
                        {/* Generate Button */}
                        {!captions.length && exportStatus !== "transcribing" && (
                          <>
                            <button
                              onClick={startTranscription}
                              disabled={isExporting}
                              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              Generate AI Captions
                            </button>
                            {audioDuration > 600 && (
                              <p className="mt-2 text-xs text-[rgba(255,255,255,0.4)]">
                                ⏱️ Long audio ({Math.round(audioDuration / 60)} min). Transcription may take 5-15 minutes.
                              </p>
                            )}
                          </>
                        )}
                        
                        {/* Status messages */}
                        {exportStatus === "transcribing" && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-[#a78bfa]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{exportStage || "Generating captions... Please wait"}</span>
                          </div>
                        )}
                        {captions.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-[#4ade80]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>✓ {captions.length} captions ready</span>
                            <button 
                              onClick={() => {
                                setCaptions([]);
                                setTranscriptionJobId(null);
                                setSettings(s => ({ ...s, enableCaptions: false }));
                              }}
                              className="ml-auto text-[rgba(255,255,255,0.4)] hover:text-white"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                    {/* Colors */}
                    <div>
                      <label className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5" /> Theme
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {Object.entries(PRESETS).map(([name, colors]) => (
                          <button
                            key={name}
                            onClick={() => applyPreset(name as keyof typeof PRESETS)}
                            disabled={isExporting}
                            className={`aspect-square rounded-xl border-2 transition-all ${
                              settings.gradientFrom === colors.gradientFrom ? "border-white" : "border-transparent"
                            }`}
                            style={{ background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Accent */}
                    <div>
                      <label className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3 block">Accent</label>
                      <div className="flex gap-2">
                        {["#f97316", "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#ec4899", "#ffffff"].map(c => (
                          <button
                            key={c}
                            onClick={() => setSettings(s => ({ ...s, accentColor: c }))}
                            disabled={isExporting}
                            className={`w-9 h-9 rounded-lg border-2 transition-all ${
                              settings.accentColor === c ? "border-white scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Quality */}
                    <div>
                      <label className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> Quality
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(QUALITY_SETTINGS).map(([key, settings_q]) => (
                          <button
                            key={key}
                            onClick={() => setSettings(s => ({ ...s, quality: key as QualityPreset }))}
                            disabled={isExporting}
                            className={`p-2.5 rounded-xl border text-xs transition-all ${
                              settings.quality === key
                                ? "border-[#f97316] bg-[rgba(249,115,22,0.1)]"
                                : "border-[rgba(255,255,255,0.08)]"
                            }`}
                          >
                            {settings_q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Images */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider block flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5" /> Images
                      </label>
                      
                      {/* Logo */}
                      <div className="flex items-center gap-2">
                        <label className={`flex-1 px-3 py-2.5 bg-[#161616] border border-[rgba(255,255,255,0.08)] border-dashed rounded-lg text-xs text-center cursor-pointer ${isExporting ? "opacity-50" : ""}`}>
                          {settings.logoUrl ? "Change Logo" : "Add Logo"}
                          <input type="file" accept="image/*" onChange={e => handleFileUpload(e, "logo")} className="hidden" disabled={isExporting} />
                        </label>
                        {settings.logoUrl && (
                          <button onClick={() => setSettings(s => ({ ...s, logoUrl: null }))} disabled={isExporting} className="p-2.5 hover:bg-[rgba(255,255,255,0.08)] rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Background */}
                      <div className="flex items-center gap-2">
                        <label className={`flex-1 px-3 py-2.5 bg-[#161616] border border-[rgba(255,255,255,0.08)] border-dashed rounded-lg text-xs text-center cursor-pointer ${isExporting ? "opacity-50" : ""}`}>
                          {settings.backgroundImageUrl ? "Change Background" : "Custom Background"}
                          <input type="file" accept="image/*" onChange={e => handleFileUpload(e, "background")} className="hidden" disabled={isExporting} />
                        </label>
                        {settings.backgroundImageUrl && (
                          <button onClick={() => setSettings(s => ({ ...s, backgroundImageUrl: null }))} disabled={isExporting} className="p-2.5 hover:bg-[rgba(255,255,255,0.08)] rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3.5 bg-[#161616] rounded-xl cursor-pointer">
                        <span className="text-sm flex items-center gap-2"><Music className="w-4 h-4" /> Show Visualization</span>
                        <button
                          onClick={() => setSettings(s => ({ ...s, showWaveform: !s.showWaveform }))}
                          disabled={isExporting}
                          className={`w-10 h-5 rounded-full transition-colors relative ${settings.showWaveform ? "bg-[#f97316]" : "bg-[#333]"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.showWaveform ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </label>
                      <label className="flex items-center justify-between p-3.5 bg-[#161616] rounded-xl cursor-pointer">
                        <span className="text-sm">Progress Bar</span>
                        <button
                          onClick={() => setSettings(s => ({ ...s, showProgressBar: !s.showProgressBar }))}
                          disabled={isExporting}
                          className={`w-10 h-5 rounded-full transition-colors relative ${settings.showProgressBar ? "bg-[#f97316]" : "bg-[#333]"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.showProgressBar ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-[#0a0a0a]">
              <div className="text-sm text-[rgba(255,255,255,0.4)]">
                {Math.round(audioDuration)}s • {fps}fps • {settings.aspectRatio}
              </div>
              <button onClick={handleExport} disabled={isExporting} className="btn-primary px-8">
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {exportStage}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Video
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Export Overlay - Enhanced with "Working" indicator */}
        <AnimatePresence>
          {isExporting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50"
            >
              <div className="text-center max-w-md px-6">
                {/* Animated Working Spinner */}
                <div className="w-28 h-28 mx-auto mb-8 relative">
                  {/* Outer spinning ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-[rgba(249,115,22,0.2)] border-t-[#f97316]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  {/* Inner spinning ring */}
                  <motion.div
                    className="absolute inset-3 rounded-full border-4 border-[rgba(139,92,246,0.2)] border-b-[#8b5cf6]"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {exportStatus === "transcribing" ? (
                      <Sparkles className="w-10 h-10 text-[#a78bfa]" />
                    ) : exportStatus === "muxing" ? (
                      <Wand2 className="w-10 h-10 text-[#22c55e]" />
                    ) : (
                      <Video className="w-10 h-10 text-[#f97316]" />
                    )}
                  </div>
                </div>
                
                {/* Working Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(249,115,22,0.15)] border border-[rgba(249,115,22,0.3)] mb-4">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f97316]"></span>
                  </span>
                  <span className="text-[#f97316] font-semibold text-sm">Working</span>
                </div>
                
                {/* Stage title */}
                <h3 className="text-2xl font-bold mb-3">
                  {exportStatus === "transcribing" ? "AI Transcription" : 
                   exportStatus === "muxing" ? "Finalizing Video" : 
                   "Rendering Video"}
                </h3>
                
                {/* Detailed stage message */}
                <p className="text-[rgba(255,255,255,0.6)] mb-6 text-sm leading-relaxed">
                  {exportStatus === "transcribing" && exportStage.includes("Loading AI model") ? (
                    <>
                      🧠 <strong>Loading AI model...</strong><br/>
                      <span className="text-xs opacity-70">This may take 20-30 seconds on first use.<br/>The model is cached for future transcriptions.</span>
                    </>
                  ) : exportStatus === "transcribing" ? (
                    <>{exportStage}</>
                  ) : exportStatus === "muxing" ? (
                    <>🔧 Combining audio and video tracks...</>
                  ) : (
                    <>
                      🎬 Your video is being rendered on our servers...<br/>
                      <span className="text-xs opacity-70">
                        ⏱️ Estimated time: {timeEstimate}
                      </span>
                    </>
                  )}
                </p>

                {/* Time Warning for long videos - always show for video rendering */}
                {exportStatus === "recording" && (
                  <div className="mb-6 p-4 rounded-xl bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)]">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                      <div className="text-left">
                        <p className="text-sm text-[#22c55e] font-medium mb-1">You can close this window!</p>
                        <p className="text-xs text-[rgba(255,255,255,0.5)]">
                          We&apos;re rendering your video on our servers. You can close this window anytime and we&apos;ll email you the download link when it&apos;s ready.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Progress bar */}
                <div className="w-72 h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden mx-auto">
                  <motion.div
                    className={`h-full rounded-full ${
                      exportStatus === "transcribing" ? "bg-gradient-to-r from-[#a78bfa] to-[#7c3aed]" :
                      exportStatus === "muxing" ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a]" :
                      "bg-gradient-to-r from-[#f97316] to-[#ea580c]"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${exportProgress}%` }}
                  />
                </div>
                
                {/* Percentage */}
                <p className={`mt-4 text-sm font-bold ${
                  exportStatus === "transcribing" ? "text-[#a78bfa]" :
                  exportStatus === "muxing" ? "text-[#22c55e]" :
                  "text-[#f97316]"
                }`}>
                  {Math.round(exportProgress)}%
                </p>
                
                {/* Email notification info - only for video rendering, not transcription */}
                {exportStatus === "recording" && (emailSubscribed || user?.primaryEmail) && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[rgba(255,255,255,0.5)]">
                    <Mail className="w-4 h-4" />
                    <span>We&apos;ll email you when it&apos;s ready</span>
                  </div>
                )}
                
                {/* Helper text for first-time model download */}
                {exportStatus === "transcribing" && exportStage.includes("Loading AI model") && (
                  <p className="mt-4 text-xs text-[rgba(255,255,255,0.4)]">
                    💡 Tip: Future transcriptions will be much faster!
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
