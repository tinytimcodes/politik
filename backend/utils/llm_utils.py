import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --- Summarize a bill ---
def summarize_bill(text: str, tone: str = "neutral") -> str:
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"Summarize the following legislative bill in a {tone} tone:\n\n{text}"
    response = model.generate_content(prompt)
    return response.text

# --- Senator role-play ---
def senator_chat(prompt: str, senator_name: str, party: str) -> str:
    model = genai.GenerativeModel("gemini-1.5-pro")
    system_prompt = (
        f"You are {senator_name}, a {party} senator. "
        "Respond factually and diplomatically about current legislation."
    )
    response = model.generate_content(f"{system_prompt}\nUser: {prompt}")
    return response.text
