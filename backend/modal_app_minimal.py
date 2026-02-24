"""
Podcast Mastering - Modal.com Serverless Backend
AI-powered audio mastering for podcasts
Deploy: modal deploy modal_app_minimal.py
"""

import modal
from datetime import datetime, timedelta
from typing import Optional, List
import os

# Define the Modal app
app = modal.App("podcast-mastering")

# Volume for caching Whisper models
whisper_volume = modal.Volume.from_name("whisper-models", create_if_missing=True)
WHISPER_CACHE = "/root/.cache/whisper"

# Define the container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libsndfile1", "ffmpeg")
    .pip_install(
        "matchering>=2.0.6",
        "fastapi>=0.109.0",
        "python-multipart>=0.0.9",
        "boto3>=1.34.0",
        "soundfile>=0.12.0",
        "requests>=2.31.0",
        "vercel-blob>=0.1.0",
        "openai-whisper>=20231117",
    )
    .add_local_dir("references", "/references")
)

# Image for video rendering (with Node.js and Chromium)
video_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "ffmpeg", "nodejs", "npm", "chromium",
        "fonts-liberation", "libappindicator3-1", "libasound2",
        "libatk-bridge2.0-0", "libatk1.0-0", "libc6", "libcairo2",
        "libcups2", "libdbus-1-3", "libexpat1", "libfontconfig1",
        "libgbm1", "libgcc1", "libglib2.0-0", "libgtk-3-0",
        "libnspr4", "libnss3", "libpango-1.0-0", "libpangocairo-1.0-0",
        "libstdc++6", "libx11-6", "libx11-xcb1", "libxcb1",
        "libxcomposite1", "libxcursor1", "libxdamage1", "libxext6",
        "libxfixes3", "libxi6", "libxrandr2", "libxrender1",
        "libxss1", "libxtst6", "lsb-release", "wget", "xdg-utils",
    )
    .pip_install("boto3>=1.34.0")
    .run_commands("npm install -g remotion @remotion/renderer @remotion/bundler")
)

# Volume for video renders
video_volume = modal.Volume.from_name("video-renders", create_if_missing=True)
VIDEO_DIR = "/video-renders"

# Reference templates
REFERENCE_TEMPLATES = {
    "voice-optimized": {
        "id": "voice-optimized",
        "name": "Recommended - Optimized for Voices",
        "description": "Professional voice-optimized preset with balanced EQ and loudness. Best for podcasts and spoken content.",
        "file_path": "/references/voice-optimized.mp3",
    },
    "female-podcast": {
        "id": "female-podcast",
        "name": "Female Voice + Full Production",
        "description": "Optimized for female voices with intro music and sound effects. Ready-to-release quality.",
        "file_path": "/references/femalepodcast.mp3",
    },
    "male-podcast": {
        "id": "male-podcast",
        "name": "Male Voice + Full Production",
        "description": "Optimized for male voices with intro music and sound effects. Ready-to-release quality.",
        "file_path": "/references/maleonlyvoicesfullproduction.mp3",
    },
    "news-broadcast": {
        "id": "news-broadcast",
        "name": "News & Broadcast Style",
        "description": "Breaking news channel sound. Male & female voices with background music, intros, and full production.",
        "file_path": "/references/maleandfemalenewssounds.mp3",
    },
}

# Create a volume for temporary processing
volume = modal.Volume.from_name("podcast-mastering-files", create_if_missing=True)
VOLUME_PATH = "/data"

# Store job statuses and file metadata
job_statuses = modal.Dict.from_name("podcast-mastering-jobs", create_if_missing=True)
file_metadata = modal.Dict.from_name("podcast-mastering-file-metadata", create_if_missing=True)
transcription_jobs = modal.Dict.from_name("podcast-transcription-jobs", create_if_missing=True)

# R2 Configuration
r2_secret = modal.Secret.from_name("r2-credentials")
webhook_secret = modal.Secret.from_name("webhook-credentials")

