from fastapi import APIRouter, HTTPException, Body
import os, traceback
import google.generativeai as genai

router = APIRouter()


from fastapi import APIRouter, HTTPException, Body
import os, traceback, requests
import google.generativeai as genai

router = APIRouter()

@router.post("/chat")
async def ai_chat(payload: dict = Body(...)):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY in environment")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        bill = payload.get("bill", {})
        messages = payload.get("messages", [])
        user_state = payload.get("userState", "an American citizen")  # default fallback

        # Craft personalized system prompt based on state
        system_prompt = f"""
        You are an AI legislative assistant helping explain U.S. congressional bills.
        Speak clearly, factually, and conversationally.

        You are acting as a policy representative from the state of {user_state}.
        Emphasize relevance or context to that state if possible (e.g., economic impact, local programs, etc.).

        Always stay nonpartisan unless instructed otherwise. Your role is to make the bill understandable.

        Bill Context:
        Title: {bill.get('title')}
        Congress: {bill.get('congress')}
        Type: {bill.get('type')}
        Number: {bill.get('number')}
        Introduced: {bill.get('introducedDate')}
        Latest Action: {bill.get('latestAction')}
        Sponsor: {bill.get('sponsor')}
        Policy Area: {', '.join(bill.get('subjects', []))}
        Summary: {bill.get('summary')}
        """

        chat_text = "\n".join(
            [f"{m['role'].capitalize()}: {m['content']}" for m in messages]
        )
        full_prompt = f"{system_prompt}\n\nConversation so far:\n{chat_text}\nAssistant:"

        result = model.generate_content(full_prompt)
        reply = getattr(result, "text", None)
        if not reply:
            reply = "⚠️ Gemini returned no response text."

        return {"reply": reply.strip()}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gemini chat error: {e}")

# @router.post("/chat")
# async def ai_chat(payload: dict = Body(...)):
#     try:
#         api_key = os.getenv("GEMINI_API_KEY")
#         if not api_key:
#             raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY in environment")

#         for m in genai.list_models():
#             print(m.name)

#         genai.configure(api_key=api_key)
#         model = genai.GenerativeModel("gemini-2.5-flash")


#         bill = payload.get("bill", {})
#         messages = payload.get("messages", [])

#         system_prompt = f"""
#         You are an AI legislative assistant who explains U.S. congressional bills clearly.
#         Be factual, structured, and conversational.
#         Always base your answers on the provided context.

#         Bill Context:
#         Title: {bill.get('title')}
#         Congress: {bill.get('congress')}
#         Type: {bill.get('type')}
#         Number: {bill.get('number')}
#         Introduced: {bill.get('introducedDate')}
#         Latest Action: {bill.get('latestAction')}
#         Sponsor: {bill.get('sponsor')}
#         Policy Area: {', '.join(bill.get('subjects', []))}
#         Summary: {bill.get('summary')}
#         """

#         chat_text = "\n".join(
#             [f"{m['role'].capitalize()}: {m['content']}" for m in messages]
#         )
#         full_prompt = f"{system_prompt}\n\nConversation so far:\n{chat_text}\nAssistant:"

#         # --- Log what we’re sending to Gemini for debugging ---
#         print("🧠 [Gemini Prompt Start] ----------------------")
#         print(full_prompt[:1000])  # print first 1000 chars
#         print("🧠 [Gemini Prompt End] ------------------------")

#         # --- Call Gemini safely ---
#         result = model.generate_content(full_prompt)

#         # --- Extract text properly ---
#         reply = getattr(result, "text", None)
#         if not reply:
#             print("⚠️ Gemini returned no text. Full response:", result)
#             reply = "⚠️ Gemini returned no response text."

#         return {"reply": reply.strip()}

#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Gemini chat error: {e}")
@router.post("/summarize")
async def summarize_bill(payload: dict = Body(...)):
    """
    Auto-summarize a bill based on its details.
    Receives: { "bill": {...} }
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        bill = payload.get("bill", {})
        system_prompt = f"""
        You are a concise legislative analyst.
        Summarize the following bill clearly and factually for a general audience.
        Include its purpose, main topic, and any notable sponsors or recent actions.

        Bill Details:
        Title: {bill.get('title')}
        Congress: {bill.get('congress')}
        Type: {bill.get('type')}
        Number: {bill.get('number')}
        Introduced: {bill.get('introducedDate')}
        Latest Action: {bill.get('latestAction')}
        Sponsor: {bill.get('sponsor')}
        Policy Area: {', '.join(bill.get('subjects', []))}
        Summary: {bill.get('summary')}
        """

        result = model.generate_content(system_prompt)
        reply = getattr(result, "text", "⚠️ No summary generated.")
        return {"summary": reply.strip()}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gemini summary error: {e}")
