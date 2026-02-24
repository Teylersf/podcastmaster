"""
Remotion Server-Side Rendering for Video Generation
Full pipeline: Render -> Upload to R2 -> Return URL
"""

import modal
import os
import json

app = modal.App("podcast-video-renderer")

# Volume for storing rendered videos
render_volume = modal.Volume.from_name("video-renders", create_if_missing=True)
RENDER_DIR = "/renders"

# Image with Node.js, Chromium, and all dependencies for Remotion
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "ffmpeg",
        "nodejs",
        "npm",
        "chromium",
        "fonts-liberation",
        "libappindicator3-1",
        "libasound2",
        "libatk-bridge2.0-0",
        "libatk1.0-0",
        "libc6",
        "libcairo2",
        "libcups2",
        "libdbus-1-3",
        "libexpat1",
        "libfontconfig1",
        "libgbm1",
        "libgcc1",
        "libglib2.0-0",
        "libgtk-3-0",
        "libnspr4",
        "libnss3",
        "libpango-1.0-0",
        "libpangocairo-1.0-0",
        "libstdc++6",
        "libx11-6",
        "libx11-xcb1",
        "libxcb1",
        "libxcomposite1",
        "libxcursor1",
        "libxdamage1",
        "libxext6",
        "libxfixes3",
        "libxi6",
        "libxrandr2",
        "libxrender1",
        "libxss1",
        "libxtst6",
        "lsb-release",
        "wget",
        "xdg-utils",
    )
    .run_commands(
        "npm install -g remotion @remotion/renderer @remotion/bundler",
    )
)

# R2 secrets
r2_secret = modal.Secret.from_name("r2-credentials")


def get_r2_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT_URL"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    )


