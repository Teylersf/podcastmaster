"use client";

import { useUser } from "@stackframe/stack";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Headphones,
  Crown,
  Download,
  Trash2,
  HardDrive,
  Calendar,
  LogOut,
  ArrowLeft,
  FileAudio,
  Check,
  X,
  Loader2,
  CreditCard,
  Sparkles,
  Clock,
  AlertCircle,
  Music2,
  Video,
} from "lucide-react";
import MasteringTool from "@/components/MasteringTool";
import ThemeSelector from "@/components/ThemeSelector";
import dynamic from "next/dynamic";

const VideoGenerator = dynamic(() => import("@/components/video/VideoGenerator"), {
  ssr: false,
});

interface SubscriberFile {
  id: string;
  fileName: string;
  fileSize: number;
  url: string;
  fileType: string;
  jobId: string | null;
  createdAt: string;
}

interface FreeUserFile {
  id: string;
  jobId: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface SubscriptionData {
  isSubscribed: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  storage: {
    used: number;
    limit: number;
    remaining: number;
    files: SubscriberFile[];
  } | null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCountdown(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) return "Expired";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}

function getCountdownColor(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  const hoursLeft = diff / (1000 * 60 * 60);
  
  if (hoursLeft <= 2) return "text-[#ef4444]";
  if (hoursLeft <= 6) return "text-[#eab308]";
  return "text-[#22c55e]";
}

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [files, setFiles] = useState<SubscriberFile[]>([]);
  const [freeUserFiles, setFreeUserFiles] = useState<FreeUserFile[]>([]);
  const [storage, setStorage] = useState({ used: 0, limit: 5 * 1024 * 1024 * 1024, remaining: 5 * 1024 * 1024 * 1024 });
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [, setCountdownTick] = useState(0);
  
  const [fileToDelete, setFileToDelete] = useState<SubscriberFile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [hqCredits, setHqCredits] = useState(0);
  const [hqCheckoutLoading, setHqCheckoutLoading] = useState(false);
  const [showHqSuccessToast, setShowHqSuccessToast] = useState(false);

  // Video generator state
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [videoGenFile, setVideoGenFile] = useState<{url: string, name: string} | null>(null);
  const [videoGenAudioDuration, setVideoGenAudioDuration] = useState(0);