R2_BUCKET = "podcastmaster"
R2_ACCOUNT_ID = "f9b23e1cdab559b2f158c2142dad952b"
R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

WEBHOOK_URL = "https://freepodcastmastering.com/api/webhooks/job-complete"
BLOB_UPLOAD_URL = "https://freepodcastmastering.com/api/files/get-blob-upload-url"
FILE_RETENTION_HOURS = 24


def get_r2_client():
    """Create an S3 client configured for Cloudflare R2"""
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


# Cached Whisper model
whisper_model = None

def get_whisper_model():
    """Get or load cached Whisper model"""
    global whisper_model
    if whisper_model is None:
        import whisper
        import os
        os.makedirs(WHISPER_CACHE, exist_ok=True)
        whisper_model = whisper.load_model("base", download_root=WHISPER_CACHE)
    return whisper_model


@app.function(
    image=image,
    timeout=300,
    volumes={WHISPER_CACHE: whisper_volume},
)
def setup_whisper():
    """Pre-download Whisper model to cached volume"""
    import os
    os.makedirs(WHISPER_CACHE, exist_ok=True)
    model = get_whisper_model()
    return {"status": "ready", "model": "base", "cache_path": WHISPER_CACHE}


@app.function(
    image=image,
    volumes={VOLUME_PATH: volume},
    secrets=[r2_secret, webhook_secret],
    timeout=36000,
    cpu=4,
    memory=8192,
)
def process_audio(
    job_id: str, 
    target_r2_key: str, 
    reference_source: str, 
    is_template: bool = False,
    output_quality: str = "standard",
    limiter_mode: str = "normal",
):
    """Process audio using Matchering library"""
    import matchering as mg
    import soundfile as sf
    
    s3 = get_r2_client()
    
    os.makedirs(f"{VOLUME_PATH}/processing", exist_ok=True)
    target_path = f"{VOLUME_PATH}/processing/{job_id}_target.wav"
    reference_path = f"{VOLUME_PATH}/processing/{job_id}_reference.wav"
    output_path = f"{VOLUME_PATH}/processing/{job_id}_mastered.wav"
    output_r2_key = f"outputs/{job_id}_mastered.wav"
    
    files_to_cleanup = [target_path, output_path]

    try:
        job_statuses[job_id] = {
            "status": "processing",
            "progress": 5,
            "message": "Downloading your audio...",
            "output_file": None,
        }
        
        s3.download_file(R2_BUCKET, target_r2_key, target_path)
        job_statuses[job_id] = {**job_statuses[job_id], "progress": 10, "message": "Loading reference template..."}
        
        if is_template:
            template = REFERENCE_TEMPLATES.get(reference_source)
            if not template:
                raise ValueError(f"Unknown template: {reference_source}")
            reference_path = template["file_path"]
        else:
            s3.download_file(R2_BUCKET, reference_source, reference_path)
            files_to_cleanup.append(reference_path)
        
        job_statuses[job_id] = {**job_statuses[job_id], "progress": 15, "message": "Analyzing source audio..."}
        
        target_info = sf.info(target_path)
        original_sample_rate = target_info.samplerate
        
        limiter_thresholds = {
            "gentle": 0.95,
            "normal": 0.9,
            "loud": 0.8,
        }
        threshold = limiter_thresholds.get(limiter_mode, 0.9)
        
        podcast_config = mg.Config(
            max_length=635_040_000,
            threshold=threshold,
        )
        
        def log_handler(message: str):
            current = job_statuses.get(job_id, {})
            current["message"] = message
            
            if "Loading" in message:
                current["progress"] = 20
            elif "Analyzing" in message:
                current["progress"] = 40
            elif "Matching" in message:
                current["progress"] = 60
            elif "Limiting" in message:
                current["progress"] = 80
            elif "Saving" in message:
                current["progress"] = 85
                
            job_statuses[job_id] = current
        
        mg.log(log_handler)
        
        if output_quality == "high":
            result_format = mg.pcm24(output_path)
        else:
            result_format = mg.pcm16(output_path)
        
        mg.process(
            target=target_path,
            reference=reference_path,
            config=podcast_config,
            results=[result_format],
        )
        
        output_file_size = os.path.getsize(output_path)
        
        job_statuses[job_id] = {**job_statuses[job_id], "progress": 85, "message": "Uploading mastered audio..."}
        s3.upload_file(output_path, R2_BUCKET, output_r2_key)
        
        for path in files_to_cleanup:
            if os.path.exists(path):
                os.remove(path)
        
        for file_id, meta in file_metadata.items():
            if meta.get("job_id") == job_id:
                meta["output_r2_key"] = output_r2_key
                file_metadata[file_id] = meta
                break
        
        job_statuses[job_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Mastering complete!",
            "output_file": output_r2_key,
        }
        
        return {"success": True, "output_file": output_r2_key}
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        
        for path in files_to_cleanup:
            if os.path.exists(path):
                os.remove(path)
                
        job_statuses[job_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"Error: {error_msg}",
            "output_file": None,
        }
        
        return {"success": False, "error": error_msg}


