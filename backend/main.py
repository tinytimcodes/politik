from fastapi import FastAPI
from firebase_admin import credentials, firestore, initialize_app, _apps
from dotenv import load_dotenv
import os

app = FastAPI(title="CivicLens Backend")

# Load environment variables
load_dotenv()

# Read Firebase service account path from .env
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

# Initialize Firebase Admin SDK only once
try:
    if not _apps:
        cred = credentials.Certificate(cred_path)
        initialize_app(cred)
        print("✅ Firebase initialized successfully.")
    else:
        print("ℹ️ Firebase already initialized; skipping re-init.")

    db = firestore.client()
except Exception as e:
    print("❌ Firebase initialization failed:", e)
    db = None


@app.get("/")
def root():
    return {"message": "CivicLens API is running!"}


@app.get("/health")
def health_check():
    """Confirm Firebase connectivity."""
    if db is None:
        return {"status": "error", "firebase": "not connected"}

    try:
        # Simple read test
        _ = list(db.collections())
        return {"status": "ok", "firebase": "connected"}
    except Exception as e:
        return {"status": "error", "firebase": f"connection failed: {e}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
