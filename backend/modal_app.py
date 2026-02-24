"""
Podcast Mastering - Modal.com Serverless Backend
AI-powered audio mastering for podcasts

Uses Cloudflare R2 for file storage (presigned URL pattern)
Deploy: modal deploy modal_app.py
Test locally: modal serve modal_app.py
"""

import modal
from datetime import datetime, timedelta
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
        "boto3>=1.34.0",  # For S3-compatible R2 access
        "soundfile>=0.12.0",  # For detecting source sample rate
        "requests>=2.31.0",  # For webhook notifications
        "vercel-blob>=0.1.0",  # For direct Vercel Blob uploads
        "openai-whisper>=20231117",  # For transcription
    )
    .add_local_dir("references", "/references")  # Bake reference templates into image
)

# Reference templates stored permanently in the container image
# These are available instantly without downloading from R2
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

# Create a volume for temporary processing (downloaded from R2)
volume = modal.Volume.from_name("podcast-mastering-files", create_if_missing=True)
VOLUME_PATH = "/data"

# Store job statuses and file metadata
job_statuses = modal.Dict.from_name("podcast-mastering-jobs", create_if_missing=True)
file_metadata = modal.Dict.from_name("podcast-mastering-file-metadata", create_if_missing=True)

# R2 Configuration - stored as Modal secrets
r2_secret = modal.Secret.from_name("r2-credentials")

# Webhook configuration for email notifications
webhook_secret = modal.Secret.from_name("webhook-credentials")

# R2 bucket details
R2_BUCKET = "podcastmaster"
R2_ACCOUNT_ID = "f9b23e1cdab559b2f158c2142dad952b"
R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Frontend webhook URL for job completion notifications
WEBHOOK_URL = "https://freepodcastmastering.com/api/webhooks/job-complete"
BLOB_UPLOAD_URL = "https://freepodcastmastering.com/api/files/get-blob-upload-url"

# File retention period (24 hours)
FILE_RETENTION_HOURS = 24