@app.function(
    image=image,
    secrets=[r2_secret],
    timeout=1800,  # 30 minutes for large files
    cpu=2,
    memory=4096,
    volumes={WHISPER_CACHE: whisper_volume},
)
def transcribe_audio(audio_source: str, job_id: str, is_url: bool = False):
    """Transcribe audio using Whisper
    
    Args:
        audio_source: Either an R2 key or a URL to the audio file
        job_id: Unique job ID for tracking
        is_url: If True, audio_source is a URL; if False, it's an R2 key
    """
    try:
        import tempfile
        from datetime import datetime
        import urllib.request
        import logging
        
        logging.info(f"[TRANSCRIBE {job_id}] Starting transcription - is_url: {is_url}")
        
        temp_dir = tempfile.mkdtemp()
        local_path = os.path.join(temp_dir, "audio.wav")
        
        transcription_jobs[job_id] = {
            **transcription_jobs.get(job_id, {}),
            "progress": 10,
            "message": "Downloading audio...",
        }
        
        if is_url:
            # Download from URL (e.g., Vercel Blob)
            logging.info(f"[TRANSCRIBE {job_id}] Downloading from URL: {audio_source[:50]}...")
            try:
                opener = urllib.request.build_opener()
                opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
                urllib.request.install_opener(opener)
                urllib.request.urlretrieve(audio_source, local_path)
                logging.info(f"[TRANSCRIBE {job_id}] Downloaded successfully")
            except Exception as download_error:
                logging.error(f"[TRANSCRIBE {job_id}] Download failed: {str(download_error)}")
                raise download_error
        else:
            # Download from R2
            logging.info(f"[TRANSCRIBE {job_id}] Downloading from R2: {audio_source}")
            s3 = get_r2_client()
            s3.download_file(R2_BUCKET, audio_source, local_path)
        
        transcription_jobs[job_id] = {
            **transcription_jobs.get(job_id, {}),
            "progress": 30,
            "message": "Loading AI model...",
        }
        
        model = get_whisper_model()
        
        transcription_jobs[job_id] = {
            **transcription_jobs.get(job_id, {}),
            "progress": 50,
            "message": "Transcribing with AI...",
        }
        
        # Progress callback to update job status during transcription
        def progress_callback(progress_value):
            # progress_value is between 0 and 1
            progress_pct = int(50 + (progress_value * 40))  # 50-90% range
            transcription_jobs[job_id] = {
                **transcription_jobs.get(job_id, {}),
                "progress": progress_pct,
                "message": f"Transcribing audio... {int(progress_value * 100)}%",
            }
        
        result = model.transcribe(
            local_path,
            language="en",
            verbose=False,
        )
        
        segments = []
        total_segments = len(result["segments"])
        
        for i, segment in enumerate(result["segments"]):
            segments.append({
                "id": segment["id"],
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
            })
            # Update progress every 10 segments
            if i % 10 == 0:
                progress_pct = int(50 + ((i / total_segments) * 40))  # 50-90% range
                transcription_jobs[job_id] = {
                    **transcription_jobs.get(job_id, {}),
                    "progress": progress_pct,
                    "message": f"Processing segment {i}/{total_segments}...",
                }
        
        os.remove(local_path)
        os.rmdir(temp_dir)
        
        transcription_jobs[job_id] = {
            "status": "completed",
            "progress": 100,
            "segments": segments,
            "text": result["text"],
            "completed_at": datetime.utcnow().isoformat(),
        }
        
        return {"success": True, "segments": segments}
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        
        transcription_jobs[job_id] = {
            "status": "failed",
            "progress": 0,
            "error": error_msg,
        }
        return {"success": False, "error": error_msg}


