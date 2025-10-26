from fastapi import APIRouter, HTTPException, Query
from utils.firebase_utils import db
import httpx, os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from utils.llm_utils import summarize_bill
from fastapi import Body
import asyncio

load_dotenv()
router = APIRouter()

CONGRESS_API_KEY = os.getenv("CONGRESS_API_KEY")
BASE_URL = "https://api.congress.gov/v3/bill"

async def safe_fetch(url: str):
    """Reusable helper with timeout, JSON guard, and error text fallback."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=r.text)
            try:
                return r.json()
            except Exception:
                # If API returned HTML, show first 200 chars for debugging
                raise HTTPException(status_code=500,
                    detail=f"Non-JSON response from Congress.gov: {r.text[:200]}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Congress.gov timed out (slow endpoint).")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Congress.gov fetch error: {e}")
    
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

@router.get("/billdetails")
async def get_bill_details(congress: int, billType: str, billNumber: str):
    """
    Fetch and return raw JSON for a specific bill from Congress.gov.
    """
    url = f"https://api.congress.gov/v3/bill/{congress}/{billType}/{billNumber}?api_key={CONGRESS_API_KEY}&format=json"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Congress API returned {response.status_code}: {response.text}",
            )
        print(response.json())
        return response.json()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching bill details: {str(e)}")
    
@router.get("/billactions")
async def get_bill_actions(congress: int, billType: str, billNumber: str):
    """
    Fetch all actions for a given bill from Congress.gov.
    Returns the raw JSON response directly.
    """
    url = f"https://api.congress.gov/v3/bill/{congress}/{billType}/{billNumber}/actions?api_key={CONGRESS_API_KEY2}&format=json"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching bill actions: {str(e)}")

@router.get("/billsummaries")
async def get_bill_summaries(congress: int, billType: str, billNumber: str):
    url = f"{BASE_URL}/{congress}/{billType}/{billNumber}/summaries?api_key={CONGRESS_API_KEY}&format=json"
    data = await safe_fetch(url)
    return data




@router.get("/billsubjects")
async def get_bill_subjects(congress: int, billType: str, billNumber: str):
    """
    Fetch subject data (policy area + legislative subjects) for a given bill.
    Returns the raw JSON response directly.
    """
    url = f"https://api.congress.gov/v3/bill/{congress}/{billType}/{billNumber}/subjects?api_key={CONGRESS_API_KEY}&format=json"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching bill subjects: {str(e)}")

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

@router.get("/billinfo")
async def get_full_bill_info(congress: int, billType: str, billNumber: str):
    """
    Combine /billdetails, /billactions, /billsummaries, /billsubjects into one unified object.
    """
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            base = f"https://api.congress.gov/v3/bill/{congress}/{billType}/{billNumber}"

            urls = {
                "details": f"{base}?api_key={CONGRESS_API_KEY}&format=json",
                "actions": f"{base}/actions?api_key={CONGRESS_API_KEY}&format=json",
                "summaries": f"{base}/summaries?api_key={CONGRESS_API_KEY}&format=json",
                "subjects": f"{base}/subjects?api_key={CONGRESS_API_KEY}&format=json",
            }

            responses = await asyncio.gather(
                client.get(urls["details"]),
                client.get(urls["actions"]),
                client.get(urls["summaries"]),
                client.get(urls["subjects"]),
                return_exceptions=True,
            )

        # --- Safe JSON extraction ---
        def safe_json(r):
            if isinstance(r, Exception):
                return {}
            try:
                return r.json()
            except:
                return {}

        details, actions, summaries, subjects = map(safe_json, responses)

        # --- Parse and unify ---
        details_data = details.get("bill", {})
        actions_list = actions.get("actions", [])
        summaries_list = summaries.get("summaries", [])
        subjects_data = subjects.get("subjects", {})

        legislative_subjects = [
            s.get("name")
            for s in subjects_data.get("legislativeSubjects", [])
            if s.get("name")
        ]
        summary_text = (
            summaries_list[-1].get("text") if summaries_list else None
        )

        unified = {
            "title": details_data.get("title"),
            "congress": congress,
            "billType": billType,
            "billNumber": billNumber,
            "introducedDate": details_data.get("introducedDate"),
            "latestAction": (
                details_data.get("latestAction", {}).get("text")
                or (actions_list[0]["text"] if actions_list else None)
            ),
            "sponsor": (
                details_data.get("sponsors", [{}])[0].get("fullName", "Unknown")
            ),
            "subjects": legislative_subjects,
            "summary": summary_text,
            "actions": [
                {"date": a.get("actionDate"), "text": a.get("text")}
                for a in actions_list
            ],
        }

        return {"bill": unified}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to combine bill data: {e}")
