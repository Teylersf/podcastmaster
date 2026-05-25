"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Disc3,
  FolderOpen,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Music,
  Sparkles,
  Zap,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Archive,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TemplatePicker from "@/components/TemplatePicker";
import {
  DEFAULT_MUSIC_TEMPLATES,
  type Template,
} from "@/lib/templateCategories";

// ---- Config -----------------------------------------------------------------

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teylersf--podcast-mastering-fastapi-app.modal.run";

const ACCEPTED_EXTENSIONS = [".wav", ".mp3", ".flac", ".aiff", ".aif", ".ogg", ".m4a"];

// How many tracks to master in parallel. Modal scales to zero so concurrent
// jobs each spin up their own container — 2 is a good citizen of compute.
const PARALLEL_WORKERS = 2;

// ---- Types ------------------------------------------------------------------

type TrackStatus =
  | "queued"
  | "uploading"
  | "mastering"
  | "done"
  | "failed";

interface BatchTrack {
  id: string;             // local UUID
  file: File;
  status: TrackStatus;
  uploadProgress: number; // 0..100
  jobProgress: number;    // 0..100 (from Modal /status)
  message: string;
  jobId?: string;
  downloadUrl?: string;
  error?: string;
}

// ---- Helpers ----------------------------------------------------------------

function isAudioFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return (
    file.type.startsWith("audio/") ||
    ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed: HTTP ${r.status}`);
  return await r.blob();
}

// XHR upload with progress, used during direct-to-R2 PUTs.
function xhrPut(
  url: string,
  file: File,
  contentType: string,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`upload HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("upload network error"));
    xhr.send(file);
  });
}

// ---- Core per-track pipeline -----------------------------------------------

interface RunSettings {
  templateId: string;
  outputQuality: "standard" | "high";
  loudnessTarget: "conservative" | "standard" | "loud";
  noiseReduction: boolean;
  audioType: "podcast" | "music";
}