def upload_to_vercel_blob(job_id: str, output_path: str, file_size: int):
    """
    Upload the mastered file directly to Vercel Blob for premium users.
    Returns the blob URL if successful, None otherwise.
    """
    import requests
    
    webhook_token = os.environ.get("WEBHOOK_SECRET")
    if not webhook_token:
        print(f"[BLOB] Warning: WEBHOOK_SECRET not configured, skipping blob upload for job {job_id}")
        return None
    
    try:
        # Step 1: Get blob upload credentials from frontend
        print(f"[BLOB] Requesting upload credentials for job {job_id}")
        cred_response = requests.post(
            BLOB_UPLOAD_URL,
            json={
                "jobId": job_id,
                "fileName": os.path.basename(output_path),
                "fileSize": file_size,
            },
            headers={
                "Authorization": f"Bearer {webhook_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        
        if not cred_response.ok:
            print(f"[BLOB] Failed to get credentials: {cred_response.status_code} - {cred_response.text}")
            return None
        
        cred_data = cred_response.json()
        
        if not cred_data.get("shouldUpload"):
            print(f"[BLOB] Skipping upload: {cred_data.get('reason', 'unknown reason')}")
            return None
        
        blob_token = cred_data["blobToken"]
        blob_pathname = cred_data["blobPathname"]
        subscription_id = cred_data.get("subscriptionId")
        output_file_name = cred_data.get("outputFileName")
        
        # Step 2: Upload directly to Vercel Blob using their API
        print(f"[BLOB] Uploading {file_size} bytes to {blob_pathname}")
        
        with open(output_path, "rb") as f:
            # Use Vercel Blob's direct upload API
            upload_response = requests.put(
                f"https://blob.vercel-storage.com/{blob_pathname}",
                data=f,
                headers={
                    "Authorization": f"Bearer {blob_token}",
                    "Content-Type": "audio/wav",
                    "x-api-version": "7",
                    "x-content-type": "audio/wav",
                },
                timeout=600,  # 10 minute timeout for large files
            )
        
        if not upload_response.ok:
            print(f"[BLOB] Upload failed: {upload_response.status_code} - {upload_response.text}")
            return None
        
        blob_result = upload_response.json()
        blob_url = blob_result.get("url")
        
        print(f"[BLOB] Successfully uploaded to: {blob_url}")
        
        return {
            "blobUrl": blob_url,
            "blobPathname": blob_pathname,
            "subscriptionId": subscription_id,
            "outputFileName": output_file_name,
            "fileSize": file_size,
        }
        
    except Exception as e:
        print(f"[BLOB] Error uploading: {e}")
        return None


def notify_job_complete(job_id: str, status: str, output_file: str = None, blob_data: dict = None):
    """
    Notify the frontend webhook that a job has completed.
    This triggers email notification to the user and database updates.
    
    Args:
        job_id: The job identifier
        status: Job status (completed/failed)
        output_file: R2 output key (for download URL fallback)
        blob_data: If premium user, contains blobUrl, subscriptionId, etc.
    """
    import requests
    
    webhook_token = os.environ.get("WEBHOOK_SECRET")
    if not webhook_token:
        print(f"Warning: WEBHOOK_SECRET not configured, skipping notification for job {job_id}")
        return
    
    try:
        payload = {
            "jobId": job_id,
            "status": status,
            "outputFile": output_file,
        }
        
        # Include blob data if we uploaded directly to Vercel Blob
        if blob_data:
            payload["blobData"] = blob_data
        
        response = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {webhook_token}",
                "Content-Type": "application/json",
            },
            timeout=30,  # Increased timeout since webhook now does less work
        )
        
        if response.ok:
            result = response.json()
            print(f"Webhook notification sent for job {job_id}: {result}")
        else:
            print(f"Webhook notification failed for job {job_id}: {response.status_code} - {response.text}")
            
    except Exception as e:
        # Don't fail the job if webhook fails - just log it
        print(f"Webhook notification error for job {job_id}: {e}")


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