  const handleDownload = async (url: string, fileName: string, fileId: string) => {
    setDownloadingFileId(fileId);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    } finally {
      setDownloadingFileId(null);
    }
  };

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
      router.replace("/dashboard", { scroll: false });
    }
    if (searchParams.get("hq_success") === "true") {
      setShowHqSuccessToast(true);
      setHqCredits(1);
      setTimeout(() => setShowHqSuccessToast(false), 5000);
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      setSubscriptionData(data);
      
      if (data.storage) {
        setFiles(data.storage.files || []);
        setStorage({
          used: data.storage.used,
          limit: data.storage.limit,
          remaining: data.storage.remaining,
        });
      }
    } catch (error) {
      console.error("Failed to fetch subscription data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFreeUserFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files/free-user");
      const data = await res.json();
      setFreeUserFiles(data.files || []);
    } catch (error) {
      console.error("Failed to fetch free user files:", error);
    }
  }, []);

  const fetchHqCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/hq-purchase/status");
      const data = await res.json();
      setHqCredits(data.credits || 0);
    } catch (error) {
      console.error("Failed to fetch HQ credits:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchFreeUserFiles();
      fetchHqCredits();
    } else {
      setLoading(false);
    }
  }, [user, fetchSubscriptionData, fetchFreeUserFiles, fetchHqCredits]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/handler/sign-in");
    }
  }, [loading, user, router]);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleHqPurchase = async () => {
    setHqCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/purchase-hq", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("HQ checkout error:", error);
    } finally {
      setHqCheckoutLoading(false);
    }
  };

  const openDeleteModal = (file: SubscriberFile) => {
    setFileToDelete(file);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setFileToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    
    setDeletingFileId(fileToDelete.id);
    try {
      const res = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: fileToDelete.id }),
      });
      if (res.ok) {
        fetchSubscriptionData();
        closeDeleteModal();
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingFileId(null);
    }
  };

  const openVideoGenerator = async (url: string, name: string) => {
    // Get audio duration
    const audio = new Audio(url);
    
    const onLoadedMetadata = () => {
      setVideoGenAudioDuration(audio.duration);
      setVideoGenFile({ url, name });
      setShowVideoGenerator(true);
      cleanup();
    };
    
    const onError = () => {
      console.error("Failed to load audio metadata");
      // Fallback: open video generator anyway with default duration
      setVideoGenAudioDuration(0);
      setVideoGenFile({ url, name });
      setShowVideoGenerator(true);
      cleanup();
    };
    
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
    };
    
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);
    
    // Timeout fallback in case neither event fires
    setTimeout(() => {
      if (!showVideoGenerator) {
        console.log("Metadata load timeout, opening anyway");
        setVideoGenAudioDuration(audio.duration || 0);
        setVideoGenFile({ url, name });
        setShowVideoGenerator(true);
        cleanup();
      }
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isSubscribed = subscriptionData?.isSubscribed || false;
  const storagePercentage = (storage.used / storage.limit) * 100;

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
            top: "-15%",
            right: "-10%",
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
            bottom: "-10%",
            left: "-5%",
          }}
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Toasts */}
          <AnimatePresence>
            {showSuccessToast && (
              <motion.div
                className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-[rgba(34,197,94,0.15)] backdrop-blur-xl border border-[rgba(34,197,94,0.3)] flex items-center gap-3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[#22c55e]">Subscription Activated!</p>
                  <p className="text-sm text-(--text-secondary)">Welcome to Unlimited Mastering</p>
                </div>
                <button onClick={() => setShowSuccessToast(false)} className="ml-4 text-(--text-muted) hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
                  <p className="text-sm text-(--text-secondary)">You have 1 high-quality 24-bit export credit</p>
                </div>
                <button onClick={() => setShowHqSuccessToast(false)} className="ml-4 text-(--text-muted) hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteModal && fileToDelete && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                  onClick={closeDeleteModal}
                />
                <motion.div
                  className="relative z-10 w-full max-w-md glass-card p-8"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                >
                  <button
                    onClick={closeDeleteModal}
                    className="absolute top-4 right-4 text-(--text-muted) hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(239,68,68,0.15)] flex items-center justify-center">
                    <Trash2 className="w-8 h-8 text-[#ef4444]" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-center">Delete File?</h3>
                  <p className="text-(--text-secondary) text-sm mb-2 text-center">
                    Are you sure you want to delete this file?
                  </p>
                  <p className="text-(--text-muted) text-xs mb-4 text-center font-mono truncate px-4">
                    {fileToDelete.fileName}
                  </p>
                  <p className="text-[#ef4444] text-xs mb-6 text-center">
                    This action cannot be undone.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={closeDeleteModal}
                      className="flex-1 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteFile}
                      disabled={deletingFileId === fileToDelete.id}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#ef4444] to-[#dc2626] font-semibold transition-colors flex items-center justify-center gap-2 text-white"
                    >
                      {deletingFileId === fileToDelete.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="inline-flex items-center gap-2 text-(--text-secondary) hover:text-foreground transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Home</span>
              </Link>
              
              <div className="flex items-center gap-2">
                <ThemeSelector />
                <button
                  onClick={() => user.signOut()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-(--text-secondary) hover:text-foreground hover:bg-[rgba(255,255,255,0.05)] transition-all text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center shadow-lg shadow-[rgba(249,115,22,0.3)]">
                <Headphones className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#f97316] to-[#3b82f6] bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-(--text-secondary) text-sm truncate max-w-[200px] sm:max-w-none">{user.primaryEmail}</p>
              </div>
            </div>
          </motion.div>

          {/* Master Audio Section */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center shadow-lg shadow-[rgba(249,115,22,0.2)]">
                <Music2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Master Your Audio</h2>
                <p className="text-sm text-(--text-muted)">Upload and master your podcast</p>
              </div>
            </div>
            
            <MasteringTool compact />
          </motion.div>

          {/* Subscription Status Card */}
          <motion.div
            className="glass-card p-6 md:p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isSubscribed 
                    ? "bg-gradient-to-br from-[rgba(234,179,8,0.2)] to-[rgba(234,179,8,0.1)]" 
                    : "bg-[rgba(255,255,255,0.05)]"
                }`}>
                  <Crown className={`w-6 h-6 ${isSubscribed ? "text-[#eab308]" : "text-(--text-muted)"}`} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">{isSubscribed ? "Unlimited Mastering" : "Free Plan"}</h2>
                  <p className="text-sm text-(--text-secondary)">
                    {isSubscribed 
                      ? subscriptionData?.subscription?.cancelAtPeriodEnd 
                        ? `Cancels ${formatDate(subscriptionData.subscription.currentPeriodEnd)}`
                        : `Renews ${formatDate(subscriptionData?.subscription?.currentPeriodEnd || "")}`
                      : "2 files per week limit"
                    }
                  </p>
                </div>
              </div>
              
              {isSubscribed ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[rgba(255,255,255,0.15)] hover:border-[#f97316] hover:bg-[rgba(249,115,22,0.1)] transition-all font-medium"
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>Manage Subscription</span>
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={checkoutLoading}
                  className="btn-primary"
                >
                  {checkoutLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-5 h-5" />
                      <span>Upgrade to Unlimited — $10/mo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isSubscribed ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { icon: Sparkles, text: "Unlimited Mastering" },
                  { icon: HardDrive, text: "24-bit HQ Exports" },
                  { icon: Check, text: "5GB Cloud Storage" },
                ].map((feature) => (
                  <div key={feature.text} className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
                    <div className="flex items-center gap-2">
                      <feature.icon className="w-4 h-4 text-[#22c55e]" />
                      <span className="text-sm font-medium">{feature.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
                  <p className="text-sm text-(--text-secondary) mb-3">Your free plan includes:</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-(--text-muted)" />
                      2/week
                    </span>
                    <span className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-(--text-muted)" />
                      16-bit
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-(--text-muted)" />
                      24h retention
                    </span>
                  </div>
                </div>

                {/* HQ Credits */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[rgba(249,115,22,0.1)] to-[rgba(59,130,246,0.1)] border border-[rgba(249,115,22,0.2)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-[#f97316]" />
                        <p className="font-semibold">24-bit HQ Export</p>
                        {hqCredits > 0 && (
                          <span className="text-xs bg-[rgba(34,197,94,0.15)] text-[#22c55e] px-2 py-0.5 rounded-full">
                            {hqCredits} credit{hqCredits !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-(--text-muted)">
                        {hqCredits > 0 
                          ? "Use in Advanced Settings when mastering" 
                          : "Exact format for Spotify, Apple Podcasts & YouTube — $1"
                        }
                      </p>
                    </div>
                    {hqCredits === 0 && (
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
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Storage & Files (Subscribers only) */}
          {isSubscribed && (
            <motion.div
              className="glass-card p-6 md:p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-[#f97316]" />
                  Your Files
                </h2>
                <span className="text-sm text-(--text-secondary)">
                  {formatFileSize(storage.used)} / {formatFileSize(storage.limit)} used
                </span>
              </div>

              {/* Storage Bar */}
              <div className="mb-6">
                <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#f97316] to-[#3b82f6] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-(--text-muted) mt-2">
                  {formatFileSize(storage.remaining)} remaining
                </p>
              </div>

              {/* Files List */}
              {files.length === 0 ? (
                <div className="text-center py-12 text-(--text-muted)">
                  <FileAudio className="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No files yet</p>
                  <p className="text-sm mt-1">Your mastered files will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(249,115,22,0.3)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[rgba(249,115,22,0.2)] to-[rgba(59,130,246,0.2)] flex items-center justify-center shrink-0">
                          <FileAudio className="w-5 h-5 text-[#f97316]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{file.fileName}</p>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-(--text-muted)">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{formatDate(file.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openVideoGenerator(file.url, file.fileName)}
                          className="p-2.5 rounded-xl hover:bg-[rgba(139,92,246,0.1)] text-(--text-secondary) hover:text-[#8b5cf6] transition-colors"
                          title="Generate video"
                        >
                          <Video className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(file.url, file.fileName, file.id)}
                          disabled={downloadingFileId === file.id}
                          className="p-2.5 rounded-xl hover:bg-[rgba(249,115,22,0.1)] text-(--text-secondary) hover:text-[#f97316] transition-colors disabled:opacity-50"
                          title="Download file"
                        >
                          {downloadingFileId === file.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => openDeleteModal(file)}
                          disabled={deletingFileId === file.id}
                          className="p-2.5 rounded-xl hover:bg-[rgba(239,68,68,0.1)] text-(--text-secondary) hover:text-[#ef4444] transition-colors"
                          title="Delete file"
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Free User Files */}
          {!isSubscribed && (
            <motion.div
              className="glass-card p-6 md:p-8 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between gap-2 mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#f97316]" />
                  Recent Files
                </h2>
                <span className="text-xs text-(--text-muted) flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  24h expiry
                </span>
              </div>

              {freeUserFiles.length === 0 ? (
                <div className="text-center py-12 text-(--text-muted)">
                  <FileAudio className="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No recent files</p>
                  <p className="text-sm mt-1">Master a file to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {freeUserFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(249,115,22,0.3)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[rgba(249,115,22,0.2)] to-[rgba(59,130,246,0.2)] flex items-center justify-center shrink-0">
                          <FileAudio className="w-5 h-5 text-[#f97316]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{file.fileName}</p>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-(--text-muted)">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${getCountdownColor(file.expiresAt)}`}>
                              <Clock className="w-3 h-3" />
                              {formatCountdown(file.expiresAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {file.status === "completed" && file.downloadUrl ? (
                          <button
                            onClick={() => handleDownload(
                              file.downloadUrl!,
                              file.fileName.replace(/\.[^/.]+$/, "_mastered.wav"),
                              `free-${file.id}`
                            )}
                            disabled={downloadingFileId === `free-${file.id}`}
                            className="p-2.5 rounded-xl hover:bg-[rgba(249,115,22,0.1)] text-(--text-secondary) hover:text-[#f97316] transition-colors disabled:opacity-50"
                            title="Download file"
                          >
                            {downloadingFileId === `free-${file.id}` ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Download className="w-5 h-5" />
                            )}
                          </button>
                        ) : file.status === "processing" ? (
                          <div className="p-2.5 text-(--text-muted)">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Upgrade CTA for Free Users */}
          {!isSubscribed && (
            <motion.div
              className="glass-card p-8 md:p-10 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[rgba(234,179,8,0.2)] to-[rgba(234,179,8,0.1)] flex items-center justify-center">
                <Crown className="w-8 h-8 text-[#eab308]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Unlock Unlimited</h3>
              <p className="text-(--text-secondary) text-sm mb-6 max-w-md mx-auto">
                Unlimited mastering, 24-bit exports, and 5GB cloud storage.
              </p>
              <button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="btn-primary mx-auto"
              >
                {checkoutLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    <span>$10/month</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Video Generator Modal */}
      <AnimatePresence>
        {showVideoGenerator && videoGenFile && (
          <VideoGenerator
            audioUrl={videoGenFile.url}
            audioDuration={videoGenAudioDuration}
            fileName={videoGenFile.name}
            onClose={() => {
              setShowVideoGenerator(false);
              setVideoGenFile(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
