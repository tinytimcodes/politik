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
    Fetch recent bills (with sponsor + chamber info).
    """
    try:
        params = {"api_key": CONGRESS_API_KEY, "limit": limit}
        async with httpx.AsyncClient() as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            raw_bills = data.get("bills", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Congress.gov API failed: {e}")

    bills = []
    async with httpx.AsyncClient() as client:
        for b in raw_bills:
            congress = b.get("congress")
            bill_type = b.get("type")
            number = b.get("number")

            # base info
            bill_info = {
                "title": b.get("title"),
                "introducedDate": b.get("introducedDate"),
                "congress": congress,
                "type": bill_type,
                "number": number,
                "latestAction": b.get("latestAction", {}),
            }

            # fetch details to get sponsor + chamber info
            try:
                detail_url = f"https://api.congress.gov/v3/bill/{congress}/{bill_type}/{number}?api_key={CONGRESS_API_KEY}"
                detail_resp = await client.get(detail_url)
                if detail_resp.status_code == 200:
                    detail_data = detail_resp.json().get("bill", {})
                    sponsors = detail_data.get("sponsors", [])
                    origin_chamber = detail_data.get("originChamber", "Unknown")
                    sponsor_party = (
                        sponsors[0].get("party") if sponsors and isinstance(sponsors, list) else None
                    )
                    bill_info["sponsors"] = sponsors
                    bill_info["originChamber"] = origin_chamber
                    bill_info["sponsorParty"] = sponsor_party
            except Exception as e:
                print(f"⚠️ Skipped detail fetch for {bill_type}{number}: {e}")

            bills.append(bill_info)

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



@router.get("/interests")
async def get_bills_by_interest(topics: str, limit: int = 10):
    """
    Fetch recent bills related to user's selected interests.
    Example:
        /bills/interests?topics=healthcare,education,economy
    """

    # ✅ Interest keyword mapping
    INTEREST_KEYWORDS = {
        "healthcare": ["health", "medical", "hospital", "insurance", "medicare", "medicaid", "care", "patient"],
        "education": ["school", "education", "student", "teacher", "college", "university", "loan"],
        "economy": ["tax", "inflation", "commerce", "budget", "finance", "trade", "employment", "labor"],
        "business": ["small business", "corporate", "entrepreneur", "startup", "industry", "company"],
        "environment": ["climate", "environment", "pollution", "energy", "carbon", "forest", "wildlife"],
        "congress": ["ethics", "procedure", "reform", "legislature", "committee", "governance"]
    }

    # Normalize user topics
    raw_topics = [t.strip().lower() for t in topics.split(",") if t.strip()]
    if not raw_topics:
        raise HTTPException(status_code=400, detail="No topics provided.")

    # Expand all mapped keywords
    keywords = []
    for t in raw_topics:
        keywords.extend(INTEREST_KEYWORDS.get(t, [t]))

    # 1️⃣ Query the Congress API for recent bills
    try:
        params = {"api_key": CONGRESS_API_KEY, "limit": limit * 3}  # fetch a bit more to filter down
        async with httpx.AsyncClient() as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            bills = data.get("bills", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Congress API failed: {e}")

    # 2️⃣ Filter bills by title, policyArea, or subjects
    filtered = []
    for bill in bills:
        title = (bill.get("title") or "").lower()
        policy = (bill.get("policyArea", {}).get("name") or "").lower()
        subjects = bill.get("subjects", {})
        subject_items = subjects.get("item", [])
        subject_names = " ".join(
            s.get("name", "").lower() for s in subject_items if isinstance(subject_items, list)
        )

        # Check if any keyword appears
        if any(k in title or k in policy or k in subject_names for k in keywords):
            filtered.append(bill)

    # 3️⃣ Limit the results
    results = filtered[:limit]

    return {
        "source": "api",
        "topics": raw_topics,
        "keywords_used": keywords,
        "count": len(results),
        "bills": results
    }
