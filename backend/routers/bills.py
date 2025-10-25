from fastapi import APIRouter, HTTPException
from utils.firebase_utils import db
import httpx, os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

CONGRESS_API_KEY = os.getenv("CONGRESS_API_KEY")
BASE_URL = "https://api.congress.gov/v3/bill"


def get_current_interval():
    """Return current cache interval (timedelta) based on weekday/time."""
    now = datetime.now()
    weekday = now.weekday()  # Monday=0, Sunday=6
    hour = now.hour

    if weekday < 5 and 9 <= hour < 15:  # Mon–Fri, 9 AM–3 PM
        return timedelta(minutes=10)
    else:
        return timedelta(minutes=90)


def is_cache_valid(cache_doc):
    """Check if cache is valid given the dynamic interval."""
    try:
        ts_str = cache_doc.get("timestamp")
        if not ts_str:
            return False

        ts = datetime.fromisoformat(ts_str)
        now = datetime.now()
        interval = get_current_interval()

        return (now - ts) < interval
    except Exception:
        return False


@router.get("/latest")
async def get_latest_bills(limit: int = 5):
    """
    Fetch the most recent bills, refreshing based on time-of-day schedule.
    """
    cache_id = f"latest_{limit}"
    cache_ref = db.collection("bills_cache").document(cache_id)
    cache_doc = cache_ref.get()

    # 1️⃣ Check if cached data is still valid
    if cache_doc.exists and is_cache_valid(cache_doc.to_dict()):
        cached_data = cache_doc.to_dict().get("data", [])
        return {"source": "cache", "count": len(cached_data), "bills": cached_data}

    # 2️⃣ Otherwise, fetch fresh data from Congress.gov
    try:
        params = {"api_key": CONGRESS_API_KEY, "limit": limit}
        async with httpx.AsyncClient() as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            bills = data.get("bills", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Congress.gov API failed: {e}")

    # 3️⃣ Store new data in Firestore with a timestamp
    cache_ref.set({
        "timestamp": datetime.now().isoformat(),
        "data": bills
    })

    return {"source": "api", "count": len(bills), "bills": bills}