@app.function(image=image, secrets=[r2_secret], schedule=modal.Cron("0 0 * * *"))
def cleanup_old_files():
    """
    Scheduled function that runs every hour to clean up files older than 24 hours.
    Deletes files from R2 storage.
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=FILE_RETENTION_HOURS)
    
    deleted_count = 0
    checked_count = 0
    
    s3 = get_r2_client()
    
    # Check all tracked files
    files_to_delete = []
    for file_id, metadata in file_metadata.items():
        checked_count += 1
        upload_time = datetime.fromisoformat(metadata.get("uploaded_at", "2000-01-01"))
        
        if upload_time < cutoff:
            files_to_delete.append((file_id, metadata))
    
    # Delete expired files from R2
    for file_id, metadata in files_to_delete:
        try:
            # Delete uploaded files from R2
            r2_key = metadata.get("r2_key")
            if r2_key:
                try:
                    s3.delete_object(Bucket=R2_BUCKET, Key=r2_key)
                    deleted_count += 1
                except Exception as e:
                    print(f"Error deleting {r2_key} from R2: {e}")
            
            # Delete output file from R2 if exists
            output_key = metadata.get("output_r2_key")
            if output_key:
                try:
                    s3.delete_object(Bucket=R2_BUCKET, Key=output_key)
                    deleted_count += 1
                except Exception as e:
                    print(f"Error deleting {output_key} from R2: {e}")
            
            # Remove from metadata tracking
            del file_metadata[file_id]
            
            # Clean up job status if exists
            job_id = metadata.get("job_id")
            if job_id and job_id in job_statuses:
                del job_statuses[job_id]
                
        except Exception as e:
            print(f"Error cleaning up file {file_id}: {e}")
    
    print(f"Cleanup complete: checked {checked_count} files, deleted {deleted_count} expired files")
    return {"checked": checked_count, "deleted": deleted_count}


@app.function(
    image=image,
    volumes={VOLUME_PATH: volume},
    secrets=[r2_secret, webhook_secret],
    timeout=36000,  # 10 hour timeout for very long podcasts
    cpu=4,  # Use 4 CPUs for faster processing
    memory=8192,  # 8GB RAM for large audio files
)
def process_audio(
    job_id: str, 
    target_r2_key: str, 
    reference_source: str, 
    is_template: bool = False,
    output_quality: str = "standard",  # "standard" (16-bit) or "high" (24-bit)
    limiter_mode: str = "normal",  # "gentle", "normal", or "loud"
):
    """
    Process audio using Matchering library
    Downloads target from R2, uses template or R2 reference, uploads result back to R2
    
    Args:
        job_id: Unique job identifier
        target_r2_key: R2 key for the uploaded target audio
        reference_source: Either a template ID (if is_template=True) or R2 key (if is_template=False)
        is_template: If True, reference_source is a template ID; if False, it's an R2 key
        output_quality: "standard" for 16-bit, "high" for 24-bit output
        limiter_mode: "gentle" (less limiting), "normal", or "loud" (more limiting)
    """
    import matchering as mg
    import soundfile as sf
    import os
    
    s3 = get_r2_client()
    
    # Local paths for processing
    os.makedirs(f"{VOLUME_PATH}/processing", exist_ok=True)
    target_path = f"{VOLUME_PATH}/processing/{job_id}_target.wav"
    reference_path = f"{VOLUME_PATH}/processing/{job_id}_reference.wav"
    output_path = f"{VOLUME_PATH}/processing/{job_id}_mastered.wav"
    output_r2_key = f"outputs/{job_id}_mastered.wav"
    
    # Track which files to clean up (don't delete template files!)
    files_to_cleanup = [target_path, output_path]
    
    try:
        # Update status - downloading
        job_statuses[job_id] = {
            "status": "processing",
            "progress": 5,
            "message": "Downloading your audio...",
            "output_file": None,
        }
        
        # Download target file from R2
        s3.download_file(R2_BUCKET, target_r2_key, target_path)
        job_statuses[job_id] = {**job_statuses[job_id], "progress": 10, "message": "Loading reference template..."}
        
        # Get reference file - either from built-in template or R2
        if is_template:
            template = REFERENCE_TEMPLATES.get(reference_source)
            if not template:
                raise ValueError(f"Unknown template: {reference_source}")
            # Use the template file baked into the container image (don't delete it!)
            reference_path = template["file_path"]
            print(f"Using built-in template: {template['name']}")
        else:
            # Download reference from R2 (this one we can delete)
            s3.download_file(R2_BUCKET, reference_source, reference_path)
            files_to_cleanup.append(reference_path)
        
        job_statuses[job_id] = {**job_statuses[job_id], "progress": 15, "message": "Analyzing source audio..."}
        
        # Detect original sample rate from target file to preserve quality
        target_info = sf.info(target_path)
        original_sample_rate = target_info.samplerate
        print(f"Detected source sample rate: {original_sample_rate} Hz - will preserve this in output")
        
        job_statuses[job_id] = {**job_statuses[job_id], "message": f"Loading audio at {original_sample_rate} Hz..."}
        
        # Limiter threshold based on mode
        # Lower threshold = more limiting = louder output
        # Higher threshold = less limiting = more dynamic range
        limiter_thresholds = {
            "gentle": 0.95,   # Less limiting, more dynamic
            "normal": 0.9,   # Balanced (default)
            "loud": 0.8,     # More limiting, louder output
        }
        threshold = limiter_thresholds.get(limiter_mode, 0.9)
        
        print(f"Settings: output_quality={output_quality}, limiter_mode={limiter_mode}, threshold={threshold}")
        
        # Custom config for long podcasts (up to 4 hours)
        podcast_config = mg.Config(
            max_length=635_040_000,
            threshold=threshold,
        )
        
        # Progress tracking via log handler
        def log_handler(message: str):
            print(f"Matchering: {message}")  # Log to Modal console for debugging
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
        
        print(f"Starting matchering process: target={target_path}, reference={reference_path}")
        
        # Select output format based on quality setting
        if output_quality == "high":
            result_format = mg.pcm24(output_path)  # 24-bit for high quality
            print("Output format: 24-bit PCM WAV")
        else:
            result_format = mg.pcm16(output_path)  # 16-bit for standard quality
            print("Output format: 16-bit PCM WAV")
        
        # Process with Matchering
        mg.process(
            target=target_path,
            reference=reference_path,
            config=podcast_config,
            results=[result_format],
        )
        
        print("Matchering process completed successfully")
        
        # Get file size for blob upload
        output_file_size = os.path.getsize(output_path)
        
        # Upload result to R2 (for download URL and fallback)
        job_statuses[job_id] = {**job_statuses[job_id], "progress": 85, "message": "Uploading mastered audio..."}
        s3.upload_file(output_path, R2_BUCKET, output_r2_key)
        
        # Try to upload directly to Vercel Blob for premium users
        # This happens AFTER R2 upload so we have a fallback
        job_statuses[job_id] = {**job_statuses[job_id], "progress": 92, "message": "Saving to cloud storage..."}
        blob_data = upload_to_vercel_blob(job_id, output_path, output_file_size)
        
        if blob_data:
            print(f"Premium user file saved to Vercel Blob: {blob_data.get('blobUrl')}")
        
        # Clean up local files (but not template files!)
        for path in files_to_cleanup:
            if os.path.exists(path):
                os.remove(path)
        
        # Update file metadata with output key
        for file_id, meta in file_metadata.items():
            if meta.get("job_id") == job_id:
                meta["output_r2_key"] = output_r2_key
                file_metadata[file_id] = meta
                break
        
        # Update final status
        job_statuses[job_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Mastering complete!",
            "output_file": output_r2_key,
        }
        
        # Notify frontend webhook to send email notification
        # Include blob_data so webhook can save to database without downloading
        notify_job_complete(job_id, "completed", output_r2_key, blob_data)
        
        return {"success": True, "output_file": output_r2_key, "blob_data": blob_data}
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_traceback = traceback.format_exc()
        print(f"ERROR in process_audio: {error_msg}")
        print(f"Traceback: {error_traceback}")
        
        # Clean up on error (but not template files!)
        for path in files_to_cleanup:
            if os.path.exists(path):
                os.remove(path)
                
        job_statuses[job_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"Error: {error_msg}",
            "output_file": None,
        }
        
        # Notify frontend webhook about failure
        notify_job_complete(job_id, "failed", None)
        
        return {"success": False, "error": error_msg, "traceback": error_traceback}


@app.function(
    image=image,
    secrets=[r2_secret],
    timeout=300,  # 5 min timeout for API calls (not processing)
)
@modal.asgi_app()
def fastapi_app():
    """FastAPI web application for the API endpoints"""
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import RedirectResponse
    import uuid
    
    web_app = FastAPI(title="Podcast Mastering API")
    
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, restrict to your frontend domain
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
        """List available reference templates"""
        templates = [
            {
                "id": t["id"],
                "name": t["name"],
                "description": t["description"],
            }
            for t in REFERENCE_TEMPLATES.values()
        ]
        return {"templates": templates}
    
    @web_app.get("/settings")
    async def get_settings():
        """Get available mastering settings options"""
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
        """
        Generate a presigned URL for direct upload to R2.
        Client uploads directly to R2, bypassing our server.
        """
        from datetime import datetime
        
        # Validate file extension
        allowed_extensions = {".wav", ".mp3", ".flac", ".aiff", ".ogg", ".m4a"}
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Generate unique file ID and R2 key
        file_id = str(uuid.uuid4())
        r2_key = f"uploads/{file_id}{ext}"
        
        # Generate presigned PUT URL (valid for 2 hours)
        s3 = get_r2_client()
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": R2_BUCKET,
                "Key": r2_key,
                "ContentType": content_type,
            },
            ExpiresIn=7200,  # 2 hours
        )
        
        # Track file metadata
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
        """
        Confirm that a file was successfully uploaded to R2.
        Called by frontend after direct R2 upload completes.
        """
        metadata = file_metadata.get(file_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify file exists in R2
        s3 = get_r2_client()
        try:
            response = s3.head_object(Bucket=R2_BUCKET, Key=metadata["r2_key"])
            actual_size = response.get("ContentLength", 0)
        except Exception:
            raise HTTPException(status_code=404, detail="File not found in storage")
        
        # Update metadata with confirmed size
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
        output_quality: str = "standard",  # "standard" or "high"
        limiter_mode: str = "normal",  # "gentle", "normal", or "loud"
    ):
        """
        Start the mastering process.
        
        Either template_id OR reference_file_id must be provided:
        - template_id: Use a built-in reference template (faster, no upload needed)
        - reference_file_id: Use a user-uploaded reference file
        
        Optional settings:
        - output_quality: "standard" (16-bit) or "high" (24-bit)
        - limiter_mode: "gentle", "normal", or "loud"
        """
        # Validate input - need either template or uploaded reference
        if not template_id and not reference_file_id:
            raise HTTPException(
                status_code=400, 
                detail="Either template_id or reference_file_id must be provided"
            )
        
        # Validate settings
        if output_quality not in ["standard", "high"]:
            output_quality = "standard"
        if limiter_mode not in ["gentle", "normal", "loud"]:
            limiter_mode = "normal"
        
        # Get target file metadata
        target_meta = file_metadata.get(target_file_id)
        if not target_meta:
            raise HTTPException(status_code=404, detail="Target file not found")
        
        target_r2_key = target_meta.get("r2_key")
        if not target_r2_key:
            raise HTTPException(status_code=400, detail="Target file not properly uploaded")
        
        # Determine reference source
        if template_id:
            # Using a built-in template
            if template_id not in REFERENCE_TEMPLATES:
                raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
            reference_source = template_id
            is_template = True
        else:
            # Using an uploaded reference file
            reference_meta = file_metadata.get(reference_file_id)
            if not reference_meta:
                raise HTTPException(status_code=404, detail="Reference file not found")
            reference_source = reference_meta.get("r2_key")
            if not reference_source:
                raise HTTPException(status_code=400, detail="Reference file not properly uploaded")
            is_template = False
        
        # Create job
        job_id = str(uuid.uuid4())
        
        # Update metadata with job_id for cleanup tracking
        target_meta["job_id"] = job_id
        file_metadata[target_file_id] = target_meta
        
        # Initialize job status
        job_statuses[job_id] = {
            "status": "pending",
            "progress": 0,
            "message": "Queued for processing...",
            "output_file": None,
        }
        
        # Spawn the processing function with all settings
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
        """Get job status"""
        status = job_statuses.get(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job_id,
            **status,
        }
    
    @web_app.get("/download/{job_id}")
    async def download_result(job_id: str):
        """Get a presigned download URL for the mastered audio"""
        status = job_statuses.get(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if status["status"] != "completed":
            raise HTTPException(status_code=400, detail="Job not completed yet")
        
        output_r2_key = status.get("output_file")
        if not output_r2_key:
            raise HTTPException(status_code=404, detail="Output file not found")
        
        # Generate presigned download URL (valid for 1 hour)
        s3 = get_r2_client()
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": R2_BUCKET,
                "Key": output_r2_key,
                "ResponseContentDisposition": f"attachment; filename=mastered_podcast.wav",
            },
            ExpiresIn=3600,  # 1 hour
        )
        
        # Redirect to the presigned URL for direct download from R2
        return RedirectResponse(url=presigned_url, status_code=302)
    
    @web_app.post("/transcribe")
    async def start_transcription(audio_r2_key: str):
        """
        Start transcription job for video captions
        """
        from datetime import datetime
        import uuid
        
        job_id = str(uuid.uuid4())
        
        # Initialize transcription status
        transcription_jobs[job_id] = {
            "status": "processing",
            "progress": 0,
            "segments": None,
            "text": None,
            "started_at": datetime.utcnow().isoformat(),
        }
        
        # Spawn transcription
        transcribe_audio.spawn(audio_r2_key, job_id)
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Transcription started",
        }
    
    @web_app.get("/transcribe/{job_id}")
    async def get_transcription_status(job_id: str):
        """Get transcription status and results"""
        status = transcription_jobs.get(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Transcription job not found")
        
        return {
            "job_id": job_id,
            **status,
        }
    
    return web_app


# Transcription jobs storage
transcription_jobs = modal.Dict.from_name("podcast-transcription-jobs", create_if_missing=True)

# Pre-download Whisper model to volume
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
    print(f"Whisper model cached at {WHISPER_CACHE}")
    return {"status": "ready", "model": "base", "cache_path": WHISPER_CACHE}

# Cached Whisper model
whisper_model = None

def get_whisper_model():
    """Get or load cached Whisper model"""
    global whisper_model
    if whisper_model is None:
        import whisper
        import os
        # Ensure cache directory exists
        os.makedirs(WHISPER_CACHE, exist_ok=True)
        # Load model (will download to cache if not present)
        whisper_model = whisper.load_model("base", download_root=WHISPER_CACHE)
    return whisper_model

# Transcription function
@app.function(
    image=image,
    secrets=[r2_secret],
    timeout=600,
    cpu=2,
    memory=4096,
    volumes={WHISPER_CACHE: whisper_volume},
)
def transcribe_audio(audio_r2_key: str, job_id: str):
    """
    Transcribe audio using Whisper (called via spawn)
    Model is cached in Modal Volume for fast subsequent loads
    """
    try:
        import tempfile
        import os
        from datetime import datetime
        
        s3 = get_r2_client()
        
        # Create temp directory
        temp_dir = tempfile.mkdtemp()
        local_path = os.path.join(temp_dir, "audio.wav")
        
        # Update status
        transcription_jobs[job_id] = {
            **transcription_jobs.get(job_id, {}),
            "progress": 10,
            "message": "Downloading audio...",
        }
        
        # Download audio
        s3.download_file(R2_BUCKET, audio_r2_key, local_path)
        
        # Update status
        transcription_jobs[job_id] = {
            **transcription_jobs.get(job_id, {}),
            "progress": 30,
            "message": "Loading AI model...",
        }
        
        # Load Whisper model (cached)
        model = get_whisper_model()
        
        # Update status
        transcription_jobs[job_id] = {
            **transcription_jobs.get(job_id, {}),
            "progress": 50,
            "message": "Transcribing with AI...",
        }
        
        # Transcribe
        result = model.transcribe(
            local_path,
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
        
        # Cleanup
        os.remove(local_path)
        os.rmdir(temp_dir)
        
        # Update final status
        transcription_jobs[job_id] = {
            "status": "completed",
            "progress": 100,
            "segments": segments,
            "text": result["text"],
            "completed_at": datetime.utcnow().isoformat(),
        }
        
        print(f"[Transcription] Job {job_id} complete: {len(segments)} segments")
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[Transcription] Error in job {job_id}: {error_msg}")
        print(traceback.format_exc())
        
        transcription_jobs[job_id] = {
            "status": "failed",
            "progress": 0,
            "error": error_msg,
        }