# Track video render jobs using Modal Dict for cross-function state sharing
video_render_jobs = modal.Dict.from_name("podcast-video-render-jobs", create_if_missing=True)

@app.function(
    image=video_image,
    secrets=[r2_secret],
    timeout=86400,  # 24 hours maximum for long podcasts
    cpu=4,
    memory=8192,
    volumes={VIDEO_DIR: video_volume},
)
def render_video_job(
    job_id: str,
    audio_url: str,
    title: str,
    subtitle: str,
    captions: list,
    gradient_from: str,
    gradient_to: str,
    accent_color: str,
    show_progress_bar: bool,
    aspect_ratio: str,
    duration_seconds: int,
    fps: int = 30,
) -> dict:
    """
    Render a video using Remotion and upload to R2
    """
    import subprocess
    import tempfile
    import shutil
    import json
    import logging
    import urllib.request
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    R2_BUCKET = "podcastmaster"
    
    try:
        # Create temp directory for project
        project_dir = tempfile.mkdtemp(prefix="remotion_")
        logger.info(f"Created project dir: {project_dir}")
        
        # Create public directory for static files
        public_dir = os.path.join(project_dir, "public")
        os.makedirs(public_dir, exist_ok=True)
        
        # Download audio file to public directory
        audio_path = os.path.join(public_dir, "audio.mp3")
        logger.info(f"Downloading audio from {audio_url[:50]}...")
        try:
            urllib.request.urlretrieve(audio_url, audio_path)
            logger.info(f"Audio downloaded: {os.path.getsize(audio_path)} bytes")
        except Exception as e:
            logger.error(f"Failed to download audio: {e}")
            video_render_jobs[job_id] = {"status": "failed", "error": f"Audio download failed: {e}"}
            return {"success": False, "error": str(e)}
        
        # Create package.json
        package_json = {
            "name": "remotion-render",
            "version": "1.0.0",
            "dependencies": {
                "remotion": "^4.0.0",
                "@remotion/renderer": "^4.0.0",
                "@remotion/bundler": "^4.0.0",
                "@remotion/cli": "^4.0.0",
                "react": "^18.0.0",
                "react-dom": "^18.0.0",
            },
        }
        
        with open(f"{project_dir}/package.json", "w") as f:
            json.dump(package_json, f)
        
        # Install dependencies
        logger.info("Installing npm dependencies...")
        result = subprocess.run(
            ["npm", "install"],
            cwd=project_dir,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            logger.error(f"npm install failed: {result.stderr}")
            video_render_jobs[job_id] = {"status": "failed", "error": "npm install failed"}
            return {"success": False, "error": "npm install failed"}
        
        # Set dimensions based on aspect ratio
        if aspect_ratio == "16:9":
            width, height = 1920, 1080
        else:  # 9:16
            width, height = 1080, 1920
        
        duration_in_frames = duration_seconds * fps
        
        # Create Remotion root file
        root_tsx = f'''
import {{ Composition, registerRoot }} from 'remotion';
import {{ PodcastVideo }} from './Video';

const RemotionRoot: React.FC = () => {{
  return (
    <Composition
      id="PodcastVideo"
      component={{PodcastVideo}}
      durationInFrames={{{duration_in_frames}}}
      fps={{{fps}}}
      width={{{width}}}
      height={{{height}}}
      defaultProps={{{{
        audioSrc: "audio.mp3",
        title: "{title}",
        subtitle: "{subtitle}",
        gradientFrom: "{gradient_from}",
        gradientTo: "{gradient_to}",
        accentColor: "{accent_color}",
        showProgressBar: {str(show_progress_bar).lower()},
        captions: {json.dumps(captions)},
      }}}}
    />
  );
}};

registerRoot(RemotionRoot);
export default RemotionRoot;
'''
        
        with open(f"{project_dir}/Root.tsx", "w") as f:
            f.write(root_tsx)
        
        # Create simplified Video component
        video_tsx = '''
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

interface CaptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface PodcastVideoProps {
  audioSrc: string;
  title: string;
  subtitle?: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  showProgressBar: boolean;
  captions?: CaptionSegment[];
}

export const PodcastVideo: React.FC<PodcastVideoProps> = ({
  audioSrc,
  title,
  subtitle,
  gradientFrom,
  gradientTo,
  accentColor,
  showProgressBar,
  captions,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const currentTime = frame / fps;
  const progress = frame / durationInFrames;
  
  const currentCaption = useMemo(() => {
    if (!captions || captions.length === 0) return null;
    return captions.find(c => currentTime >= c.start && currentTime <= c.end);
  }, [captions, currentTime]);
  
  const bars = 48;
  const waveformData = useMemo(() => {
    return Array.from({ length: bars }, (_, i) => {
      const timeOffset = frame * 0.15;
      const barOffset = i * 0.3;
      const value = Math.sin(timeOffset + barOffset) * 0.3 +
                   Math.sin(timeOffset * 1.5 + barOffset * 1.2) * 0.2 +
                   Math.sin(timeOffset * 0.7 + barOffset * 0.5) * 0.25 + 0.15;
      return Math.max(0.08, Math.min(1, value));
    });
  }, [frame, bars]);
  
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'white',
      position: 'relative',
    }}>
      <Audio src={staticFile(audioSrc)} />
      
      <h1 style={{
        fontSize: width > height ? '64px' : '48px',
        fontWeight: 'bold',
        marginBottom: '16px',
        textAlign: 'center',
        padding: '0 60px',
        textShadow: '0 2px 20px rgba(0,0,0,0.5)',
      }}>{title}</h1>
      
      {subtitle && (
        <p style={{ fontSize: width > height ? '32px' : '24px', opacity: 0.8, marginBottom: '60px' }}>
          {subtitle}
        </p>
      )}
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: '200px',
        marginBottom: '40px',
      }}>
        {waveformData.map((value, i) => (
          <div key={i} style={{
            width: '12px',
            height: `${value * 200}px`,
            backgroundColor: accentColor,
            borderRadius: '6px',
            opacity: 0.7 + value * 0.3,
            boxShadow: `0 0 ${value * 20}px ${accentColor}40`,
          }} />
        ))}
      </div>
      
      {currentCaption && (
        <div style={{
          position: 'absolute',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '28px',
          fontWeight: '500',
          textAlign: 'center',
          maxWidth: '80%',
        }}>{currentCaption.text}</div>
      )}
      
      {showProgressBar && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '60px',
          right: '60px',
          height: '6px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '3px',
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: accentColor,
            borderRadius: '3px',
          }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
'''
        
        with open(f"{project_dir}/Video.tsx", "w") as f:
            f.write(video_tsx)
        
        # Create tsconfig.json
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "lib": ["DOM", "DOM.Iterable", "ES2020"],
                "allowJs": True,
                "skipLibCheck": True,
                "esModuleInterop": True,
                "allowSyntheticDefaultImports": True,
                "strict": True,
                "forceConsistentCasingInFileNames": True,
                "module": "ESNext",
                "moduleResolution": "node",
                "resolveJsonModule": True,
                "isolatedModules": True,
                "noEmit": True,
                "jsx": "react-jsx",
            },
            "include": ["."],
        }
        
        with open(f"{project_dir}/tsconfig.json", "w") as f:
            json.dump(tsconfig, f)
        
        # Render the video
        output_filename = f"video_{job_id}.mp4"
        output_path = f"{VIDEO_DIR}/{output_filename}"
        
        logger.info(f"Starting video render: {output_path}")
        video_render_jobs[job_id] = {"status": "rendering", "progress": 20}
        
        render_result = subprocess.run(
            [
                "npx", "remotion", "render",
                "Root.tsx",
                "PodcastVideo",
                output_path,
                "--log", "verbose",
                "--concurrency", "4",
            ],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=86400,  # Match function timeout
        )
        
        if render_result.returncode != 0:
            logger.error(f"Render failed: {render_result.stderr}")
            video_render_jobs[job_id] = {"status": "failed", "error": render_result.stderr}
            return {"success": False, "error": render_result.stderr}
        
        if not os.path.exists(output_path):
            logger.error("Output file not created")
            video_render_jobs[job_id] = {"status": "failed", "error": "Output file not created"}
            return {"success": False, "error": "Output file not created"}
        
        file_size = os.path.getsize(output_path)
        logger.info(f"Video rendered: {file_size} bytes")
        video_render_jobs[job_id] = {"status": "uploading", "progress": 80}
        
        # Upload to R2
        r2_key = f"videos/{output_filename}"
        logger.info(f"Uploading to R2: {r2_key}")
        
        s3 = get_r2_client()
        s3.upload_file(output_path, R2_BUCKET, r2_key)
        
        # Generate presigned URL
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": R2_BUCKET,
                "Key": r2_key,
                "ResponseContentDisposition": f"attachment; filename={output_filename}",
            },
            ExpiresIn=3600 * 24,  # 24 hours
        )
        
        logger.info(f"Upload complete. URL generated.")
        
        # Cleanup
        shutil.rmtree(project_dir, ignore_errors=True)
        
        # Update job status - merge with existing to preserve created_at
        existing = video_render_jobs.get(job_id, {})
        video_render_jobs[job_id] = {
            **existing,
            "status": "completed",
            "progress": 100,
            "download_url": presigned_url,
            "file_size": file_size,
            "completed_at": datetime.utcnow().isoformat(),
        }
        logger.info(f"[VIDEO RENDER] Job {job_id} marked as completed")
        
        return {
            "success": True,
            "job_id": job_id,
            "download_url": presigned_url,
            "file_size": file_size,
        }
        
    except Exception as e:
        logger.error(f"Render error: {e}", exc_info=True)
        existing = video_render_jobs.get(job_id, {})
        video_render_jobs[job_id] = {
            **existing,
            "status": "failed",
            "error": str(e),
            "failed_at": datetime.utcnow().isoformat(),
        }
        logger.info(f"[VIDEO RENDER] Job {job_id} marked as failed")
        return {"success": False, "error": str(e)}