@app.function(
    image=image,
    secrets=[r2_secret],
    timeout=1800,  # 30 minutes
    cpu=4,
    memory=8192,
    volumes={RENDER_DIR: render_volume},
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
) -> dict:
    """
    Render a video using Remotion and upload to R2
    """
    import subprocess
    import tempfile
    import shutil
    import logging
    import urllib.request
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    R2_BUCKET = "podcast-mastering"
    
    try:
        # Create temp directory for project
        project_dir = tempfile.mkdtemp(prefix="remotion_")
        logger.info(f"Created project dir: {project_dir}")
        
        # Download audio file
        audio_path = os.path.join(project_dir, "audio.mp3")
        logger.info(f"Downloading audio from {audio_url[:50]}...")
        try:
            urllib.request.urlretrieve(audio_url, audio_path)
            logger.info(f"Audio downloaded: {os.path.getsize(audio_path)} bytes")
        except Exception as e:
            logger.error(f"Failed to download audio: {e}")
            return {"success": False, "error": f"Audio download failed: {e}"}
        
        # Create package.json
        package_json = {
            "name": "remotion-render",
            "version": "1.0.0",
            "dependencies": {
                "remotion": "^4.0.0",
                "@remotion/renderer": "^4.0.0",
                "@remotion/bundler": "^4.0.0",
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
            return {"success": False, "error": "npm install failed"}
        
        # Set dimensions based on aspect ratio
        if aspect_ratio == "16:9":
            width, height = 1920, 1080
        else:  # 9:16
            width, height = 1080, 1920
        
        fps = 30
        duration_in_frames = duration_seconds * fps
        
        # Create Remotion root file
        root_tsx = f'''
import {{ Composition }} from 'remotion';
import {{ PodcastVideo }} from './Video';

export const RemotionRoot: React.FC = () => {{
  return (
    <Composition
      id="PodcastVideo"
      component={{PodcastVideo}}
      durationInFrames={duration_in_frames}
      fps={{fps}}
      width={{width}}
      height={{height}}
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
'''
        
        with open(f"{project_dir}/Root.tsx", "w") as f:
            f.write(root_tsx)
        
        # Create simplified Video component
        video_tsx = '''
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

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
  
  // Calculate progress
  const progress = frame / durationInFrames;
  
  // Get current caption
  const currentCaption = useMemo(() => {
    if (!captions || captions.length === 0) return null;
    return captions.find(c => currentTime >= c.start && currentTime <= c.end);
  }, [captions, currentTime]);
  
  // Generate waveform bars
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
      <Audio src={audioSrc} />
      
      {/* Title */}
      <h1 style={{
        fontSize: width > height ? '64px' : '48px',
        fontWeight: 'bold',
        marginBottom: '16px',
        textAlign: 'center',
        padding: '0 60px',
        textShadow: '0 2px 20px rgba(0,0,0,0.5)',
      }}>
        {title}
      </h1>
      
      {/* Subtitle */}
      {subtitle && (
        <p style={{
          fontSize: width > height ? '32px' : '24px',
          opacity: 0.8,
          marginBottom: '60px',
        }}>
          {subtitle}
        </p>
      )}
      
      {/* Waveform */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: '200px',
        marginBottom: '40px',
      }}>
        {waveformData.map((value, i) => (
          <div
            key={i}
            style={{
              width: '12px',
              height: `${value * 200}px`,
              backgroundColor: accentColor,
              borderRadius: '6px',
              opacity: 0.7 + value * 0.3,
              boxShadow: `0 0 ${value * 20}px ${accentColor}40`,
            }}
          />
        ))}
      </div>
      
      {/* Caption */}
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
        }}>
          {currentCaption.text}
        </div>
      )}
      
      {/* Progress bar */}
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
            transition: 'width 0.1s linear',
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
        output_path = f"{RENDER_DIR}/{output_filename}"
        
        logger.info(f"Starting video render: {output_path}")
        logger.info(f"Duration: {duration_seconds}s, Frames: {duration_in_frames}, FPS: {fps}")
        
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
            timeout=1800,
        )
        
        logger.info(f"Render stdout: {render_result.stdout[-2000:] if len(render_result.stdout) > 2000 else render_result.stdout}")
        logger.info(f"Render stderr: {render_result.stderr[-2000:] if len(render_result.stderr) > 2000 else render_result.stderr}")
        
        if render_result.returncode != 0:
            logger.error(f"Render failed with code {render_result.returncode}")
            return {"success": False, "error": f"Render failed: {render_result.stderr}"}
        
        # Check if file was created
        if not os.path.exists(output_path):
            logger.error("Output file not created")
            return {"success": False, "error": "Output file not created"}
        
        file_size = os.path.getsize(output_path)
        logger.info(f"Video rendered: {file_size} bytes")
        
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
        
        return {
            "success": True,
            "job_id": job_id,
            "download_url": presigned_url,
            "file_size": file_size,
            "duration": duration_seconds,
        }
        
    except Exception as e:
        logger.error(f"Render error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


# Job status tracking
video_jobs = {}


@app.function(
    image=image,
    secrets=[r2_secret],
    timeout=1800,
    cpu=4,
    memory=8192,
)
def start_render_job(
    audio_url: str,
    title: str,
    subtitle: str = "",
    captions: list = None,
    gradient_from: str = "#1a1a2e",
    gradient_to: str = "#16213e",
    accent_color: str = "#f97316",
    show_progress_bar: bool = True,
    aspect_ratio: str = "16:9",
    duration_seconds: int = 60,
) -> dict:
    """Start a render job and return job ID"""
    import uuid
    from datetime import datetime
    
    job_id = str(uuid.uuid4())
    
    video_jobs[job_id] = {
        "status": "processing",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    # Spawn the render job
    render_video_job.spawn(
        job_id=job_id,
        audio_url=audio_url,
        title=title,
        subtitle=subtitle,
        captions=captions or [],
        gradient_from=gradient_from,
        gradient_to=gradient_to,
        accent_color=accent_color,
        show_progress_bar=show_progress_bar,
        aspect_ratio=aspect_ratio,
        duration_seconds=duration_seconds,
    )
    
    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Video rendering started",
    }


@app.function()
def get_job_status(job_id: str) -> dict:
    """Get the status of a render job"""
    return video_jobs.get(job_id, {"status": "not_found"})
