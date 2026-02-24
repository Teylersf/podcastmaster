"""
Podcast Mastering Backend API
Uses Matchering library for audio mastering
https://github.com/sergree/matchering
"""

import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import matchering as mg

# Configuration
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Custom Matchering config for long podcasts (up to 4 hours at 44.1kHz)
# Default max_length is ~15 minutes, we extend to ~4 hours
# 4 hours * 60 min * 60 sec * 44100 samples/sec = 635,040,000 samples
PODCAST_CONFIG = mg.Config(
    max_length=635_040_000,  # ~4 hours at 44.1kHz
)

# Store processing status
processing_jobs: dict[str, dict] = {}


class ProcessingStatus(BaseModel):
    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress: int  # 0-100
    message: Optional[str] = None
    output_file: Optional[str] = None


class MasteringRequest(BaseModel):
    target_file: str
    reference_file: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup: create directories
    UPLOAD_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)
    yield
    # Shutdown: cleanup could go here


app = FastAPI(
    title="Podcast Mastering API",
    description="Audio mastering API powered by Matchering",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def process_audio_sync(job_id: str, target_path: str, reference_path: str, output_path: str):
    """
    Synchronous audio processing function using Matchering
    This runs in a thread pool executor
    """
    try:
        processing_jobs[job_id]["status"] = "processing"
        processing_jobs[job_id]["progress"] = 10
        processing_jobs[job_id]["message"] = "Loading audio files..."

        # Custom log handler to update progress
        def log_handler(message: str):
            # Parse matchering log messages to estimate progress
            processing_jobs[job_id]["message"] = message
            
            if "Loading" in message:
                processing_jobs[job_id]["progress"] = 20
            elif "Analyzing" in message:
                processing_jobs[job_id]["progress"] = 40
            elif "Matching" in message:
                processing_jobs[job_id]["progress"] = 60
            elif "Limiting" in message:
                processing_jobs[job_id]["progress"] = 80
            elif "Saving" in message:
                processing_jobs[job_id]["progress"] = 90

        # Set up matchering logging
        mg.log(log_handler)

        # Process the audio using Matchering with custom config for long podcasts
        # Reference: https://github.com/sergree/matchering
        mg.process(
            target=target_path,
            reference=reference_path,
            config=PODCAST_CONFIG,  # Use custom config for longer audio
            results=[
                mg.pcm16(output_path),  # 16-bit WAV output
            ],
        )

        processing_jobs[job_id]["status"] = "completed"
        processing_jobs[job_id]["progress"] = 100
        processing_jobs[job_id]["message"] = "Mastering complete!"
        processing_jobs[job_id]["output_file"] = os.path.basename(output_path)

    except Exception as e:
        processing_jobs[job_id]["status"] = "failed"
        processing_jobs[job_id]["message"] = f"Error: {str(e)}"
        raise


async def process_audio(job_id: str, target_path: str, reference_path: str, output_path: str):
    """
    Async wrapper for audio processing
    Runs the CPU-intensive Matchering process in a thread pool
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, 
        process_audio_sync, 
        job_id, 
        target_path, 
        reference_path, 
        output_path
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Podcast Mastering API"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an audio file (target or reference)
    Returns the file ID for later use
    """
    # Validate file type
    allowed_extensions = {".wav", ".mp3", ".flac", ".aiff", ".ogg", ".m4a"}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename

    # Save the file
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    return {
        "file_id": file_id,
        "filename": filename,
        "original_name": file.filename,
        "size": len(content),
    }


@app.post("/master")
async def start_mastering(
    background_tasks: BackgroundTasks,
    target_file_id: str,
    reference_file_id: str,
):
    """
    Start the audio mastering process
    Returns a job ID to track progress
    """
    # Find the uploaded files
    target_file = None
    reference_file = None
    
    for f in UPLOAD_DIR.iterdir():
        if f.stem == target_file_id:
            target_file = f
        if f.stem == reference_file_id:
            reference_file = f

    if not target_file or not target_file.exists():
        raise HTTPException(status_code=404, detail="Target file not found")
    
    if not reference_file or not reference_file.exists():
        raise HTTPException(status_code=404, detail="Reference file not found")

    # Create job
    job_id = str(uuid.uuid4())
    output_filename = f"{job_id}_mastered.wav"
    output_path = OUTPUT_DIR / output_filename

    processing_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "message": "Queued for processing...",
        "output_file": None,
    }

    # Start processing in background
    background_tasks.add_task(
        process_audio,
        job_id,
        str(target_file),
        str(reference_file),
        str(output_path),
    )

    return {"job_id": job_id, "message": "Mastering job started"}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    """Get the status of a mastering job"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return ProcessingStatus(**processing_jobs[job_id])


@app.get("/download/{job_id}")
async def download_result(job_id: str):
    """Download the mastered audio file"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = processing_jobs[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    output_file = OUTPUT_DIR / job["output_file"]
    
    if not output_file.exists():
        raise HTTPException(status_code=404, detail="Output file not found")
    
    return FileResponse(
        path=output_file,
        filename=f"mastered_{job['output_file']}",
        media_type="audio/wav",
    )


@app.delete("/cleanup/{job_id}")
async def cleanup_job(job_id: str):
    """Clean up files associated with a job"""
    if job_id in processing_jobs:
        job = processing_jobs[job_id]
        
        # Remove output file if exists
        if job.get("output_file"):
            output_file = OUTPUT_DIR / job["output_file"]
            if output_file.exists():
                output_file.unlink()
        
        # Remove job from memory
        del processing_jobs[job_id]
    
    # Clean up any files with this job_id prefix in uploads
    for f in UPLOAD_DIR.iterdir():
        if f.stem == job_id or f.stem.startswith(job_id):
            f.unlink()
    
    return {"message": "Cleanup completed"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