@app.function(
    image=image,
    secrets=[r2_secret],
    timeout=300,
)
@modal.asgi_app()
def fastapi_app():
    """FastAPI web application"""
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import RedirectResponse
    import uuid
    
    web_app = FastAPI(title="Podcast Mastering API")
    
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    @web_app.get("/")
    async def root():
        return {"status": "healthy", "service": "Podcast Mastering API (Modal + R2)"}
    
    @web_app.get("/templates")
    async def list_templates():
        templates = [
            {"id": t["id"], "name": t["name"], "description": t["description"]}
            for t in REFERENCE_TEMPLATES.values()
        ]
        return {"templates": templates}
    
    @web_app.get("/settings")
    async def get_settings():
        return {
            "output_quality": {
                "options": [
                    {"id": "standard", "name": "Standard (16-bit)", "description": "Smaller file size, great for most podcasts"},
                    {"id": "high", "name": "High Quality (24-bit)", "description": "Larger files, best for professional production"},
                ],
                "default": "standard",
            },
            "limiter_mode": {
                "options": [
                    {"id": "gentle", "name": "Gentle", "description": "More dynamic range, natural sound"},
                    {"id": "normal", "name": "Normal", "description": "Balanced loudness and dynamics"},
                    {"id": "loud", "name": "Loud", "description": "Maximum loudness, less dynamic range"},
                ],
                "default": "normal",
            },
        }
    
    @web_app.post("/get-upload-url")
    async def get_upload_url(filename: str, content_type: str = "audio/wav"):
        from datetime import datetime
        
        allowed_extensions = {".wav", ".mp3", ".flac", ".aiff", ".ogg", ".m4a"}
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        file_id = str(uuid.uuid4())
        r2_key = f"uploads/{file_id}{ext}"
        
        s3 = get_r2_client()
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": R2_BUCKET,
                "Key": r2_key,
                "ContentType": content_type,
            },
            ExpiresIn=7200,
        )
        
        file_metadata[file_id] = {
            "r2_key": r2_key,
            "original_name": filename,
            "uploaded_at": datetime.utcnow().isoformat(),
            "content_type": content_type,
        }
        
        return {
            "file_id": file_id,
            "upload_url": presigned_url,
            "r2_key": r2_key,
        }
    
    @web_app.post("/confirm-upload")
    async def confirm_upload(file_id: str, size: int = 0):
        metadata = file_metadata.get(file_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        s3 = get_r2_client()
        try:
            response = s3.head_object(Bucket=R2_BUCKET, Key=metadata["r2_key"])
            actual_size = response.get("ContentLength", 0)
        except Exception:
            raise HTTPException(status_code=404, detail="File not found in storage")
        
        metadata["size"] = actual_size
        metadata["confirmed"] = True
        file_metadata[file_id] = metadata
        
        return {
            "file_id": file_id,
            "size": actual_size,
            "status": "confirmed",
        }
    
    @web_app.post("/master")
    async def start_mastering(
        target_file_id: str, 
        template_id: str = None, 
        reference_file_id: str = None,
        output_quality: str = "standard",
        limiter_mode: str = "normal",
    ):
        if not template_id and not reference_file_id:
            raise HTTPException(
                status_code=400, 
                detail="Either template_id or reference_file_id must be provided"
            )
        
        if output_quality not in ["standard", "high"]:
            output_quality = "standard"
        if limiter_mode not in ["gentle", "normal", "loud"]:
            limiter_mode = "normal"
        
        target_meta = file_metadata.get(target_file_id)
        if not target_meta:
            raise HTTPException(status_code=404, detail="Target file not found")
        
        target_r2_key = target_meta.get("r2_key")
        if not target_r2_key:
            raise HTTPException(status_code=400, detail="Target file not properly uploaded")
        
        if template_id:
            if template_id not in REFERENCE_TEMPLATES:
                raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
            reference_source = template_id
            is_template = True
        else:
            reference_meta = file_metadata.get(reference_file_id)
            if not reference_meta:
                raise HTTPException(status_code=404, detail="Reference file not found")
            reference_source = reference_meta.get("r2_key")
            if not reference_source:
                raise HTTPException(status_code=400, detail="Reference file not properly uploaded")
            is_template = False
        
        job_id = str(uuid.uuid4())
        
        target_meta["job_id"] = job_id
        file_metadata[target_file_id] = target_meta
        
        job_statuses[job_id] = {
            "status": "pending",
            "progress": 0,
            "message": "Queued for processing...",
            "output_file": None,
        }
        
        process_audio.spawn(
            job_id, 
            target_r2_key, 
            reference_source, 
            is_template,
            output_quality,
            limiter_mode,
        )
        
        return {"job_id": job_id, "message": "Mastering job started"}
    
    @web_app.get("/status/{job_id}")
    async def get_status(job_id: str):
        status = job_statuses.get(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job_id,
            **status,
        }
    
    @web_app.get("/download/{job_id}")
    async def download_result(job_id: str):
        status = job_statuses.get(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if status["status"] != "completed":
            raise HTTPException(status_code=400, detail="Job not completed yet")
        
        output_r2_key = status.get("output_file")
        if not output_r2_key:
            raise HTTPException(status_code=404, detail="Output file not found")
        
        s3 = get_r2_client()
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": R2_BUCKET,
                "Key": output_r2_key,
                "ResponseContentDisposition": "attachment; filename=mastered_podcast.wav",
            },
            ExpiresIn=3600,
        )
        
        return RedirectResponse(url=presigned_url, status_code=302)
    
    @web_app.post("/transcribe")
    async def start_transcription(
        audio_r2_key: str = None,
        audio_url: str = None,
    ):
        from datetime import datetime
        import logging
        from typing import Optional
        
        logging.info(f"[TRANSCRIBE] Request received - r2_key: {audio_r2_key is not None}, url: {audio_url is not None}")
        
        if not audio_r2_key and not audio_url:
            raise HTTPException(status_code=400, detail="Either audio_r2_key or audio_url must be provided")
        
        job_id = str(uuid.uuid4())
        
        transcription_jobs[job_id] = {
            "status": "processing",
            "progress": 10,
            "segments": None,
            "text": None,
            "started_at": datetime.utcnow().isoformat(),
        }
        
        # Use URL if provided, otherwise use R2 key
        if audio_url:
            logging.info(f"[TRANSCRIBE] Starting transcription from URL for job {job_id}")
            transcribe_audio.spawn(audio_url, job_id, is_url=True)
        else:
            logging.info(f"[TRANSCRIBE] Starting transcription from R2 key for job {job_id}")
            transcribe_audio.spawn(audio_r2_key, job_id, is_url=False)
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Transcription started",
        }
    
    @web_app.get("/transcribe/{job_id}")
    async def get_transcription_status(job_id: str):
        status = transcription_jobs.get(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Transcription job not found")
        
        return {
            "job_id": job_id,
            **status,
        }
    
    # Video rendering endpoints - uses module-level video_render_jobs Dict
    
    @web_app.post("/video/render")
    async def render_video(request: dict):
        """Start video rendering job"""
        import uuid
        import logging
        
        try:
            job_id = str(uuid.uuid4())
            title = request.get("title", "Video")
            
            logging.info(f"[VIDEO RENDER] Starting job {job_id} for: {title}")
            
            # Store job status
            video_render_jobs[job_id] = {
                "status": "processing",
                "progress": 0,
                "created_at": datetime.utcnow().isoformat(),
            }
            
            # Spawn the render job asynchronously
            try:
                render_video_job.spawn(
                    job_id=job_id,
                    audio_url=request.get("audio_url"),
                    title=title,
                    subtitle=request.get("subtitle", ""),
                    captions=request.get("captions", []),
                    gradient_from=request.get("gradient_from", "#1a1a2e"),
                    gradient_to=request.get("gradient_to", "#16213e"),
                    accent_color=request.get("accent_color", "#f97316"),
                    show_progress_bar=request.get("show_progress_bar", True),
                    aspect_ratio=request.get("aspect_ratio", "16:9"),
                    duration_seconds=request.get("duration_seconds", 60),
                    fps=request.get("fps", 30),
                )
                logging.info(f"[VIDEO RENDER] Spawned render job {job_id}")
                
            except Exception as spawn_error:
                logging.error(f"[VIDEO RENDER] Failed to spawn job: {spawn_error}")
                video_render_jobs[job_id] = {
                    **video_render_jobs.get(job_id, {}),
                    "status": "failed",
                    "error": f"Failed to spawn: {spawn_error}",
                }
            
            return {
                "job_id": job_id,
                "status": "processing",
                "message": "Video rendering started. Poll /video/status/{job_id} for progress.",
            }
            
        except Exception as e:
            logging.error(f"[VIDEO RENDER] Error starting job: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @web_app.get("/video/status/{job_id}")
    async def get_video_status(job_id: str):
        """Get video render status"""
        status = video_render_jobs.get(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job_id,
            **status,
        }
    
    return web_app
