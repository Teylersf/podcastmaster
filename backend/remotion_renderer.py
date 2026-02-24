"""
Remotion Server-Side Rendering on Modal
Renders videos using @remotion/renderer
"""

import modal
import os

# Define the Modal app
app = modal.App("podcast-mastering-renderer")

# Volume for storing rendered videos
render_volume = modal.Volume.from_name("remotion-renders", create_if_missing=True)
RENDER_DIR = "/renders"

# Node.js image with Remotion dependencies
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
        "npm install -g remotion @remotion/renderer @remotion/bundler @remotion/cli",
    )
)


@app.function(
    image=image,
    timeout=1800,  # 30 minutes for long videos
    cpu=4,
    memory=8192,
    volumes={RENDER_DIR: render_volume},
)
def render_video(
    composition_id: str,
    props: dict,
    output_filename: str,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
    duration_in_frames: int = 300,
) -> dict:
    """
    Render a video using Remotion SSR
    """
    import subprocess
    import json
    import logging
    
    logging.basicConfig(level=logging.INFO)
    
    # Create a temporary directory for the project
    project_dir = "/tmp/remotion-project"
    os.makedirs(project_dir, exist_ok=True)
    
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
    logging.info("Installing dependencies...")
    subprocess.run(["npm", "install"], cwd=project_dir, check=True)
    
    # Create the composition file
    composition_code = f'''
import {{ Composition }} from 'remotion';
import {{ PodcastVideo }} from './PodcastVideo';

export const RemotionRoot = () => {{
  return (
    <Composition
      id="{composition_id}"
      component={{PodcastVideo}}
      durationInFrames={{duration_in_frames}}
      fps={{fps}}
      width={{width}}
      height={{height}}
      defaultProps={{{json.dumps(props)}}}
    />
  );
}};
'''
    
    with open(f"{project_dir}/Root.tsx", "w") as f:
        f.write(composition_code)
    
    # Create the PodcastVideo component (simplified version)
    podcast_video_code = '''
import React from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const PodcastVideo: React.FC<any> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Calculate progress
  const progress = frame / durationInFrames;
  
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${props.gradientFrom || '#1a1a2e'}, ${props.gradientTo || '#16213e'})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      color: 'white',
    }}>
      <Audio src={props.audioUrl} />
      
      {/* Title */}
      <h1 style={{
        fontSize: '48px',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'center',
        padding: '0 40px',
      }}>
        {props.title}
      </h1>
      
      {/* Subtitle */}
      {props.subtitle && (
        <p style={{
          fontSize: '24px',
          opacity: 0.8,
        }}>
          {props.subtitle}
        </p>
      )}
      
      {/* Progress bar */}
      {props.showProgressBar && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          right: '40px',
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: props.accentColor || '#f97316',
            borderRadius: '2px',
          }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
'''
    
    with open(f"{project_dir}/PodcastVideo.tsx", "w") as f:
        f.write(podcast_video_code)
    
    # Create index file
    with open(f"{project_dir}/index.tsx", "w") as f:
        f.write("export { PodcastVideo } from './PodcastVideo';\n")
    
    # Render the video
    output_path = f"{RENDER_DIR}/{output_filename}"
    
    logging.info(f"Rendering video to {output_path}...")
    
    try:
        result = subprocess.run(
            [
                "npx", "remotion", "render",
                "Root.tsx",
                composition_id,
                output_path,
                "--props", json.dumps(props),
                "--log", "verbose",
            ],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=1800,
        )
        
        logging.info(f"Render stdout: {result.stdout}")
        logging.info(f"Render stderr: {result.stderr}")
        
        if result.returncode != 0:
            raise Exception(f"Render failed: {result.stderr}")
        
        # Check if file was created
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            logging.info(f"Video rendered successfully: {output_path} ({file_size} bytes)")
            return {
                "success": True,
                "output_path": output_path,
                "file_size": file_size,
            }
        else:
            raise Exception("Output file not created")
            
    except Exception as e:
        logging.error(f"Render error: {e}")
        return {
            "success": False,
            "error": str(e),
        }


@app.local_entrypoint()
def main():
    """Test the renderer"""
    result = render_video.remote(
        composition_id="PodcastVideo",
        props={
            "audioUrl": "https://example.com/audio.mp3",
            "title": "Test Video",
            "subtitle": "Powered by Free Podcast Mastering",
            "gradientFrom": "#1a1a2e",
            "gradientTo": "#16213e",
            "accentColor": "#f97316",
            "showProgressBar": True,
        },
        output_filename="test-video.mp4",
        width=1920,
        height=1080,
        fps=30,
        duration_in_frames=300,
    )
    print(result)
