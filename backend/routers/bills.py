from fastapi import APIRouter, HTTPException
from utils.firebase_utils import db
import httpx, os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from utils.llm_utils import summarize_bill
from fastapi import Body

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


@router.get("/details/{congress}/{bill_type}/{number}")
async def get_bill_details(congress: int, bill_type: str, number: int):
    """
    Fetch full bill details, including summary (LLM-generated if not cached).
    """
    bill_id = f"{bill_type}{number}-{congress}"
    details_ref = db.collection("bill_details").document(bill_id)
    doc = details_ref.get()

    # ✅ Step 1: Check Firestore cache
    if doc.exists:
        data = doc.to_dict()
        return {"source": "cache", **data}

    # ✅ Step 2: Fetch metadata from Congress API
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.congress.gov/v3/bill/{congress}/{bill_type}/{number}?api_key={CONGRESS_API_KEY}"
            resp = await client.get(url)
            resp.raise_for_status()
            bill = resp.json().get("bill", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Congress API failed: {e}")

    # ✅ Step 3: Fetch the bill text
    try:
        text_url = f"https://api.congress.gov/v3/bill/{congress}/{bill_type}/{number}/text?api_key={CONGRESS_API_KEY}"
        async with httpx.AsyncClient() as client:
            text_resp = await client.get(text_url)
            text_resp.raise_for_status()
            text_data = text_resp.json()
            text_versions = text_data.get("textVersions", [])
            full_text = (
                text_versions[0].get("text", {}).get("content", "Text unavailable")
                if text_versions else "Text unavailable"
            )
    except Exception:
        full_text = "Text unavailable"

    # ✅ Step 4: Generate AI summary
    try:
        summary = summarize_bill(full_text)
    except Exception as e:
        summary = f"Summary unavailable ({e})"

    # ✅ Step 5: Prepare and store result
    result = {
        "bill_id": bill_id,
        "title": bill.get("title"),
        "sponsor": bill.get("sponsors", [{}])[0].get("fullName", "Unknown"),
        "introducedDate": bill.get("introducedDate"),
        "latestAction": bill.get("latestAction", {}),
        "cosponsors": len(bill.get("cosponsors", [])),
        "text_full": full_text,
        "text_summary": summary,
        "timestamp": datetime.now().isoformat()
    }

    details_ref.set(result)
    return {"source": "api", **result}