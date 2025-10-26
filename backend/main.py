from fastapi import FastAPI
from routers import bills
from routers import ai

app = FastAPI(title="CivicLens Backend")

# Include the router
app.include_router(bills.router, prefix="/bills", tags=["Bills"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])

@app.get("/")
def root():
    return {"message": "CivicLens API running with Congress integration!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