async function processOneTrack(
  track: BatchTrack,
  settings: RunSettings,
  update: (patch: Partial<BatchTrack>) => void
): Promise<void> {
  try {
    // ---- 1. Get presigned upload URL ----
    update({ status: "uploading", uploadProgress: 0, message: "Preparing upload..." });
    const urlRes = await fetch(
      `${API_URL}/get-upload-url?filename=${encodeURIComponent(track.file.name)}&content_type=${encodeURIComponent(track.file.type || "audio/wav")}`,
      { method: "POST" }
    );
    if (!urlRes.ok) throw new Error(`get-upload-url HTTP ${urlRes.status}`);
    const { file_id, upload_url } = await urlRes.json();

    // ---- 2. Direct PUT to R2 ----
    await xhrPut(upload_url, track.file, track.file.type || "audio/wav", (loaded, total) => {
      update({ uploadProgress: Math.round((loaded / total) * 100) });
    });

    // ---- 3. Confirm upload ----
    update({ message: "Confirming upload..." });
    const confirmRes = await fetch(
      `${API_URL}/confirm-upload?file_id=${encodeURIComponent(file_id)}&size=${track.file.size}`,
      { method: "POST" }
    );
    if (!confirmRes.ok) throw new Error(`confirm-upload HTTP ${confirmRes.status}`);

    // ---- 4. Start mastering ----
    update({ status: "mastering", jobProgress: 0, message: "Starting mastering..." });
    const params = new URLSearchParams({
      target_file_id: file_id,
      template_id: settings.templateId,
      output_quality: settings.outputQuality,
      loudness_target: settings.loudnessTarget,
      noise_reduction: String(settings.noiseReduction),
      audio_type: settings.audioType,
    });
    const masterRes = await fetch(`${API_URL}/master?${params.toString()}`, { method: "POST" });
    if (!masterRes.ok) {
      const errBody = await masterRes.text();
      throw new Error(`master failed: ${errBody.slice(0, 120)}`);
    }
    const { job_id } = await masterRes.json();
    update({ jobId: job_id });

    // ---- 5. Poll status ----
    while (true) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(`${API_URL}/status/${job_id}`);
      if (!statusRes.ok) {
        // 404 right after job start can happen on Modal cold start; retry a few times
        continue;
      }
      const status = await statusRes.json();
      if (status.status === "completed") {
        update({
          status: "done",
          jobProgress: 100,
          message: "Done",
          downloadUrl: `${API_URL}/download/${job_id}`,
        });
        return;
      }
      if (status.status === "failed") {
        throw new Error(status.message || "mastering failed");
      }
      update({
        jobProgress: typeof status.progress === "number" ? status.progress : 0,
        message: status.message || "Processing...",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    update({ status: "failed", error: msg, message: `Error: ${msg}` });
  }
}

// ---- Sub-components --------------------------------------------------------

function TrackRow({
  track,
  onRemove,
}: {
  track: BatchTrack;
  onRemove: (id: string) => void;
}) {
  const showRemove = track.status === "queued" || track.status === "failed";

  const statusBadge = (() => {
    switch (track.status) {
      case "queued":
        return <span className="text-xs text-(--text-muted)">Queued</span>;
      case "uploading":
        return (
          <span className="text-xs text-(--accent-primary) flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading {track.uploadProgress}%
          </span>
        );
      case "mastering":
        return (
          <span className="text-xs text-(--accent-primary) flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Mastering {track.jobProgress}%
          </span>
        );
      case "done":
        return (
          <span className="text-xs text-(--success) flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </span>
        );
      case "failed":
        return (
          <span className="text-xs text-(--error) flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  })();

  const progressPct =
    track.status === "uploading"
      ? track.uploadProgress / 2 // upload counts as first half
      : track.status === "mastering"
        ? 50 + track.jobProgress / 2 // mastering counts as second half
        : track.status === "done"
          ? 100
          : 0;

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-secondary) p-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-(--accent-muted) flex items-center justify-center shrink-0">
          <Music className="w-4 h-4 text-(--accent-primary)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={track.file.name}>
            {track.file.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-(--text-muted)">
              {formatBytes(track.file.size)}
            </span>
            <span className="text-xs text-(--text-muted)">·</span>
            {statusBadge}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {track.status === "done" && track.downloadUrl && (
            <a
              href={track.downloadUrl}
              className="px-3 py-1.5 rounded-lg bg-(--accent-primary) text-white text-xs font-semibold flex items-center gap-1 hover:opacity-90"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          )}
          {showRemove && (
            <button
              type="button"
              onClick={() => onRemove(track.id)}
              className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary)"
              aria-label="Remove track"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {(track.status === "uploading" || track.status === "mastering") && (
        <div className="mt-2 h-1 rounded-full bg-(--bg-tertiary) overflow-hidden">
          <div
            className="h-full bg-(--accent-primary) transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
      {track.status === "failed" && track.error && (
        <p className="text-xs text-(--error) mt-2">{track.error}</p>
      )}
    </div>
  );
}

// ---- Main component --------------------------------------------------------

interface Props {
  /** "music" for the music page (default). Could be reused for podcast album-mode later. */
  audioType?: "podcast" | "music";
}

export default function AlbumBatchMastering({ audioType = "music" }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const [tracks, setTracks] = useState<BatchTrack[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Settings (one set, applied to every track in the batch)
  const [templates, setTemplates] = useState<Template[]>(
    audioType === "music" ? DEFAULT_MUSIC_TEMPLATES : []
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [outputQuality, setOutputQuality] = useState<"standard" | "high">("standard");
  const [loudnessTarget, setLoudnessTarget] = useState<"conservative" | "standard" | "loud">(
    "standard"
  );
  const [noiseReduction, setNoiseReduction] = useState(false);

  // Lazy-load templates so the picker shows real music presets.
  useMemo(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/templates`);
        if (!r.ok) return;
        const data = await r.json();
        if (Array.isArray(data.templates) && data.templates.length > 0) {
          setTemplates(data.templates);
          if (!selectedTemplate) {
            const first = data.templates.find(
              (t: Template) => (t.kind ?? "podcast") === audioType
            );
            if (first) setSelectedTemplate(first.id);
          }
        }
      } catch {
        // leave defaults
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioType]);

  // ---- File intake ----

  const addFiles = useCallback((files: File[]) => {
    const audios = files.filter(isAudioFile);
    if (audios.length === 0) return;
    setTracks((prev) => {
      // De-dupe by name+size — folder picks can sometimes double up
      const seen = new Set(prev.map((t) => `${t.file.name}:${t.file.size}`));
      const additions: BatchTrack[] = [];
      for (const f of audios) {
        const key = `${f.name}:${f.size}`;
        if (seen.has(key)) continue;
        seen.add(key);
        additions.push({
          id: genId(),
          file: f,
          status: "queued",
          uploadProgress: 0,
          jobProgress: 0,
          message: "",
        });
      }
      return [...prev, ...additions];
    });
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    if (e.target) e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleRemove = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearDone = () => {
    setTracks((prev) => prev.filter((t) => t.status !== "done"));
  };

  const resetAll = () => {
    setTracks([]);
  };

  // ---- Batch runner ----

  const updateTrack = useCallback((id: string, patch: Partial<BatchTrack>) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const runBatch = useCallback(async () => {
    if (isRunning) return;
    if (!selectedTemplate) return;

    const queued = tracks.filter((t) => t.status === "queued" || t.status === "failed");
    if (queued.length === 0) return;

    setIsRunning(true);

    // Reset failed tracks back to queued so the worker picks them up.
    setTracks((prev) =>
      prev.map((t) =>
        t.status === "failed"
          ? { ...t, status: "queued", error: undefined, message: "" }
          : t
      )
    );

    const settings: RunSettings = {
      templateId: selectedTemplate,
      outputQuality,
      loudnessTarget,
      noiseReduction,
      audioType,
    };

    // Build a local queue snapshot (track refs, in order)
    const queue = [...queued];

    const workers = Array.from({ length: PARALLEL_WORKERS }, async () => {
      while (true) {
        const next = queue.shift();
        if (!next) return;
        await processOneTrack(next, settings, (patch) => updateTrack(next.id, patch));
      }
    });

    await Promise.all(workers);
    setIsRunning(false);
  }, [
    audioType,
    isRunning,
    loudnessTarget,
    noiseReduction,
    outputQuality,
    selectedTemplate,
    tracks,
    updateTrack,
  ]);

  // ---- Download-all-as-zip ----

  const downloadAll = useCallback(async () => {
    const done = tracks.filter((t) => t.status === "done" && t.downloadUrl);
    if (done.length === 0) return;
    setZipping(true);
    try {
      // jszip is loaded dynamically so it doesn't add to the initial bundle.
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      // Fetch each file and add to zip in parallel (browser will pipeline).
      await Promise.all(
        done.map(async (t) => {
          try {
            const blob = await fetchAsBlob(t.downloadUrl!);
            const base = t.file.name.replace(/\.[^.]+$/, "");
            zip.file(`${base}_mastered.wav`, blob);
          } catch (e) {
            console.error("Failed to fetch", t.file.name, e);
          }
        })
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mastered_album.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  }, [tracks]);

  // ---- Render ----

  const doneCount = tracks.filter((t) => t.status === "done").length;
  const totalCount = tracks.length;
  const canRun = totalCount > 0 && !isRunning && Boolean(selectedTemplate);

  return (
    <section
      id="album-batch"
      className="glass-card p-6 md:p-8 mb-8"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center shrink-0">
            <Disc3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl">Master a Full Album</h2>
            <p className="text-sm text-(--text-muted)">
              Drop multiple tracks or pick a folder. We&rsquo;ll master them all with the
              same settings so the album hangs together.
            </p>
          </div>
        </div>
      </div>

      {/* Drop area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragActive(false);
        }}
        onDrop={handleDrop}
        className={`dropzone cursor-pointer ${isDragActive ? "active" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          multiple
          className="sr-only"
          onChange={handleFileInput}
        />
        {/* Hidden second input for folder picker (Chrome/Edge/Safari).
            The webkitdirectory attribute is non-standard but widely supported.
            React's HTMLInputElement types accept these via DOM attribute spread. */}
        <input
          {...({
            ref: dirInputRef,
            type: "file",
            webkitdirectory: "",
            directory: "",
            multiple: true,
            className: "sr-only",
            onChange: handleFileInput,
          } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
        />
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-(--bg-tertiary) flex items-center justify-center mb-3">
            <Upload className="w-7 h-7 text-(--text-secondary)" />
          </div>
          <p className="font-medium mb-1">
            Drop your album&rsquo;s tracks here, or click to choose files
          </p>
          <p className="text-sm text-(--text-muted) mb-3">
            WAV, MP3, FLAC, AIFF, OGG, M4A — any number of tracks
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dirInputRef.current?.click();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-medium) hover:border-(--accent-primary) text-sm transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Or pick a whole folder
          </button>
        </div>
      </div>

      {/* Settings + queue */}
      <AnimatePresence>
        {tracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-sm text-(--text-secondary)">
                <strong className="text-(--text-primary)">{tracks.length}</strong>{" "}
                {tracks.length === 1 ? "track" : "tracks"} queued
                {doneCount > 0 && ` · ${doneCount} done`}
              </p>
              <div className="flex items-center gap-2">
                {doneCount > 0 && (
                  <button
                    type="button"
                    onClick={clearDone}
                    className="text-xs text-(--text-muted) hover:text-(--text-primary)"
                  >
                    Clear done
                  </button>
                )}
                {!isRunning && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="text-xs text-(--text-muted) hover:text-(--text-primary)"
                  >
                    Reset all
                  </button>
                )}
              </div>
            </div>

            {/* Settings drawer */}
            <div className="mt-4 rounded-xl border border-(--border-subtle) bg-(--bg-secondary)">
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <SettingsIcon className="w-4 h-4 text-(--text-muted)" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Album Settings</p>
                    <p className="text-xs text-(--text-muted)">
                      {outputQuality === "high" ? "24-bit" : "16-bit"} ·{" "}
                      {loudnessTarget === "conservative"
                        ? "-16 LUFS"
                        : loudnessTarget === "loud"
                          ? "-12 LUFS"
                          : "-14 LUFS (Spotify)"}
                      {noiseReduction ? " · AI noise reduction" : ""}
                    </p>
                  </div>
                </div>
                {showSettings ? (
                  <ChevronUp className="w-4 h-4 text-(--text-muted)" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-(--text-muted)" />
                )}
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      {/* Reference preset */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                          Reference Sound (applied to every track)
                        </label>
                        <TemplatePicker
                          templates={templates}
                          selected={selectedTemplate}
                          onSelect={setSelectedTemplate}
                          compact
                          kindFilter={audioType}
                        />
                      </div>

                      {/* Output quality */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                          Output Quality
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["standard", "high"] as const).map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setOutputQuality(q)}
                              className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
                                outputQuality === q
                                  ? "border-(--accent-primary) bg-(--accent-muted)"
                                  : "border-(--border-subtle) hover:border-(--border-medium)"
                              }`}
                            >
                              <p className="font-medium">
                                {q === "high" ? "High Quality (24-bit)" : "Standard (16-bit)"}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Loudness target */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-(--text-secondary)">
                          <span className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            Loudness Target
                          </span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              ["conservative", "Conservative", "-16 LUFS · Apple"],
                              ["standard", "Standard", "-14 LUFS · Spotify"],
                              ["loud", "Loud", "-12 LUFS · Broadcast"],
                            ] as const
                          ).map(([id, name, desc]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setLoudnessTarget(id)}
                              className={`p-2.5 rounded-lg border text-center transition-all ${
                                loudnessTarget === id
                                  ? "border-(--accent-primary) bg-(--accent-muted)"
                                  : "border-(--border-subtle) hover:border-(--border-medium)"
                              }`}
                            >
                              <p className="font-medium text-sm">{name}</p>
                              <p className="text-xs text-(--text-muted)">{desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Noise reduction */}
                      <button
                        type="button"
                        onClick={() => setNoiseReduction((v) => !v)}
                        className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                          noiseReduction
                            ? "border-(--accent-primary) bg-(--accent-muted)"
                            : "border-(--border-subtle) hover:border-(--border-medium)"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Noise Reduction
                          </p>
                          <p className="text-xs text-(--text-muted) mt-0.5">
                            Cleans hum, room tone, and hiss before mastering.
                          </p>
                        </div>
                        <div
                          className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${
                            noiseReduction ? "bg-(--accent-primary)" : "bg-(--border-medium)"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                              noiseReduction ? "left-4.5" : "left-0.5"
                            }`}
                          />
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Track list */}
            <div className="mt-4 space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {tracks.map((t) => (
                <TrackRow key={t.id} track={t} onRemove={handleRemove} />
              ))}
            </div>

            {/* CTA row */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={runBatch}
                disabled={!canRun}
                className="btn-primary flex-1 justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mastering album… ({doneCount}/{totalCount})
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Master Album ({totalCount}{" "}
                    {totalCount === 1 ? "track" : "tracks"})
                  </>
                )}
              </button>

              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={downloadAll}
                  disabled={zipping}
                  className="px-5 py-3 rounded-xl bg-(--bg-elevated) border border-(--border-medium) hover:border-(--accent-primary) font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {zipping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Zipping…
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Download all as ZIP
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
