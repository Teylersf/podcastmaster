"""
Audio Transcription Module for Modal.com
Uses OpenAI Whisper for accurate transcription
"""

import modal
from pathlib import Path
import tempfile
import os

# Create transcription-specific image with whisper
transcription_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "openai-whisper>=20231117",
        "fastapi>=0.109.0",
        "boto3>=1.34.0",
    )
)

app = modal.App("podcast-transcription")

# Use same secrets and config as main app
r2_secret = modal.Secret.from_name("r2-credentials")
R2_BUCKET = "podcastmaster"
R2_ACCOUNT_ID = "f9b23e1cdab559b2f158c2142dad952b"
R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


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


@app.function(
    image=transcription_image,
    secrets=[r2_secret],
    timeout=600,  # 10 minute timeout for transcription
    cpu=2,
    memory=4096,
)
def transcribe_audio(audio_r2_key: str, job_id: str):
    """
    Transcribe audio file using OpenAI Whisper
    Downloads from R2, transcribes, returns segments with timestamps
    """
    import whisper
    import tempfile
    import os
    
    s3 = get_r2_client()
    
    # Create temp directory for processing
    with tempfile.TemporaryDirectory() as temp_dir:
        # Download audio from R2
        local_path = Path(temp_dir) / "audio.wav"
        s3.download_file(R2_BUCKET, audio_r2_key, str(local_path))
        
        # Load Whisper model (base is good balance of speed/accuracy)
        print(f"[{job_id}] Loading Whisper model...")
        model = whisper.load_model("base")
        
        # Transcribe
        print(f"[{job_id}] Transcribing audio...")
        result = model.transcribe(
            str(local_path),
            language="en",
            verbose=False,
        )
        
        # Format segments
        segments = []
        for segment in result["segments"]:
            segments.append({
                "id": segment["id"],
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
            })
        
        print(f"[{job_id}] Transcription complete: {len(segments)} segments")
        
        return {
            "success": True,
            "job_id": job_id,
            "text": result["text"],
            "segments": segments,
            "language": result.get("language", "en"),
        }


@app.function(
    image=transcription_image,
    secrets=[r2_secret],
    timeout=60,
)
@modal.asgi_app()
def fastapi_app():
    """FastAPI app for transcription endpoints"""
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    import uuid
    
    web_app = FastAPI(title="Podcast Transcription API")
    
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @web_app.get("/")
    async def root():
        return {"status": "healthy", "service": "Transcription API"}
    
    @web_app.post("/transcribe")
    async def start_transcription(audio_r2_key: str):
        """
        Start transcription job
        Returns job ID to poll for results
        """
        job_id = str(uuid.uuid4())
        
        # Spawn transcription
        transcribe_audio.spawn(audio_r2_key, job_id)
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Transcription started",
        }
    
    return web_app
